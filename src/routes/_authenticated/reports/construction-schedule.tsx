import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { type ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { exportToCsv } from "@/lib/export-csv";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reports/construction-schedule")({
  component: ConstructionScheduleReport,
});

interface ScheduleRow {
  id: string;
  job_name: string;
  project_name: string | null;
  lot_number: string | null;
  status: string;
  start_date: string | null;
  target_completion: string | null;
  days_in_phase: number;
  variance_days: number;
  build_duration: number | null;
}

function ConstructionScheduleReport() {
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: projects = [] } = useQuery({
    queryKey: ["report-cs-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, project_name").order("project_name");
      return data ?? [];
    },
  });

  const { data: rawJobs = [] } = useQuery({
    queryKey: ["report-construction-schedule"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id, job_name, status, project_id, project_name, lot_number, start_date, target_completion, build_duration, updated_at",
        )
        .not("status", "in", "(Closed,Warranty,CO Issued)")
        .order("target_completion", { ascending: true, nullsFirst: false });
      if (error) throw error;

      const now = Date.now();
      return (data ?? []).map((j) => {
        const daysInPhase = j.updated_at ? Math.floor((now - new Date(j.updated_at).getTime()) / 86400000) : 0;
        const varianceDays = j.target_completion
          ? Math.floor((new Date(j.target_completion).getTime() - now) / 86400000)
          : 0;

        return {
          id: j.id,
          job_name: j.job_name,
          project_name: j.project_name,
          project_id: j.project_id,
          lot_number: j.lot_number,
          status: j.status,
          start_date: j.start_date,
          target_completion: j.target_completion,
          days_in_phase: daysInPhase,
          variance_days: varianceDays,
          build_duration: j.build_duration,
        };
      });
    },
  });

  const data = useMemo(() => {
    let filtered = rawJobs;
    if (projectFilter !== "all") filtered = filtered.filter((j) => j.project_id === projectFilter);
    if (statusFilter !== "all") filtered = filtered.filter((j) => j.status === statusFilter);
    return filtered;
  }, [rawJobs, projectFilter, statusFilter]);

  const statuses = [...new Set(rawJobs.map((j) => j.status))].sort();

  const columns: ColumnDef<ScheduleRow>[] = [
    {
      accessorKey: "job_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Job" />,
      cell: ({ row }) => <span className="font-medium">{row.original.job_name}</span>,
    },
    {
      accessorKey: "project_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Project" />,
    },
    {
      accessorKey: "lot_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Lot" />,
      cell: ({ row }) => row.original.lot_number ?? "-",
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Current Phase" />,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "start_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Start" />,
      cell: ({ row }) => (row.original.start_date ? formatDate(row.original.start_date) : "-"),
    },
    {
      accessorKey: "target_completion",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Target Completion" />,
      cell: ({ row }) => (row.original.target_completion ? formatDate(row.original.target_completion) : "-"),
    },
    {
      accessorKey: "days_in_phase",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Days in Phase" />,
      cell: ({ row }) => `${row.original.days_in_phase}d`,
    },
    {
      accessorKey: "variance_days",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Schedule Variance" />,
      cell: ({ row }) => {
        const v = row.original.variance_days;
        if (!row.original.target_completion) return <span className="text-muted">-</span>;
        let colorClass = "text-success";
        let label = `${v}d ahead`;
        if (v < -5) {
          colorClass = "text-destructive font-medium";
          label = `${Math.abs(v)}d late`;
        } else if (v < 0) {
          colorClass = "text-warning font-medium";
          label = `${Math.abs(v)}d late`;
        } else if (v === 0) {
          label = "On time";
        }
        return <span className={colorClass}>{label}</span>;
      },
    },
    {
      accessorKey: "build_duration",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Duration (days)" />,
      cell: ({ row }) => row.original.build_duration ?? "-",
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Construction Schedule</h1>
          <p className="text-sm text-muted">Active jobs with current phase and schedule variance.</p>
        </div>
        <button
          type="button"
          onClick={() =>
            exportToCsv(
              "construction-schedule",
              [
                { header: "Job", accessor: (r) => r.job_name },
                { header: "Project", accessor: (r) => r.project_name ?? "" },
                { header: "Lot", accessor: (r) => r.lot_number ?? "" },
                { header: "Phase", accessor: (r) => r.status },
                { header: "Start", accessor: (r) => r.start_date ?? "" },
                { header: "Target Completion", accessor: (r) => r.target_completion ?? "" },
                { header: "Days in Phase", accessor: (r) => r.days_in_phase },
                { header: "Variance (days)", accessor: (r) => r.variance_days },
                { header: "Duration", accessor: (r) => r.build_duration ?? "" },
              ],
              data,
            )
          }
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-card-hover"
        >
          Export CSV
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.project_name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="all">All Phases</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <DataTable columns={columns} data={data} searchKey="job_name" searchPlaceholder="Search jobs..." />
    </div>
  );
}

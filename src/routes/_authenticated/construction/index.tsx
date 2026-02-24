import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ModuleIndex, type ModuleKpi, type StatusTab } from "@/components/layout/ModuleIndex";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency, getErrorMessage } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/construction/")({
  component: ConstructionIndex,
});

interface Job {
  id: string;
  record_number: string | null;
  lot_number: string | null;
  floor_plan_name: string | null;
  project_name: string | null;
  project_id: string | null;
  status: string;
  budget_total: number | null;
  spent_total: number | null;
  start_date: string | null;
  target_completion: string | null;
  actual_completion: string | null;
  builder: string | null;
  updated_at: string;
}

/* ── Status pill groupings ── */
const CONSTRUCTION_PILL_GROUPS = [
  { label: "All", value: "all", statuses: [] as string[] },
  { label: "Pre-Construction", value: "pre-con", statuses: ["Pre-Construction", "Permitting"] },
  {
    label: "In Progress",
    value: "in-progress",
    statuses: ["Foundation", "Framing", "Rough-Ins", "Insulation & Drywall", "Interior Finishes", "Exterior"],
  },
  { label: "Punch", value: "punch", statuses: ["Final Inspections"] },
  { label: "CO Received", value: "co-received", statuses: ["CO Issued"] },
  { label: "Completed", value: "completed", statuses: ["Warranty", "Closed"] },
];

/* ── Active statuses (for KPI counting) ── */
const ACTIVE_STATUSES = [
  "Pre-Construction",
  "Permitting",
  "Foundation",
  "Framing",
  "Rough-Ins",
  "Insulation & Drywall",
  "Interior Finishes",
  "Exterior",
  "Final Inspections",
];

function daysSince(from: string | null): number | null {
  if (!from) return null;
  const diff = Date.now() - new Date(from).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function ConstructionIndex() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeStatus, setActiveStatus] = useState("all");
  const activeEntityId = useEntityStore((s) => s.activeEntityId);

  /* ── Queries ── */
  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ["jobs", activeEntityId],
    queryFn: async () => {
      let query = supabase
        .from("jobs")
        .select(
          "id,record_number,lot_number,floor_plan_name,project_name,project_id,status,budget_total,spent_total,start_date,target_completion,actual_completion,builder,updated_at",
        )
        .order("updated_at", { ascending: false });
      if (activeEntityId) query = query.eq("entity_id", activeEntityId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  /* ── Delete mutation ── */
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jobs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job deleted");
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err) || "Failed to delete job"),
  });

  /* ── Filtering ── */
  const filteredJobs = useMemo(() => {
    if (activeStatus === "all") return jobs;
    const group = CONSTRUCTION_PILL_GROUPS.find((g) => g.value === activeStatus);
    if (!group) return jobs;
    return jobs.filter((j) => group.statuses.includes(j.status));
  }, [jobs, activeStatus]);

  /* ── Status counts ── */
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const j of jobs) {
      counts[j.status] = (counts[j.status] ?? 0) + 1;
    }
    return counts;
  }, [jobs]);

  /* ── KPIs ── */
  const activeJobs = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status)).length;

  const onSchedule = useMemo(() => {
    let count = 0;
    for (const j of jobs) {
      if (!ACTIVE_STATUSES.includes(j.status)) continue;
      if (!j.target_completion) {
        count++;
        continue;
      }
      if (new Date(j.target_completion) >= new Date()) count++;
    }
    return count;
  }, [jobs]);

  const behindSchedule = activeJobs - onSchedule;

  const avgDaysToCO = useMemo(() => {
    const completed = jobs.filter(
      (j) => (j.status === "CO Issued" || j.status === "Warranty" || j.status === "Closed") && j.start_date,
    );
    if (completed.length === 0) return 0;
    const total = completed.reduce((sum, j) => {
      const end = j.actual_completion ? new Date(j.actual_completion) : new Date();
      const start = new Date(j.start_date as string);
      return sum + Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
    }, 0);
    return Math.round(total / completed.length);
  }, [jobs]);

  const kpis: ModuleKpi[] = [
    { label: "Active Jobs", value: activeJobs, accentColor: "var(--color-primary-accent)" },
    { label: "On Schedule", value: onSchedule, status: "success" },
    { label: "Behind Schedule", value: behindSchedule, status: behindSchedule > 0 ? "danger" : "success" },
    { label: "Avg Days to CO", value: avgDaysToCO },
  ];

  /* ── Status tabs ── */
  const statusTabs: StatusTab[] = CONSTRUCTION_PILL_GROUPS.map((g) => ({
    label: g.label,
    value: g.value,
    count: g.value === "all" ? jobs.length : g.statuses.reduce((sum, s) => sum + (statusCounts[s] ?? 0), 0),
  }));

  /* ── Columns ── */
  const columns: ColumnDef<Job, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "record_number",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Job Code" />,
        cell: ({ row }) => <span className="font-mono text-xs text-muted">{row.getValue("record_number") ?? "—"}</span>,
        size: 140,
      },
      {
        accessorKey: "project_name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Project" />,
        cell: ({ row }) => (
          <button
            type="button"
            className="truncate text-sm font-medium text-info-text hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              if (row.original.project_id) {
                navigate({
                  to: "/projects/$projectId/basic-info",
                  params: { projectId: row.original.project_id },
                });
              }
            }}
          >
            {row.getValue("project_name") ?? "—"}
          </button>
        ),
      },
      {
        accessorKey: "lot_number",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Lot" />,
        cell: ({ row }) => <span className="text-muted">{row.getValue("lot_number") ?? "—"}</span>,
        size: 80,
      },
      {
        accessorKey: "floor_plan_name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Floor Plan" />,
        cell: ({ row }) => <span className="text-muted">{row.getValue("floor_plan_name") ?? "—"}</span>,
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
      },
      {
        id: "current_phase",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Current Phase" />,
        accessorFn: (row) => row.status,
        cell: ({ getValue }) => <span className="text-xs text-muted">{getValue() as string}</span>,
      },
      {
        id: "days_since_start",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Days Since Start" />,
        accessorFn: (row) => daysSince(row.start_date),
        cell: ({ getValue }) => {
          const days = getValue() as number | null;
          return <span className="font-mono text-xs text-muted">{days ?? "—"}</span>;
        },
        size: 120,
      },
      {
        accessorKey: "builder",
        header: ({ column }) => <DataTableColumnHeader column={column} title="PM" />,
        cell: ({ row }) => <span className="text-muted">{row.getValue("builder") ?? "—"}</span>,
      },
      {
        id: "budget_variance",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Budget Variance" />,
        accessorFn: (row) => {
          if (row.budget_total == null) return null;
          return (row.budget_total ?? 0) - (row.spent_total ?? 0);
        },
        cell: ({ getValue }) => {
          const variance = getValue() as number | null;
          if (variance == null) return "—";
          const isNegative = variance < 0;
          return (
            <span className={isNegative ? "font-medium text-destructive-text" : "text-success-text"}>
              {isNegative ? "-" : "+"}
              {formatCurrency(Math.abs(variance))}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <button
            type="button"
            className="text-xs text-destructive hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm("Delete this job? This cannot be undone.")) {
                deleteMutation.mutate(row.original.id);
              }
            }}
          >
            Delete
          </button>
        ),
        size: 80,
      },
    ],
    [navigate, deleteMutation],
  );

  /* ── Create handler ── */
  const handleCreate = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .insert({
          lot_number: "New",
          status: "Pre-Construction",
          entity_id: activeEntityId,
        })
        .select()
        .single();
      if (error) throw error;
      toast.success("Job created");
      navigate({ to: "/construction/$jobId/job-info", params: { jobId: data.id } });
    } catch {
      toast.error("Failed to create job");
    }
  };

  return (
    <ModuleIndex
      title="Construction Management"
      subtitle={
        activeStatus === "all"
          ? "All jobs"
          : (CONSTRUCTION_PILL_GROUPS.find((g) => g.value === activeStatus)?.label ?? activeStatus)
      }
      kpis={kpis}
      statusTabs={statusTabs}
      activeStatus={activeStatus}
      onStatusChange={setActiveStatus}
      onCreate={handleCreate}
      createLabel="New Job"
      onCreateWithAI={() => navigate({ to: "/construction/new" })}
    >
      {isLoading ? (
        <TableSkeleton rows={8} cols={9} />
      ) : filteredJobs.length === 0 ? (
        <EmptyState title="No jobs yet" description="Create a new job to start tracking construction" />
      ) : (
        <DataTable
          columns={columns}
          data={filteredJobs}
          searchKey="lot_number"
          searchPlaceholder="Search jobs..."
          onRowClick={(row) => navigate({ to: "/construction/$jobId/job-info", params: { jobId: row.id } })}
        />
      )}
    </ModuleIndex>
  );
}

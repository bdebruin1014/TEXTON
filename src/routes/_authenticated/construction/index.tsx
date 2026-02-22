import { useQuery } from "@tanstack/react-query";
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
import { JOB_STATUSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
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
  status: string;
  budget_total: number | null;
  spent_total: number | null;
  start_date: string | null;
  target_completion: string | null;
  updated_at: string;
}

const columns: ColumnDef<Job, unknown>[] = [
  {
    accessorKey: "record_number",
    header: ({ column }) => <DataTableColumnHeader column={column} title="#" />,
    cell: ({ row }) => <span className="font-mono text-xs text-muted">{row.getValue("record_number") ?? "—"}</span>,
    size: 180,
  },
  {
    accessorKey: "lot_number",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Lot" />,
    cell: ({ row }) => <span className="font-medium">{row.getValue("lot_number") ?? "—"}</span>,
  },
  {
    accessorKey: "project_name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Project" />,
    cell: ({ row }) => <span className="text-muted">{row.getValue("project_name") ?? "—"}</span>,
  },
  {
    accessorKey: "floor_plan_name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Plan" />,
    cell: ({ row }) => <span className="text-muted">{row.getValue("floor_plan_name") ?? "—"}</span>,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
  },
  {
    accessorKey: "budget_total",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Budget" />,
    cell: ({ row }) => {
      const val = row.getValue("budget_total") as number | null;
      return val ? formatCurrency(val) : "—";
    },
  },
  {
    accessorKey: "spent_total",
    header: "Spent",
    cell: ({ row }) => {
      const val = row.getValue("spent_total") as number | null;
      return val ? formatCurrency(val) : "—";
    },
  },
  {
    accessorKey: "start_date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Start" />,
    cell: ({ row }) => formatDate(row.getValue("start_date")),
  },
  {
    accessorKey: "updated_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
    cell: ({ row }) => formatDate(row.getValue("updated_at")),
  },
];

function ConstructionIndex() {
  const navigate = useNavigate();
  const [activeStatus, setActiveStatus] = useState("all");
  const activeEntityId = useEntityStore((s) => s.activeEntityId);

  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ["jobs", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("jobs").select("*").order("updated_at", { ascending: false });
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredJobs = useMemo(() => {
    if (activeStatus === "all") return jobs;
    return jobs.filter((j) => j.status === activeStatus);
  }, [jobs, activeStatus]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const job of jobs) {
      counts[job.status] = (counts[job.status] ?? 0) + 1;
    }
    return counts;
  }, [jobs]);

  const totalBudget = jobs.reduce((sum, j) => sum + (j.budget_total ?? 0), 0);
  const totalSpent = jobs.reduce((sum, j) => sum + (j.spent_total ?? 0), 0);

  const kpis: ModuleKpi[] = [
    { label: "Total Jobs", value: jobs.length },
    { label: "Total Budget", value: formatCurrency(totalBudget) },
    { label: "Total Spent", value: formatCurrency(totalSpent), accentColor: "#C4841D" },
    {
      label: "In Progress",
      value: statusCounts["In Progress"] ?? 0,
      accentColor: "#4A8C5E",
    },
  ];

  const statusTabs: StatusTab[] = [
    { label: "All", value: "all", count: jobs.length },
    ...JOB_STATUSES.map((s) => ({
      label: s,
      value: s,
      count: statusCounts[s] ?? 0,
    })),
  ];

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
      subtitle={activeStatus === "all" ? "All jobs" : activeStatus}
      kpis={kpis}
      statusTabs={statusTabs}
      activeStatus={activeStatus}
      onStatusChange={setActiveStatus}
      onCreate={handleCreate}
      createLabel="New Job"
      onCreateWithAI={() => navigate({ to: "/construction/new" })}
    >
      {isLoading ? (
        <TableSkeleton rows={8} cols={8} />
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

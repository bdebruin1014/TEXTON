import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { PageWithSidebar } from "@/components/layout/AppShell";
import { IndexSidebar, type SidebarFilterItem } from "@/components/layout/IndexSidebar";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { JOB_STATUSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/construction/")({
  component: ConstructionIndex,
});

interface Job {
  id: string;
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
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredJobs = useMemo(() => {
    if (activeFilter === "all") return jobs;
    return jobs.filter((j) => j.status === activeFilter);
  }, [jobs, activeFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const job of jobs) {
      counts[job.status] = (counts[job.status] ?? 0) + 1;
    }
    return counts;
  }, [jobs]);

  const sidebarFilters: SidebarFilterItem[] = [
    { label: "All Jobs", value: "all", count: jobs.length },
    ...JOB_STATUSES.map((s) => ({
      label: s,
      value: s,
      count: statusCounts[s] ?? 0,
    })),
  ];

  const totalBudget = jobs.reduce((sum, j) => sum + (j.budget_total ?? 0), 0);
  const totalSpent = jobs.reduce((sum, j) => sum + (j.spent_total ?? 0), 0);

  const handleCreate = async () => {
    const { data, error } = await supabase
      .from("jobs")
      .insert({ lot_number: "New", status: "Pre-Construction" })
      .select()
      .single();
    if (error) {
      console.error("Failed to create job:", error);
      return;
    }
    navigate({ to: "/construction/$jobId/job-info", params: { jobId: data.id } });
  };

  const sidebar = (
    <IndexSidebar
      title="Construction"
      filters={sidebarFilters}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      metrics={[
        { label: "Total", value: jobs.length },
        { label: "Budget", value: formatCurrency(totalBudget) },
        { label: "Spent", value: formatCurrency(totalSpent) },
      ]}
    />
  );

  return (
    <PageWithSidebar sidebar={sidebar}>
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Construction Management</h1>
            <p className="mt-0.5 text-sm text-muted">{activeFilter === "all" ? "All jobs" : activeFilter}</p>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            +
            New Job
          </button>
        </div>

        {isLoading ? (
          <TableSkeleton rows={8} cols={8} />
        ) : filteredJobs.length === 0 ? (
          <EmptyState
            title="No jobs yet"
            description="Create a new job to start tracking construction"
           
            action={
              <button
                type="button"
                onClick={handleCreate}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                +
                New Job
              </button>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={filteredJobs}
            searchKey="lot_number"
            searchPlaceholder="Search jobs..."
            onRowClick={(row) => navigate({ to: "/construction/$jobId/job-info", params: { jobId: row.id } })}
          />
        )}
      </div>
    </PageWithSidebar>
  );
}

import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/$projectId/jobs-summary")({
  component: JobsSummary,
});

interface Job {
  id: string;
  lot_number: string | null;
  floor_plan_name: string | null;
  status: string;
  budget_total: number | null;
  spent_total: number | null;
  start_date: string | null;
  target_completion: string | null;
}

function JobsSummary() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();

  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ["project-jobs", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, lot_number, floor_plan_name, status, budget_total, spent_total, start_date, target_completion")
        .eq("project_id", projectId)
        .order("lot_number", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalBudget = jobs.reduce((sum, j) => sum + (j.budget_total ?? 0), 0);
  const totalSpent = jobs.reduce((sum, j) => sum + (j.spent_total ?? 0), 0);
  const activeJobs = jobs.filter((j) => j.status !== "Closed" && j.status !== "CO Issued").length;

  const columns: ColumnDef<Job, unknown>[] = [
    {
      accessorKey: "lot_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Lot" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("lot_number") ?? "—"}</span>,
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
      header: "Budget",
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
      id: "variance",
      header: "Variance",
      cell: ({ row }) => {
        const budget = row.original.budget_total ?? 0;
        const spent = row.original.spent_total ?? 0;
        if (!budget) return "—";
        const variance = budget - spent;
        return <span className={variance < 0 ? "text-destructive" : "text-success"}>{formatCurrency(variance)}</span>;
      },
    },
    {
      accessorKey: "start_date",
      header: "Start",
      cell: ({ row }) => formatDate(row.getValue("start_date")),
    },
    {
      accessorKey: "target_completion",
      header: "Target",
      cell: ({ row }) => formatDate(row.getValue("target_completion")),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Jobs Summary</h2>
        <p className="mt-0.5 text-sm text-muted">Read-only rollup of all construction jobs for this project</p>
      </div>

      {/* Summary KPIs */}
      {jobs.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted">Total Jobs</p>
            <p className="text-lg font-semibold text-foreground">{jobs.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted">Active</p>
            <p className="text-lg font-semibold text-foreground">{activeJobs}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted">Total Budget</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(totalBudget)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted">Total Spent</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(totalSpent)}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <FormSkeleton />
      ) : jobs.length === 0 ? (
        <EmptyState
          title="No jobs"
          description="Construction jobs will appear here when lots are assigned to builders"
        />
      ) : (
        <DataTable
          columns={columns}
          data={jobs}
          searchKey="lot_number"
          searchPlaceholder="Search jobs..."
          onRowClick={(row) => navigate({ to: `/construction/${row.id}` as string })}
        />
      )}
    </div>
  );
}

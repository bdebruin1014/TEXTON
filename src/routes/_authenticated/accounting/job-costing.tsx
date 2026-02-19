import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/accounting/job-costing")({
  component: JobCosting,
});

interface CostSummary {
  id: string;
  job_name: string | null;
  project_name: string | null;
  cost_code: string | null;
  cost_code_name: string | null;
  budgeted: number | null;
  committed: number | null;
  actual: number | null;
  remaining: number | null;
  percent_complete: number | null;
}

function JobCosting() {
  const activeEntityId = useEntityStore((s) => s.activeEntityId);

  const { data: costData = [], isLoading } = useQuery<CostSummary[]>({
    queryKey: ["job-costing", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("job_cost_summary").select("*").order("job_name").order("cost_code");
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const totals = costData.reduce(
    (acc, row) => ({
      budgeted: acc.budgeted + (row.budgeted ?? 0),
      committed: acc.committed + (row.committed ?? 0),
      actual: acc.actual + (row.actual ?? 0),
      remaining: acc.remaining + (row.remaining ?? 0),
    }),
    { budgeted: 0, committed: 0, actual: 0, remaining: 0 },
  );

  const columns: ColumnDef<CostSummary, unknown>[] = [
    {
      accessorKey: "job_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Job" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("job_name") ?? "—"}</span>,
    },
    {
      accessorKey: "project_name",
      header: "Project",
      cell: ({ row }) => <span className="text-xs text-muted">{row.getValue("project_name") ?? "—"}</span>,
    },
    {
      accessorKey: "cost_code",
      header: "Code",
      cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("cost_code") ?? "—"}</span>,
    },
    {
      accessorKey: "cost_code_name",
      header: "Cost Code",
      cell: ({ row }) => <span className="text-sm">{row.getValue("cost_code_name") ?? "—"}</span>,
    },
    {
      accessorKey: "budgeted",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Budgeted" />,
      cell: ({ row }) => {
        const val = row.getValue("budgeted") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "committed",
      header: "Committed",
      cell: ({ row }) => {
        const val = row.getValue("committed") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "actual",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Actual" />,
      cell: ({ row }) => {
        const val = row.getValue("actual") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "remaining",
      header: "Remaining",
      cell: ({ row }) => {
        const val = row.getValue("remaining") as number | null;
        if (val == null) return "—";
        return <span className={val < 0 ? "text-destructive" : "text-success"}>{formatCurrency(val)}</span>;
      },
    },
    {
      accessorKey: "percent_complete",
      header: "% Complete",
      cell: ({ row }) => {
        const val = row.getValue("percent_complete") as number | null;
        if (val == null) return "—";
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 rounded-full bg-gray-100">
              <div
                className="h-1.5 rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(val * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted">{formatPercent(val)}</span>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Job Costing</h1>
        <p className="mt-0.5 text-sm text-muted">
          Budget vs actual by job and cost code — data flows from Construction POs and invoices
        </p>
      </div>

      {/* Summary KPIs */}
      {costData.length > 0 && (
        <div className="mb-6 grid grid-cols-4 gap-4">
          {[
            { label: "Total Budgeted", value: formatCurrency(totals.budgeted) },
            { label: "Committed", value: formatCurrency(totals.committed) },
            { label: "Actual", value: formatCurrency(totals.actual) },
            {
              label: "Remaining",
              value: formatCurrency(totals.remaining),
              color: totals.remaining < 0 ? "text-destructive" : "text-success",
            },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted">{kpi.label}</p>
              <p className={`mt-1 text-lg font-semibold ${kpi.color ?? "text-foreground"}`}>{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <FormSkeleton />
      ) : costData.length === 0 ? (
        <EmptyState
          title="No job cost data"
          description="Cost data flows from construction POs, invoices, and budget lines"
        />
      ) : (
        <DataTable columns={columns} data={costData} searchKey="job_name" searchPlaceholder="Search by job..." />
      )}
    </div>
  );
}

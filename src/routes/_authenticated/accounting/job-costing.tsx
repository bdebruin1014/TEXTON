import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
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
  const [showCTC, setShowCTC] = useState(false);

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

  // Cost-to-complete calculations
  const ctcTotals = costData.reduce(
    (acc, row) => {
      const budgeted = row.budgeted ?? 0;
      const actual = row.actual ?? 0;
      const ctc = Math.max(budgeted - actual, 0);
      const eac = actual + ctc;
      const vac = budgeted - eac;
      return {
        ctc: acc.ctc + ctc,
        eac: acc.eac + eac,
        vac: acc.vac + vac,
      };
    },
    { ctc: 0, eac: 0, vac: 0 },
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
    ...(showCTC
      ? [
          {
            id: "cost_to_complete",
            header: "Cost to Complete",
            cell: ({ row }: { row: { original: CostSummary } }) => {
              const budgeted = row.original.budgeted ?? 0;
              const actual = row.original.actual ?? 0;
              const ctc = Math.max(budgeted - actual, 0);
              return <span className="font-medium">{formatCurrency(ctc)}</span>;
            },
          } as ColumnDef<CostSummary, unknown>,
          {
            id: "est_at_completion",
            header: "Est. at Completion",
            cell: ({ row }: { row: { original: CostSummary } }) => {
              const budgeted = row.original.budgeted ?? 0;
              const actual = row.original.actual ?? 0;
              const ctc = Math.max(budgeted - actual, 0);
              const eac = actual + ctc;
              return <span className="font-medium">{formatCurrency(eac)}</span>;
            },
          } as ColumnDef<CostSummary, unknown>,
          {
            id: "variance_at_completion",
            header: "VAC",
            cell: ({ row }: { row: { original: CostSummary } }) => {
              const budgeted = row.original.budgeted ?? 0;
              const actual = row.original.actual ?? 0;
              const ctc = Math.max(budgeted - actual, 0);
              const eac = actual + ctc;
              const vac = budgeted - eac;
              return <span className={vac < 0 ? "text-destructive" : "text-success"}>{formatCurrency(vac)}</span>;
            },
          } as ColumnDef<CostSummary, unknown>,
        ]
      : [
          {
            accessorKey: "remaining",
            header: "Remaining",
            cell: ({ row }: { row: { getValue: (key: string) => unknown } }) => {
              const val = row.getValue("remaining") as number | null;
              if (val == null) return "—";
              return <span className={val < 0 ? "text-destructive" : "text-success"}>{formatCurrency(val)}</span>;
            },
          } as ColumnDef<CostSummary, unknown>,
          {
            accessorKey: "percent_complete",
            header: "% Complete",
            cell: ({ row }: { row: { getValue: (key: string) => unknown } }) => {
              const val = row.getValue("percent_complete") as number | null;
              if (val == null) return "—";
              return (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 rounded-full bg-accent">
                    <div
                      className="h-1.5 rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min((val as number) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted">{formatPercent(val)}</span>
                </div>
              );
            },
          } as ColumnDef<CostSummary, unknown>,
        ]),
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Job Costing</h1>
          <p className="mt-0.5 text-sm text-muted">
            Budget vs actual by job and cost code — data flows from Construction POs and invoices
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCTC(!showCTC)}
          className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            showCTC ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:bg-card-hover"
          }`}
        >
          {showCTC ? "Standard View" : "Cost to Complete"}
        </button>
      </div>

      {/* Summary KPIs */}
      {costData.length > 0 && (
        <div className={`mb-6 grid gap-4 ${showCTC ? "grid-cols-3 lg:grid-cols-6" : "grid-cols-4"}`}>
          {[
            { label: "Total Budgeted", value: formatCurrency(totals.budgeted) },
            { label: "Committed", value: formatCurrency(totals.committed) },
            { label: "Actual", value: formatCurrency(totals.actual) },
            ...(showCTC
              ? [
                  { label: "Cost to Complete", value: formatCurrency(ctcTotals.ctc), color: "text-info-text" },
                  { label: "Est. at Completion", value: formatCurrency(ctcTotals.eac) },
                  {
                    label: "Variance at Completion",
                    value: formatCurrency(ctcTotals.vac),
                    color: ctcTotals.vac < 0 ? "text-destructive" : "text-success",
                  },
                ]
              : [
                  {
                    label: "Remaining",
                    value: formatCurrency(totals.remaining),
                    color: totals.remaining < 0 ? "text-destructive" : "text-success",
                  },
                ]),
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

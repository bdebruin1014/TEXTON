import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/accounting/reports/trial-balance")({
  component: TrialBalance,
});

interface TrialBalanceRow {
  account_id: string | null;
  account_number: string | null;
  account_name: string | null;
  account_type: string | null;
  normal_balance: string | null;
  total_debits: number;
  total_credits: number;
  net_balance: number;
}

function TrialBalance() {
  const activeEntityId = useEntityStore((s) => s.activeEntityId);

  const { data: rows = [], isLoading } = useQuery<TrialBalanceRow[]>({
    queryKey: ["trial-balance-report", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("trial_balance_report").select("*").order("account_number");
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalDebits = rows.reduce((s, r) => s + (r.total_debits ?? 0), 0);
  const totalCredits = rows.reduce((s, r) => s + (r.total_credits ?? 0), 0);

  const columns: ColumnDef<TrialBalanceRow, unknown>[] = [
    {
      accessorKey: "account_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Account #" />,
      cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.getValue("account_number") ?? "—"}</span>,
    },
    {
      accessorKey: "account_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Account Name" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("account_name") ?? "—"}</span>,
    },
    {
      accessorKey: "account_type",
      header: "Type",
      cell: ({ row }) => <span className="text-xs text-muted">{row.getValue("account_type") ?? "—"}</span>,
    },
    {
      accessorKey: "total_debits",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Debits" />,
      cell: ({ row }) => {
        const val = row.getValue("total_debits") as number;
        return val ? <span className="text-right">{formatCurrency(val)}</span> : "";
      },
    },
    {
      accessorKey: "total_credits",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Credits" />,
      cell: ({ row }) => {
        const val = row.getValue("total_credits") as number;
        return val ? <span className="text-right">{formatCurrency(val)}</span> : "";
      },
    },
    {
      accessorKey: "net_balance",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Net Balance" />,
      cell: ({ row }) => {
        const val = row.getValue("net_balance") as number;
        return (
          <span className={`font-medium ${val < 0 ? "text-destructive" : ""}`}>
            {formatCurrency(Math.abs(val))}
            {val < 0 ? " CR" : ""}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/accounting/reports"
          className="mb-2 inline-block text-xs font-medium text-primary hover:underline"
        >
          &larr; Back to Reports
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Trial Balance</h1>
        <p className="mt-0.5 text-sm text-muted">
          {rows.length} accounts · Posted journal entries only
        </p>
      </div>

      {isLoading ? (
        <TableSkeleton rows={10} cols={6} />
      ) : rows.length === 0 ? (
        <EmptyState title="No data" description="Post journal entries to generate the trial balance" />
      ) : (
        <>
          <DataTable columns={columns} data={rows} searchKey="account_name" searchPlaceholder="Search accounts..." />
          <div className="mt-4 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Totals</span>
              <div className="flex gap-12">
                <span>Debits: {formatCurrency(totalDebits)}</span>
                <span>Credits: {formatCurrency(totalCredits)}</span>
                <span className={Math.abs(totalDebits - totalCredits) < 0.01 ? "text-success" : "text-destructive"}>
                  {Math.abs(totalDebits - totalCredits) < 0.01
                    ? "Balanced"
                    : `Difference: ${formatCurrency(Math.abs(totalDebits - totalCredits))}`}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

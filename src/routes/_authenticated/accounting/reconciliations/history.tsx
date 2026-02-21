import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/accounting/reconciliations/history")({
  component: ReconciliationHistory,
});

interface Reconciliation {
  id: string;
  bank_account_name: string | null;
  month: string;
  status: string;
  statement_balance: number | null;
  book_balance: number | null;
  difference: number | null;
  created_at: string;
}

const columns: ColumnDef<Reconciliation, unknown>[] = [
  {
    accessorKey: "month",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Period" />,
    cell: ({ row }) => <span className="font-medium">{row.getValue("month")}</span>,
  },
  {
    accessorKey: "bank_account_name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Account" />,
    cell: ({ row }) => <span className="text-muted">{row.getValue("bank_account_name") ?? "—"}</span>,
  },
  {
    accessorKey: "statement_balance",
    header: "Statement",
    cell: ({ row }) => {
      const val = row.getValue("statement_balance") as number | null;
      return val != null ? formatCurrency(val) : "—";
    },
  },
  {
    accessorKey: "book_balance",
    header: "Book",
    cell: ({ row }) => {
      const val = row.getValue("book_balance") as number | null;
      return val != null ? formatCurrency(val) : "—";
    },
  },
  {
    accessorKey: "difference",
    header: "Difference",
    cell: ({ row }) => {
      const val = row.getValue("difference") as number | null;
      if (val == null) return "—";
      return <span className={Math.abs(val) < 0.01 ? "text-success" : "text-destructive"}>{formatCurrency(val)}</span>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const color = status === "Reconciled" ? "bg-success-bg text-success-text" : "bg-warning-bg text-warning-text";
      return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{status}</span>;
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Completed" />,
    cell: ({ row }) => <span>{formatDate(row.getValue("created_at"))}</span>,
  },
];

function ReconciliationHistory() {
  const activeEntityId = useEntityStore((s) => s.activeEntityId);

  const { data: reconciliations = [], isLoading } = useQuery<Reconciliation[]>({
    queryKey: ["reconciliation-history", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("reconciliations").select("*").order("month", { ascending: false });
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Reconciliation History</h1>
          <p className="mt-0.5 text-sm text-muted">{reconciliations.length} reconciliations</p>
        </div>
        <Link to="/accounting/reconciliations" className="text-sm text-primary hover:underline">
          Back to Dashboard
        </Link>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : reconciliations.length === 0 ? (
        <EmptyState title="No reconciliation history" description="Complete a reconciliation to see history here" />
      ) : (
        <DataTable
          columns={columns}
          data={reconciliations}
          searchKey="bank_account_name"
          searchPlaceholder="Search..."
        />
      )}
    </div>
  );
}

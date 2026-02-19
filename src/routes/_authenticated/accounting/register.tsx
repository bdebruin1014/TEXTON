import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/accounting/register")({
  component: Register,
});

interface Transaction {
  id: string;
  journal_entry_id: string | null;
  transaction_date: string;
  reference: string | null;
  description: string | null;
  debit: number | null;
  credit: number | null;
  running_balance: number | null;
  account_name: string | null;
  account_number: string | null;
}

const columns: ColumnDef<Transaction, unknown>[] = [
  {
    accessorKey: "transaction_date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => <span className="font-medium">{formatDate(row.getValue("transaction_date"))}</span>,
  },
  {
    accessorKey: "reference",
    header: "Ref",
    cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("reference") ?? "—"}</span>,
  },
  {
    accessorKey: "account_number",
    header: "Account",
    cell: ({ row }) => <span className="text-xs text-muted">{row.getValue("account_number") ?? "—"}</span>,
  },
  {
    accessorKey: "description",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
    cell: ({ row }) => <span className="text-sm">{row.getValue("description") ?? "—"}</span>,
  },
  {
    accessorKey: "debit",
    header: "Debit",
    cell: ({ row }) => {
      const val = row.getValue("debit") as number | null;
      return val ? formatCurrency(val) : "";
    },
  },
  {
    accessorKey: "credit",
    header: "Credit",
    cell: ({ row }) => {
      const val = row.getValue("credit") as number | null;
      return val ? formatCurrency(val) : "";
    },
  },
  {
    accessorKey: "running_balance",
    header: "Balance",
    cell: ({ row }) => {
      const val = row.getValue("running_balance") as number | null;
      return val != null ? <span className="font-medium">{formatCurrency(val)}</span> : "—";
    },
  },
];

function Register() {
  const navigate = useNavigate();
  const activeEntityId = useEntityStore((s) => s.activeEntityId);

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["register", activeEntityId],
    queryFn: async () => {
      let query = supabase
        .from("journal_entry_lines")
        .select(
          "id, journal_entry_id, transaction_date, reference, description, debit, credit, running_balance, account_name, account_number",
        )
        .order("transaction_date", { ascending: false })
        .limit(500);
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
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Transaction Register</h1>
        <p className="mt-0.5 text-sm text-muted">
          {activeEntityId ? "Filtered by entity" : "All entities"} · {transactions.length} transactions
        </p>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : transactions.length === 0 ? (
        <EmptyState title="No transactions" description="Create journal entries to see transactions in the register" />
      ) : (
        <DataTable
          columns={columns}
          data={transactions}
          searchKey="description"
          searchPlaceholder="Search transactions..."
          onRowClick={(row) => {
            if (row.journal_entry_id) {
              navigate({ to: "/accounting/journal-entries" as string });
            }
          }}
        />
      )}
    </div>
  );
}

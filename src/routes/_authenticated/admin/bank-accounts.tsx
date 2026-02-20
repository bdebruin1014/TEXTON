import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/bank-accounts")({
  component: BankAccountsAdmin,
});

interface BankAccount {
  id: string;
  account_name: string;
  bank_name: string | null;
  account_number: string | null;
  routing_number: string | null;
  account_type: string | null;
  entity_name: string | null;
  current_balance: number | null;
  status: string;
}

function BankAccountsAdmin() {
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery<BankAccount[]>({
    queryKey: ["admin-bank-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bank_accounts").select("*").order("account_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addAccount = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bank_accounts").insert({
        account_name: "New Bank Account",
        status: "Active",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-bank-accounts"] }),
  });

  const columns: ColumnDef<BankAccount, unknown>[] = [
    {
      accessorKey: "account_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Account Name" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("account_name")}</span>,
    },
    {
      accessorKey: "bank_name",
      header: "Bank",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("bank_name") ?? "—"}</span>,
    },
    {
      accessorKey: "account_number",
      header: "Account #",
      cell: ({ row }) => {
        const val = row.getValue("account_number") as string | null;
        return val ? <span className="font-mono text-xs">••••{val.slice(-4)}</span> : "—";
      },
    },
    {
      accessorKey: "account_type",
      header: "Type",
      cell: ({ row }) => <span className="text-xs text-muted">{row.getValue("account_type") ?? "—"}</span>,
    },
    {
      accessorKey: "entity_name",
      header: "Entity",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("entity_name") ?? "—"}</span>,
    },
    {
      accessorKey: "current_balance",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Balance" />,
      cell: ({ row }) => {
        const val = row.getValue("current_balance") as number | null;
        return val != null ? <span className="font-medium">{formatCurrency(val)}</span> : "—";
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Bank Accounts</h1>
          <p className="mt-0.5 text-sm text-muted">{accounts.length} accounts across all entities</p>
        </div>
        <button
          type="button"
          onClick={() => addAccount.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          +
          Add Bank Account
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : accounts.length === 0 ? (
        <EmptyState title="No bank accounts" description="Set up bank accounts per entity" />
      ) : (
        <DataTable columns={columns} data={accounts} searchKey="account_name" searchPlaceholder="Search accounts..." />
      )}
    </div>
  );
}

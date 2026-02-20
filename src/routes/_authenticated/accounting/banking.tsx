import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useRef } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/accounting/banking")({
  component: Banking,
});

interface BankAccount {
  id: string;
  account_name: string;
  account_number: string | null;
  bank_name: string | null;
  routing_number: string | null;
  account_type: string | null;
  current_balance: number | null;
  status: string;
  entity_id: string | null;
}

function Banking() {
  const queryClient = useQueryClient();
  const activeEntityId = useEntityStore((s) => s.activeEntityId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: accounts = [], isLoading } = useQuery<BankAccount[]>({
    queryKey: ["bank-accounts", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("bank_accounts").select("*").order("account_name");
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const addAccount = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bank_accounts").insert({
        account_name: "New Bank Account",
        status: "Active",
        entity_id: activeEntityId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bank-accounts", activeEntityId] }),
  });

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Placeholder: in production, parse CSV/OFX and insert bank_transactions
      console.log("Import file:", file.name);
    }
    e.target.value = "";
  };

  const totalBalance = accounts.reduce((sum, a) => sum + (a.current_balance ?? 0), 0);

  const columns: ColumnDef<BankAccount, unknown>[] = [
    {
      accessorKey: "account_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Account Name" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("account_name")}</span>,
    },
    {
      accessorKey: "bank_name",
      header: "Bank",
      cell: ({ row }) => <span className="text-muted">{row.getValue("bank_name") ?? "—"}</span>,
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
          <p className="mt-0.5 text-sm text-muted">
            {accounts.length} accounts · Total: {formatCurrency(totalBalance)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
          >
            
            Import Transactions
          </button>
          <button
            type="button"
            onClick={() => addAccount.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            +
            Add Bank Account
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,.ofx,.qfx" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : accounts.length === 0 ? (
        <EmptyState title="No bank accounts" description="Add bank accounts to track balances and transactions" />
      ) : (
        <DataTable columns={columns} data={accounts} searchKey="account_name" searchPlaceholder="Search accounts..." />
      )}
    </div>
  );
}

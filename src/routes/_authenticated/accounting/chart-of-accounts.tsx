import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/accounting/chart-of-accounts")({
  component: ChartOfAccounts,
});

interface Account {
  id: string;
  account_number: string;
  account_name: string;
  account_type: string;
  sub_type: string | null;
  normal_balance: string;
  is_active: boolean;
  description: string | null;
  parent_id: string | null;
}

const ACCOUNT_TYPES = ["Asset", "Liability", "Equity", "Revenue", "Expense"] as const;

function ChartOfAccounts() {
  const queryClient = useQueryClient();
  const activeEntityId = useEntityStore((s) => s.activeEntityId);

  const { data: accounts = [], isLoading } = useQuery<Account[]>({
    queryKey: ["chart-of-accounts", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("chart_of_accounts").select("*").order("account_number");
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
      const nextNumber =
        accounts.length > 0 ? String(Math.max(...accounts.map((a) => Number(a.account_number) || 0)) + 10) : "1000";
      const { error } = await supabase.from("chart_of_accounts").insert({
        account_number: nextNumber,
        account_name: "New Account",
        account_type: "Expense",
        normal_balance: "Debit",
        is_active: true,
        entity_id: activeEntityId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", activeEntityId] }),
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chart_of_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", activeEntityId] }),
  });

  const typeCounts = accounts.reduce(
    (acc, a) => {
      acc[a.account_type] = (acc[a.account_type] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const columns: ColumnDef<Account, unknown>[] = [
    {
      accessorKey: "account_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Number" />,
      cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.getValue("account_number")}</span>,
      size: 100,
    },
    {
      accessorKey: "account_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Account Name" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("account_name")}</span>,
    },
    {
      accessorKey: "account_type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => {
        const type = row.getValue("account_type") as string;
        const colors: Record<string, string> = {
          Asset: "text-blue-700 bg-blue-50",
          Liability: "text-red-700 bg-red-50",
          Equity: "text-purple-700 bg-purple-50",
          Revenue: "text-green-700 bg-green-50",
          Expense: "text-amber-700 bg-amber-50",
        };
        return (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[type] ?? "text-gray-700 bg-gray-50"}`}
          >
            {type}
          </span>
        );
      },
    },
    {
      accessorKey: "sub_type",
      header: "Sub-Type",
      cell: ({ row }) => <span className="text-xs text-muted">{row.getValue("sub_type") ?? "—"}</span>,
    },
    {
      accessorKey: "normal_balance",
      header: "Normal",
      cell: ({ row }) => <span className="text-xs text-muted">{row.getValue("normal_balance")}</span>,
    },
    {
      accessorKey: "is_active",
      header: "Active",
      cell: ({ row }) => (
        <span className={`text-xs font-medium ${row.getValue("is_active") ? "text-success" : "text-muted"}`}>
          {row.getValue("is_active") ? "Yes" : "No"}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteAccount.mutate(row.original.id);
          }}
          className="rounded p-1 text-muted transition-colors hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Chart of Accounts</h1>
          <p className="mt-0.5 text-sm text-muted">
            {accounts.length} accounts
            {Object.entries(typeCounts).length > 0 &&
              ` · ${ACCOUNT_TYPES.map((t) => `${typeCounts[t] ?? 0} ${t}`).join(", ")}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => addAccount.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Add Account
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : accounts.length === 0 ? (
        <EmptyState title="No accounts" description="Set up your chart of accounts (builder COA: 1000-6000)" />
      ) : (
        <DataTable columns={columns} data={accounts} searchKey="account_name" searchPlaceholder="Search accounts..." />
      )}
    </div>
  );
}

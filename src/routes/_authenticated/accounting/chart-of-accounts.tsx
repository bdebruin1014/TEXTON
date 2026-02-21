import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";
import { CreateRecordModal } from "@/components/shared/CreateRecordModal";
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
  const [showModal, setShowModal] = useState(false);

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
    mutationFn: async (values: Record<string, string>) => {
      const { error } = await supabase.from("chart_of_accounts").insert({
        account_number: values.account_number,
        account_name: values.account_name,
        account_type: values.account_type || "Expense",
        sub_type: values.sub_type || null,
        normal_balance: values.normal_balance || "Debit",
        is_active: true,
        entity_id: activeEntityId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", activeEntityId] });
      toast.success("Account added");
      setShowModal(false);
    },
    onError: () => toast.error("Failed to add account"),
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
          Asset: "text-info-text bg-info-bg",
          Liability: "text-destructive-text bg-destructive-bg",
          Equity: "text-foreground bg-accent",
          Revenue: "text-success-text bg-success-bg",
          Expense: "text-warning-text bg-warning-bg",
        };
        return (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[type] ?? "text-muted-foreground bg-card-hover"}`}
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
        ></button>
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
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + Add Account
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : accounts.length === 0 ? (
        <EmptyState title="No accounts" description="Set up your chart of accounts (builder COA: 1000-6000)" />
      ) : (
        <DataTable columns={columns} data={accounts} searchKey="account_name" searchPlaceholder="Search accounts..." />
      )}

      <CreateRecordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Account"
        fields={[
          {
            name: "account_number",
            label: "Account number",
            type: "text",
            required: true,
            placeholder: "Account number",
          },
          { name: "account_name", label: "Account name", type: "text", required: true, placeholder: "Account name" },
          {
            name: "account_type",
            label: "Account type",
            type: "select",
            required: true,
            options: ["Asset", "Liability", "Equity", "Revenue", "Expense"],
          },
          { name: "sub_type", label: "Sub-type", type: "text", placeholder: "Sub-type" },
          {
            name: "normal_balance",
            label: "Normal balance",
            type: "select",
            options: ["Debit", "Credit"],
            defaultValue: "Debit",
          },
        ]}
        onSubmit={async (values) => {
          await addAccount.mutateAsync(values);
        }}
        loading={addAccount.isPending}
      />
    </div>
  );
}

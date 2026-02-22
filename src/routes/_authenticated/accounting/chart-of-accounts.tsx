import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CreateRecordModal } from "@/components/shared/CreateRecordModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
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
  is_locked: boolean | null;
  description: string | null;
  parent_id: string | null;
}

const ACCOUNT_TYPES = ["Asset", "Liability", "Equity", "Revenue", "Expense"] as const;

const TYPE_COLORS: Record<string, string> = {
  Asset: "text-info-text bg-info-bg",
  Liability: "text-destructive-text bg-destructive-bg",
  Equity: "text-foreground bg-accent",
  Revenue: "text-success-text bg-success-bg",
  Expense: "text-warning-text bg-warning-bg",
};

const TYPE_BORDER_COLORS: Record<string, string> = {
  Asset: "border-info-text/20",
  Liability: "border-destructive-text/20",
  Equity: "border-foreground/20",
  Revenue: "border-success-text/20",
  Expense: "border-warning-text/20",
};

function ChartOfAccounts() {
  const queryClient = useQueryClient();
  const activeEntityId = useEntityStore((s) => s.activeEntityId);
  const [showModal, setShowModal] = useState(false);
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(new Set());

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
        parent_id: values.parent_id || null,
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

  const toggleType = (type: string) => {
    setCollapsedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  // Build hierarchy: group by type, then parent/child
  const accountsByType = ACCOUNT_TYPES.map((type) => {
    const typeAccounts = accounts.filter((a) => a.account_type === type);
    const rootAccounts = typeAccounts.filter((a) => !a.parent_id);
    const childMap = new Map<string, Account[]>();
    for (const a of typeAccounts) {
      if (a.parent_id) {
        if (!childMap.has(a.parent_id)) childMap.set(a.parent_id, []);
        childMap.get(a.parent_id)!.push(a);
      }
    }
    return { type, rootAccounts, childMap, count: typeAccounts.length };
  });

  // Build parent options for the create modal
  const parentOptions = accounts
    .filter((a) => !a.parent_id)
    .map((a) => ({ label: `${a.account_number} — ${a.account_name}`, value: a.id }));

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
        <div className="space-y-4">
          {accountsByType.map(({ type, rootAccounts, childMap, count }) => {
            const isCollapsed = collapsedTypes.has(type);
            return (
              <div key={type} className={`rounded-lg border ${TYPE_BORDER_COLORS[type]} bg-card`}>
                <button
                  type="button"
                  onClick={() => toggleType(type)}
                  className="flex w-full items-center justify-between p-3 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">{isCollapsed ? "+" : "-"}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[type]}`}>
                      {type}
                    </span>
                    <span className="text-xs text-muted">{count} accounts</span>
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="border-t border-border/50">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-muted">
                          <th className="px-3 py-2 font-medium">Number</th>
                          <th className="px-3 py-2 font-medium">Account Name</th>
                          <th className="px-3 py-2 font-medium">Sub-Type</th>
                          <th className="px-3 py-2 font-medium">Normal</th>
                          <th className="px-3 py-2 font-medium">Active</th>
                          <th className="w-8 px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {rootAccounts.map((account) => {
                          const children = childMap.get(account.id) ?? [];
                          return (
                            <AccountRow
                              key={account.id}
                              account={account}
                              children={children}
                              onDelete={(id) => deleteAccount.mutate(id)}
                              indent={0}
                            />
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
          {
            name: "parent_id",
            label: "Parent account",
            type: "select",
            options: parentOptions.map((p) => p.label),
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
          // Resolve parent_id from label to id
          if (values.parent_id) {
            const parent = parentOptions.find((p) => p.label === values.parent_id);
            if (parent) values.parent_id = parent.value;
            else values.parent_id = "";
          }
          await addAccount.mutateAsync(values);
        }}
        loading={addAccount.isPending}
      />
    </div>
  );
}

function AccountRow({
  account,
  children,
  onDelete,
  indent,
}: {
  account: Account;
  children: Account[];
  onDelete: (id: string) => void;
  indent: number;
}) {
  return (
    <>
      <tr className="border-b border-border/30 hover:bg-card-hover">
        <td className="px-3 py-2">
          <span className="font-mono text-xs font-medium" style={{ paddingLeft: `${indent * 20}px` }}>
            {account.account_number}
          </span>
        </td>
        <td className="px-3 py-2">
          <span className="font-medium" style={{ paddingLeft: `${indent * 20}px` }}>
            {account.is_locked && (
              <span className="mr-1.5 inline-block text-muted" title="Locked">
                &#128274;
              </span>
            )}
            {account.account_name}
          </span>
        </td>
        <td className="px-3 py-2 text-xs text-muted">{account.sub_type ?? "—"}</td>
        <td className="px-3 py-2 text-xs text-muted">{account.normal_balance}</td>
        <td className="px-3 py-2">
          <span className={`text-xs font-medium ${account.is_active ? "text-success" : "text-muted"}`}>
            {account.is_active ? "Yes" : "No"}
          </span>
        </td>
        <td className="px-3 py-2 text-center">
          {!account.is_locked && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(account.id);
              }}
              className="rounded p-1 text-muted transition-colors hover:text-destructive"
            >
              &times;
            </button>
          )}
        </td>
      </tr>
      {children.map((child) => (
        <AccountRow key={child.id} account={child} children={[]} onDelete={onDelete} indent={indent + 1} />
      ))}
    </>
  );
}

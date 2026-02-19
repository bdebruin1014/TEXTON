import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/accounting/reconciliations/start")({
  component: StartReconciliation,
});

interface BankAccount {
  id: string;
  account_name: string;
  current_balance: number | null;
}

function StartReconciliation() {
  const queryClient = useQueryClient();
  const activeEntityId = useEntityStore((s) => s.activeEntityId);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [statementBalance, setStatementBalance] = useState("");
  const [statementDate, setStatementDate] = useState("");

  const { data: accounts = [] } = useQuery<BankAccount[]>({
    queryKey: ["bank-accounts-list", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("bank_accounts").select("id, account_name, current_balance").eq("status", "Active");
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const selectedAccountData = accounts.find((a) => a.id === selectedAccount);
  const bookBalance = selectedAccountData?.current_balance ?? 0;
  const stmtBal = Number(statementBalance) || 0;
  const difference = stmtBal - bookBalance;

  const startRecon = useMutation({
    mutationFn: async () => {
      const month = statementDate.slice(0, 7); // YYYY-MM
      const { error } = await supabase.from("reconciliations").insert({
        bank_account_id: selectedAccount,
        bank_account_name: selectedAccountData?.account_name,
        month,
        statement_balance: stmtBal,
        book_balance: bookBalance,
        difference,
        status: Math.abs(difference) < 0.01 ? "Reconciled" : "In Progress",
        entity_id: activeEntityId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reconciliations", activeEntityId] });
      setSelectedAccount("");
      setStatementBalance("");
      setStatementDate("");
    },
  });

  const undoPrevious = useMutation({
    mutationFn: async () => {
      const { data: latest } = await supabase
        .from("reconciliations")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (latest) {
        const { error } = await supabase.from("reconciliations").delete().eq("id", latest.id);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reconciliations", activeEntityId] }),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Start Reconciliation</h1>
          <p className="mt-0.5 text-sm text-muted">Qualia-style: statement balance + outstanding = book balance</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => undoPrevious.mutate()}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-gray-50"
          >
            Undo Previous
          </button>
          <Link to="/accounting/reconciliations" className="text-sm text-primary hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl">
        {/* Step 1: Select Account */}
        <div className="mb-6 rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
            Step 1: Select Bank Account
          </h3>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">Select account...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_name} ({formatCurrency(a.current_balance ?? 0)})
              </option>
            ))}
          </select>
        </div>

        {/* Step 2: Enter Statement Info */}
        <div className="mb-6 rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
            Step 2: Statement Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Statement Date</label>
              <input
                type="date"
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Statement Ending Balance</label>
              <input
                type="number"
                step="0.01"
                value={statementBalance}
                onChange={(e) => setStatementBalance(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Review */}
        {selectedAccount && statementBalance && (
          <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">Reconciliation Summary</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Statement Balance</span>
                <span className="font-medium">{formatCurrency(stmtBal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Book Balance</span>
                <span className="font-medium">{formatCurrency(bookBalance)}</span>
              </div>
              <div className="border-t border-border pt-2">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Difference</span>
                  <span className={Math.abs(difference) < 0.01 ? "text-success" : "text-destructive"}>
                    {formatCurrency(difference)}
                  </span>
                </div>
              </div>
              {Math.abs(difference) < 0.01 && <p className="text-xs text-success">Balanced — ready to reconcile!</p>}
            </div>
          </div>
        )}

        {/* Action */}
        <button
          type="button"
          onClick={() => startRecon.mutate()}
          disabled={!selectedAccount || !statementBalance || !statementDate}
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start Reconciliation
        </button>
      </div>
    </div>
  );
}

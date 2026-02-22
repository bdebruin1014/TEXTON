import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/accounting/reconciliations/match")({
  component: TransactionMatching,
});

interface BankAccount {
  id: string;
  account_name: string;
}

interface BankTxn {
  id: string;
  transaction_date: string;
  description: string | null;
  amount: number;
  transaction_type: string | null;
  payee: string | null;
  reference: string | null;
}

interface JELine {
  id: string;
  description: string | null;
  debit: number | null;
  credit: number | null;
  account_name: string | null;
  account_number: string | null;
  journal_entry_id: string;
}

function TransactionMatching() {
  const queryClient = useQueryClient();
  const activeEntityId = useEntityStore((s) => s.activeEntityId);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);

  const { data: accounts = [] } = useQuery<BankAccount[]>({
    queryKey: ["bank-accounts-list", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("bank_accounts").select("id, account_name").eq("status", "Active");
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: unmatchedTxns = [], isLoading: txnLoading } = useQuery<BankTxn[]>({
    queryKey: ["unmatched-txns", selectedAccount],
    enabled: !!selectedAccount,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_transactions")
        .select("id, transaction_date, description, amount, transaction_type, payee, reference")
        .eq("bank_account_id", selectedAccount)
        .eq("is_matched", false)
        .order("transaction_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: unreconciledLines = [], isLoading: lineLoading } = useQuery<JELine[]>({
    queryKey: ["unreconciled-lines", activeEntityId],
    enabled: !!selectedAccount,
    queryFn: async () => {
      let query = supabase
        .from("journal_entry_lines")
        .select("id, description, debit, credit, account_name, account_number, journal_entry_id")
        .eq("is_reconciled", false)
        .order("created_at", { ascending: false })
        .limit(100);
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const matchMutation = useMutation({
    mutationFn: async ({ txnId, lineId }: { txnId: string; lineId: string }) => {
      const today = new Date().toISOString().split("T")[0];

      const { error: txnErr } = await supabase
        .from("bank_transactions")
        .update({ is_matched: true, matched_je_line_id: lineId })
        .eq("id", txnId);
      if (txnErr) throw txnErr;

      const { error: lineErr } = await supabase
        .from("journal_entry_lines")
        .update({ is_reconciled: true, reconciled_date: today })
        .eq("id", lineId);
      if (lineErr) throw lineErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unmatched-txns", selectedAccount] });
      queryClient.invalidateQueries({ queryKey: ["unreconciled-lines", activeEntityId] });
      setSelectedTxnId(null);
      setSelectedLineId(null);
      toast.success("Transaction matched successfully");
    },
    onError: () => toast.error("Failed to match transaction"),
  });

  const autoMatchMutation = useMutation({
    mutationFn: async () => {
      let matchCount = 0;
      const today = new Date().toISOString().split("T")[0];
      const remainingTxns = [...unmatchedTxns];
      const remainingLines = [...unreconciledLines];

      for (const txn of remainingTxns) {
        // Find a JE line matching by amount
        const matchIdx = remainingLines.findIndex((line) => {
          const lineAmount = (line.debit ?? 0) || (line.credit ?? 0);
          return Math.abs(lineAmount - txn.amount) < 0.01;
        });

        if (matchIdx >= 0) {
          const matchedLine = remainingLines[matchIdx]!;
          const { error: txnErr } = await supabase
            .from("bank_transactions")
            .update({ is_matched: true, matched_je_line_id: matchedLine.id })
            .eq("id", txn.id);
          if (txnErr) continue;

          const { error: lineErr } = await supabase
            .from("journal_entry_lines")
            .update({ is_reconciled: true, reconciled_date: today })
            .eq("id", matchedLine.id);
          if (lineErr) continue;

          remainingLines.splice(matchIdx, 1);
          matchCount++;
        }
      }
      return matchCount;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["unmatched-txns", selectedAccount] });
      queryClient.invalidateQueries({ queryKey: ["unreconciled-lines", activeEntityId] });
      toast.success(`Auto-matched ${count} transactions`);
    },
    onError: () => toast.error("Auto-match failed"),
  });

  const handleMatch = () => {
    if (selectedTxnId && selectedLineId) {
      matchMutation.mutate({ txnId: selectedTxnId, lineId: selectedLineId });
    }
  };

  const selectedTxn = unmatchedTxns.find((t) => t.id === selectedTxnId);
  const selectedLine = unreconciledLines.find((l) => l.id === selectedLineId);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Transaction Matching</h1>
          <p className="mt-0.5 text-sm text-muted">Match bank transactions to journal entry lines</p>
        </div>
        <Link to="/accounting/reconciliations" className="text-sm text-primary hover:underline">
          Back to Dashboard
        </Link>
      </div>

      {/* Account Selector */}
      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <label className="mb-2 block text-sm font-medium text-foreground">Bank Account</label>
        <div className="flex items-center gap-3">
          <select
            value={selectedAccount}
            onChange={(e) => {
              setSelectedAccount(e.target.value);
              setSelectedTxnId(null);
              setSelectedLineId(null);
            }}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">Select account...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_name}
              </option>
            ))}
          </select>
          {selectedAccount && (
            <button
              type="button"
              onClick={() => autoMatchMutation.mutate()}
              disabled={autoMatchMutation.isPending || unmatchedTxns.length === 0}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-hover disabled:opacity-50"
            >
              {autoMatchMutation.isPending ? "Matching..." : "Auto-Match"}
            </button>
          )}
        </div>
      </div>

      {!selectedAccount ? (
        <EmptyState title="Select an account" description="Choose a bank account to start matching transactions" />
      ) : (
        <>
          {/* Match action bar */}
          {selectedTxnId && selectedLineId && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted">
                  Bank: <span className="font-medium text-foreground">{selectedTxn?.description ?? "—"}</span> ({formatCurrency(selectedTxn?.amount ?? 0)})
                </span>
                <span className="text-muted">&rarr;</span>
                <span className="text-muted">
                  JE Line: <span className="font-medium text-foreground">{selectedLine?.account_name ?? "—"}</span> (
                  {formatCurrency((selectedLine?.debit ?? 0) || (selectedLine?.credit ?? 0))})
                </span>
              </div>
              <button
                type="button"
                onClick={handleMatch}
                disabled={matchMutation.isPending}
                className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover disabled:opacity-50"
              >
                {matchMutation.isPending ? "Matching..." : "Match Selected"}
              </button>
            </div>
          )}

          {/* Two-panel layout */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Left: Bank Transactions */}
            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border p-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Unmatched Bank Transactions ({unmatchedTxns.length})
                </h3>
              </div>
              {txnLoading ? (
                <div className="p-4">
                  <TableSkeleton rows={5} cols={3} />
                </div>
              ) : unmatchedTxns.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted">All transactions matched</div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card">
                      <tr className="text-left text-xs text-muted">
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Description</th>
                        <th className="px-3 py-2 font-medium text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unmatchedTxns.map((txn) => (
                        <tr
                          key={txn.id}
                          onClick={() => setSelectedTxnId(selectedTxnId === txn.id ? null : txn.id)}
                          className={`cursor-pointer border-b border-border/30 transition-colors ${
                            selectedTxnId === txn.id ? "bg-primary/10" : "hover:bg-card-hover"
                          }`}
                        >
                          <td className="whitespace-nowrap px-3 py-2 text-xs">{formatDate(txn.transaction_date)}</td>
                          <td className="px-3 py-2">
                            <div className="text-sm">{txn.description ?? "—"}</div>
                            {txn.payee && <div className="text-xs text-muted">{txn.payee}</div>}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right font-medium">
                            <span className={txn.transaction_type === "Debit" ? "text-destructive" : "text-success"}>
                              {txn.transaction_type === "Debit" ? "-" : ""}
                              {formatCurrency(txn.amount)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right: Journal Entry Lines */}
            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border p-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Unreconciled JE Lines ({unreconciledLines.length})
                </h3>
              </div>
              {lineLoading ? (
                <div className="p-4">
                  <TableSkeleton rows={5} cols={3} />
                </div>
              ) : unreconciledLines.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted">All lines reconciled</div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card">
                      <tr className="text-left text-xs text-muted">
                        <th className="px-3 py-2 font-medium">Account</th>
                        <th className="px-3 py-2 font-medium">Description</th>
                        <th className="px-3 py-2 font-medium text-right">Debit</th>
                        <th className="px-3 py-2 font-medium text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unreconciledLines.map((line) => (
                        <tr
                          key={line.id}
                          onClick={() => setSelectedLineId(selectedLineId === line.id ? null : line.id)}
                          className={`cursor-pointer border-b border-border/30 transition-colors ${
                            selectedLineId === line.id ? "bg-primary/10" : "hover:bg-card-hover"
                          }`}
                        >
                          <td className="px-3 py-2">
                            <div className="font-mono text-xs text-muted">{line.account_number ?? "—"}</div>
                            <div className="text-xs">{line.account_name ?? "—"}</div>
                          </td>
                          <td className="px-3 py-2 text-xs">{line.description ?? "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right font-medium">
                            {line.debit ? formatCurrency(line.debit) : ""}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right font-medium">
                            {line.credit ? formatCurrency(line.credit) : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

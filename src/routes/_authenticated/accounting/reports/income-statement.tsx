import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/accounting/reports/income-statement")({
  component: IncomeStatement,
});

interface ISRow {
  account_id: string | null;
  account_number: string | null;
  account_name: string | null;
  account_type: string | null;
  entry_date: string | null;
  total_debits: number;
  total_credits: number;
  net_amount: number;
}

function IncomeStatement() {
  const activeEntityId = useEntityStore((s) => s.activeEntityId);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-01-01`;
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  const { data: rows = [], isLoading } = useQuery<ISRow[]>({
    queryKey: ["income-statement-report", activeEntityId, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from("income_statement_report")
        .select("*")
        .gte("entry_date", startDate)
        .lte("entry_date", endDate)
        .order("account_type", { ascending: false })
        .order("account_number");
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Aggregate by account (the view groups by entry_date, we re-aggregate here)
  const accountMap = new Map<string, { account_number: string; account_name: string; account_type: string; net_amount: number }>();
  for (const row of rows) {
    const key = row.account_id ?? row.account_number ?? "unknown";
    const existing = accountMap.get(key);
    if (existing) {
      existing.net_amount += row.net_amount ?? 0;
    } else {
      accountMap.set(key, {
        account_number: row.account_number ?? "",
        account_name: row.account_name ?? "",
        account_type: row.account_type ?? "",
        net_amount: row.net_amount ?? 0,
      });
    }
  }

  const accounts = Array.from(accountMap.values());
  const revenueAccounts = accounts.filter((a) => a.account_type === "Revenue");
  const expenseAccounts = accounts.filter((a) => a.account_type === "Expense");
  const totalRevenue = revenueAccounts.reduce((s, a) => s + a.net_amount, 0);
  const totalExpenses = expenseAccounts.reduce((s, a) => s + a.net_amount, 0);
  const netIncome = totalRevenue - totalExpenses;

  return (
    <div>
      <div className="mb-6">
        <Link to="/accounting/reports" className="mb-2 inline-block text-xs font-medium text-primary hover:underline">
          &larr; Back to Reports
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Income Statement (P&L)</h1>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded border border-border bg-card px-2 py-1 text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded border border-border bg-card px-2 py-1 text-xs"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={10} cols={3} />
      ) : accounts.length === 0 ? (
        <EmptyState title="No data" description="Post journal entries with Revenue and Expense accounts to generate P&L" />
      ) : (
        <div className="rounded-lg border border-border bg-card">
          {/* Revenue Section */}
          <div className="border-b border-border p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-success">Revenue</h2>
            <table className="w-full text-sm">
              <tbody>
                {revenueAccounts.map((a) => (
                  <tr key={a.account_number} className="border-b border-border/30">
                    <td className="py-2">
                      <span className="font-mono text-xs text-muted">{a.account_number}</span>
                      <span className="ml-2">{a.account_name}</span>
                    </td>
                    <td className="py-2 text-right font-medium">{formatCurrency(a.net_amount)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2">Total Revenue</td>
                  <td className="py-2 text-right">{formatCurrency(totalRevenue)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Expense Section */}
          <div className="border-b border-border p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-warning-text">Expenses</h2>
            <table className="w-full text-sm">
              <tbody>
                {expenseAccounts.map((a) => (
                  <tr key={a.account_number} className="border-b border-border/30">
                    <td className="py-2">
                      <span className="font-mono text-xs text-muted">{a.account_number}</span>
                      <span className="ml-2">{a.account_name}</span>
                    </td>
                    <td className="py-2 text-right font-medium">{formatCurrency(a.net_amount)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2">Total Expenses</td>
                  <td className="py-2 text-right">{formatCurrency(totalExpenses)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Net Income */}
          <div className="p-4">
            <div className="flex items-center justify-between text-base font-bold">
              <span>Net Income</span>
              <span className={netIncome >= 0 ? "text-success" : "text-destructive"}>
                {formatCurrency(Math.abs(netIncome))}
                {netIncome < 0 ? " (Loss)" : ""}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

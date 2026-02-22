import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/accounting/reports/cash-flow")({
  component: CashFlowStatement,
});

interface JELineRow {
  id: string;
  debit: number | null;
  credit: number | null;
  description: string | null;
  journal_entries: {
    entry_date: string;
    status: string;
    entity_id: string | null;
  };
  chart_of_accounts: {
    account_name: string;
    account_number: string;
    account_type: string;
    sub_type: string | null;
  };
}

type CashFlowCategory = "Operating" | "Investing" | "Financing";

interface CashFlowItem {
  account_number: string;
  account_name: string;
  amount: number;
  category: CashFlowCategory;
}

function classifyAccount(accountType: string, accountNumber: string): CashFlowCategory | null {
  // Cash accounts are excluded from categories (they are the result)
  if (accountNumber.startsWith("1000") || accountNumber.startsWith("1001")) return null;

  switch (accountType) {
    case "Revenue":
    case "Expense":
      return "Operating";
    case "Asset":
      return "Investing";
    case "Liability":
    case "Equity":
      return "Financing";
    default:
      return "Operating";
  }
}

function CashFlowStatement() {
  const activeEntityId = useEntityStore((s) => s.activeEntityId);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-01-01`;
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  const { data: lines = [], isLoading } = useQuery<JELineRow[]>({
    queryKey: ["cash-flow-report", activeEntityId, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from("journal_entry_lines")
        .select(
          "id, debit, credit, description, journal_entries!inner(entry_date, status, entity_id), chart_of_accounts!inner(account_name, account_number, account_type, sub_type)",
        )
        .eq("journal_entries.status", "Posted")
        .gte("journal_entries.entry_date", startDate)
        .lte("journal_entries.entry_date", endDate);
      if (activeEntityId) {
        query = query.eq("journal_entries.entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown as JELineRow[]) ?? [];
    },
  });

  // Aggregate by account into cash flow categories
  const accountMap = new Map<string, CashFlowItem>();
  for (const line of lines) {
    const coa = line.chart_of_accounts;
    const category = classifyAccount(coa.account_type, coa.account_number);
    if (!category) continue;

    const key = coa.account_number;
    const debit = line.debit ?? 0;
    const credit = line.credit ?? 0;

    // Cash flow sign: positive = cash inflow
    // Revenue/Liability/Equity: credits are inflows (credit - debit)
    // Asset/Expense: debits are outflows for investing, expenses reduce cash (credit - debit for operating expense)
    let amount: number;
    if (coa.account_type === "Revenue" || coa.account_type === "Liability" || coa.account_type === "Equity") {
      amount = credit - debit;
    } else if (coa.account_type === "Expense") {
      // Expenses reduce cash (show as negative)
      amount = -(debit - credit);
    } else {
      // Asset (investing) - purchases are outflows
      amount = -(debit - credit);
    }

    const existing = accountMap.get(key);
    if (existing) {
      existing.amount += amount;
    } else {
      accountMap.set(key, {
        account_number: coa.account_number,
        account_name: coa.account_name,
        amount,
        category,
      });
    }
  }

  const allItems = Array.from(accountMap.values()).filter((item) => Math.abs(item.amount) > 0.005);

  const operatingItems = allItems.filter((i) => i.category === "Operating").sort((a, b) => a.account_number.localeCompare(b.account_number));
  const investingItems = allItems.filter((i) => i.category === "Investing").sort((a, b) => a.account_number.localeCompare(b.account_number));
  const financingItems = allItems.filter((i) => i.category === "Financing").sort((a, b) => a.account_number.localeCompare(b.account_number));

  const totalOperating = operatingItems.reduce((s, i) => s + i.amount, 0);
  const totalInvesting = investingItems.reduce((s, i) => s + i.amount, 0);
  const totalFinancing = financingItems.reduce((s, i) => s + i.amount, 0);
  const netChange = totalOperating + totalInvesting + totalFinancing;

  const sections = [
    { title: "Operating Activities", subtitle: "Revenue, expenses, and working capital", items: operatingItems, total: totalOperating, color: "text-success" },
    { title: "Investing Activities", subtitle: "Asset purchases and disposals", items: investingItems, total: totalInvesting, color: "text-info-text" },
    { title: "Financing Activities", subtitle: "Debt and equity transactions", items: financingItems, total: totalFinancing, color: "text-primary" },
  ];

  return (
    <div>
      <div className="mb-6">
        <Link to="/accounting/reports" className="mb-2 inline-block text-xs font-medium text-primary hover:underline">
          &larr; Back to Reports
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Cash Flow Statement</h1>
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
      ) : allItems.length === 0 ? (
        <EmptyState title="No cash flow data" description="Post journal entries to generate the cash flow statement" />
      ) : (
        <div className="rounded-lg border border-border bg-card">
          {sections.map((section) => (
            <div key={section.title} className="border-b border-border p-4 last:border-b-0">
              <h2 className={`mb-1 text-sm font-semibold uppercase tracking-wider ${section.color}`}>{section.title}</h2>
              <p className="mb-3 text-xs text-muted">{section.subtitle}</p>
              {section.items.length === 0 ? (
                <p className="text-xs text-muted">No activity</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {section.items.map((item) => (
                      <tr key={item.account_number} className="border-b border-border/30">
                        <td className="py-2">
                          <span className="font-mono text-xs text-muted">{item.account_number}</span>
                          <span className="ml-2">{item.account_name}</span>
                        </td>
                        <td className="py-2 text-right font-medium">
                          <span className={item.amount < 0 ? "text-destructive" : ""}>
                            {item.amount < 0 ? "(" : ""}
                            {formatCurrency(Math.abs(item.amount))}
                            {item.amount < 0 ? ")" : ""}
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="font-semibold">
                      <td className="py-2">Net Cash from {section.title.replace(" Activities", "")}</td>
                      <td className="py-2 text-right">
                        <span className={section.total < 0 ? "text-destructive" : ""}>
                          {section.total < 0 ? "(" : ""}
                          {formatCurrency(Math.abs(section.total))}
                          {section.total < 0 ? ")" : ""}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          ))}

          {/* Net Change */}
          <div className="p-4">
            <div className="flex items-center justify-between text-base font-bold">
              <span>Net Increase (Decrease) in Cash</span>
              <span className={netChange >= 0 ? "text-success" : "text-destructive"}>
                {netChange < 0 ? "(" : ""}
                {formatCurrency(Math.abs(netChange))}
                {netChange < 0 ? ")" : ""}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

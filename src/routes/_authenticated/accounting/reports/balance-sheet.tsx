import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/accounting/reports/balance-sheet")({
  component: BalanceSheet,
});

interface BSRow {
  account_id: string | null;
  account_number: string | null;
  account_name: string | null;
  account_type: string | null;
  balance: number;
}

const SECTION_ORDER = ["Asset", "Liability", "Equity"] as const;

const SECTION_COLORS: Record<string, string> = {
  Asset: "text-info-text",
  Liability: "text-destructive-text",
  Equity: "text-foreground",
};

function BalanceSheet() {
  const activeEntityId = useEntityStore((s) => s.activeEntityId);

  const { data: rows = [], isLoading } = useQuery<BSRow[]>({
    queryKey: ["balance-sheet-report", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("balance_sheet_report").select("*").order("account_type").order("account_number");
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const sections = SECTION_ORDER.map((type) => {
    const accounts = rows.filter((r) => r.account_type === type);
    const total = accounts.reduce((s, a) => s + (a.balance ?? 0), 0);
    return { type, accounts, total };
  });

  const totalAssets = sections.find((s) => s.type === "Asset")?.total ?? 0;
  const totalLiabilitiesEquity =
    (sections.find((s) => s.type === "Liability")?.total ?? 0) +
    (sections.find((s) => s.type === "Equity")?.total ?? 0);

  return (
    <div>
      <div className="mb-6">
        <Link to="/accounting/reports" className="mb-2 inline-block text-xs font-medium text-primary hover:underline">
          &larr; Back to Reports
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Balance Sheet</h1>
        <p className="mt-0.5 text-sm text-muted">As of today · Posted journal entries only</p>
      </div>

      {isLoading ? (
        <TableSkeleton rows={10} cols={3} />
      ) : rows.length === 0 ? (
        <EmptyState title="No data" description="Post journal entries with Asset, Liability, or Equity accounts" />
      ) : (
        <div className="rounded-lg border border-border bg-card">
          {sections.map((section) => (
            <div key={section.type} className="border-b border-border p-4 last:border-b-0">
              <h2 className={`mb-3 text-sm font-semibold uppercase tracking-wider ${SECTION_COLORS[section.type]}`}>
                {section.type === "Asset" ? "Assets" : section.type === "Liability" ? "Liabilities" : "Equity"}
              </h2>
              {section.accounts.length === 0 ? (
                <p className="text-xs text-muted">No {section.type.toLowerCase()} accounts with balances</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {section.accounts.map((a) => (
                      <tr key={a.account_id ?? a.account_number} className="border-b border-border/30">
                        <td className="py-2">
                          <span className="font-mono text-xs text-muted">{a.account_number}</span>
                          <span className="ml-2">{a.account_name}</span>
                        </td>
                        <td className="py-2 text-right font-medium">{formatCurrency(a.balance)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold">
                      <td className="py-2">
                        Total{" "}
                        {section.type === "Asset" ? "Assets" : section.type === "Liability" ? "Liabilities" : "Equity"}
                      </td>
                      <td className="py-2 text-right">{formatCurrency(section.total)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          ))}

          {/* Balance Check */}
          <div className="p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">Total Assets</span>
              <span className="font-bold">{formatCurrency(totalAssets)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="font-semibold">Total Liabilities + Equity</span>
              <span className="font-bold">{formatCurrency(totalLiabilitiesEquity)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm">
              <span className="font-semibold">
                {Math.abs(totalAssets - totalLiabilitiesEquity) < 0.01 ? "Balanced" : "Difference"}
              </span>
              <span
                className={`font-bold ${Math.abs(totalAssets - totalLiabilitiesEquity) < 0.01 ? "text-success" : "text-destructive"}`}
              >
                {Math.abs(totalAssets - totalLiabilitiesEquity) < 0.01
                  ? "OK"
                  : formatCurrency(Math.abs(totalAssets - totalLiabilitiesEquity))}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

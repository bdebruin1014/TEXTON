import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { DealSheetRecord } from "@/components/deal-sheet/DealSheetForm";
import { calculateDealSheet, type DealSheetInputs } from "@/lib/deal-engine";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatPercent } from "@/lib/utils";

const VERDICT_COLOR: Record<string, string> = {
  STRONG: "text-[#3D7A4E]",
  GOOD: "text-[#4A8C5E]",
  ACCEPTABLE: "text-[#4A8C5E]",
  MARGINAL: "text-[#C4841D]",
  CAUTION: "text-[#C4841D]",
  "NO GO": "text-[#B84040]",
  OVERPAYING: "text-[#B84040]",
};

const VERDICT_DOT: Record<string, string> = {
  STRONG: "bg-[#3D7A4E]",
  GOOD: "bg-[#4A8C5E]",
  ACCEPTABLE: "bg-[#4A8C5E]",
  MARGINAL: "bg-[#C4841D]",
  CAUTION: "bg-[#C4841D]",
  "NO GO": "bg-[#B84040]",
  OVERPAYING: "bg-[#B84040]",
};

function toInputs(sheet: DealSheetRecord): DealSheetInputs {
  return {
    lot_purchase_price: sheet.lot_purchase_price ?? 0,
    closing_costs: sheet.closing_costs ?? 0,
    acquisition_commission: sheet.acquisition_commission ?? 0,
    acquisition_bonus: sheet.acquisition_bonus ?? 0,
    other_lot_costs: sheet.other_lot_costs ?? 0,
    sticks_bricks: sheet.sticks_bricks ?? 0,
    upgrades: sheet.upgrades ?? 0,
    soft_costs: sheet.soft_costs ?? 0,
    land_prep: sheet.land_prep ?? 0,
    site_specific: sheet.site_specific ?? 0,
    site_work_total: sheet.site_work_total ?? 0,
    other_site_costs: sheet.other_site_costs ?? 0,
    is_rch_related_owner: sheet.is_rch_related_owner ?? true,
    asset_sales_price: sheet.asset_sales_price ?? 0,
    selling_cost_rate: sheet.selling_cost_rate ?? 0.085,
    selling_concessions: sheet.selling_concessions ?? 0,
    ltc_ratio: sheet.ltc_ratio ?? 0.85,
    interest_rate: sheet.interest_rate ?? 0.1,
    cost_of_capital: sheet.cost_of_capital ?? 0.16,
    project_duration_days: sheet.project_duration_days ?? 120,
  };
}

interface ScenarioComparisonProps {
  sheets: DealSheetRecord[];
  queryKey: unknown[];
}

export function ScenarioComparison({ sheets, queryKey }: ScenarioComparisonProps) {
  const queryClient = useQueryClient();

  const results = useMemo(() => sheets.map((s) => ({ sheet: s, outputs: calculateDealSheet(toInputs(s)) })), [sheets]);

  const setPrimary = useMutation({
    mutationFn: async (sheetId: string) => {
      const sheet = sheets.find((s) => s.id === sheetId);
      if (!sheet?.opportunity_id) return;
      // Clear existing primary
      await supabase
        .from("deal_sheets")
        .update({ is_primary: false })
        .eq("opportunity_id", sheet.opportunity_id)
        .eq("is_primary", true);
      // Set new primary
      const { error } = await supabase.from("deal_sheets").update({ is_primary: true }).eq("id", sheetId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const rows: { label: string; values: (r: (typeof results)[number]) => string; bold?: boolean }[] = [
    { label: "Floor Plan", values: (r) => (r.sheet.floor_plan_id ? "Selected" : "—") },
    { label: "S&B", values: (r) => formatCurrency(r.sheet.sticks_bricks) },
    { label: "Upgrades", values: (r) => formatCurrency(r.sheet.upgrades) },
    { label: "Total Cost", values: (r) => formatCurrency(r.outputs.total_project_cost), bold: true },
    { label: "ASP", values: (r) => formatCurrency(r.sheet.asset_sales_price) },
    { label: "Net Profit", values: (r) => formatCurrency(r.outputs.net_profit), bold: true },
    { label: "Equity Required", values: (r) => formatCurrency(r.outputs.equity_required) },
    { label: "Loan Amount", values: (r) => formatCurrency(r.outputs.loan_amount) },
  ];

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Metric</th>
              {results.map(({ sheet }) => (
                <th key={sheet.id} className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {sheet.is_primary && <span className="text-[#C4841D]">&#9733;</span>}
                    <span className="text-xs font-semibold text-foreground">
                      {sheet.scenario_name || sheet.name || `Scenario ${sheet.scenario_number ?? ""}`}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Verdict rows */}
            <tr className="border-b border-border bg-accent/30">
              <td className="px-4 py-2 text-xs font-medium text-muted">NPM Verdict</td>
              {results.map(({ sheet, outputs }) => (
                <td key={sheet.id} className="px-4 py-2 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${VERDICT_DOT[outputs.profit_verdict] ?? "bg-gray-400"}`}
                    />
                    <span className={`text-xs font-bold ${VERDICT_COLOR[outputs.profit_verdict] ?? "text-gray-500"}`}>
                      {outputs.profit_verdict}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted">{formatPercent(outputs.net_profit_margin)}</span>
                </td>
              ))}
            </tr>
            <tr className="border-b border-border bg-accent/30">
              <td className="px-4 py-2 text-xs font-medium text-muted">LCR Verdict</td>
              {results.map(({ sheet, outputs }) => (
                <td key={sheet.id} className="px-4 py-2 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${VERDICT_DOT[outputs.land_verdict] ?? "bg-gray-400"}`}
                    />
                    <span className={`text-xs font-bold ${VERDICT_COLOR[outputs.land_verdict] ?? "text-gray-500"}`}>
                      {outputs.land_verdict}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted">{formatPercent(outputs.land_cost_ratio)}</span>
                </td>
              ))}
            </tr>

            {/* Data rows */}
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-border/50">
                <td className="px-4 py-2 text-xs text-muted">{row.label}</td>
                {results.map((r) => (
                  <td
                    key={r.sheet.id}
                    className={`px-4 py-2 text-center font-mono text-xs ${row.bold ? "font-semibold text-foreground" : "text-foreground"}`}
                  >
                    {row.values(r)}
                  </td>
                ))}
              </tr>
            ))}

            {/* Set Primary row */}
            <tr>
              <td className="px-4 py-3 text-xs text-muted">Actions</td>
              {results.map(({ sheet }) => (
                <td key={sheet.id} className="px-4 py-3 text-center">
                  {sheet.is_primary ? (
                    <span className="text-[10px] font-medium text-[#C4841D]">Primary</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPrimary.mutate(sheet.id)}
                      disabled={setPrimary.isPending}
                      className="rounded bg-accent px-2 py-1 text-[10px] font-medium text-foreground transition-colors hover:bg-accent/80"
                    >
                      Set Primary
                    </button>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

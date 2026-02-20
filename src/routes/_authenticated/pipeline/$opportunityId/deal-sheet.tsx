import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { useCallback, useMemo, useState } from "react";
import { AutoSaveField } from "@/components/forms/AutoSaveField";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { PercentageInput } from "@/components/forms/PercentageInput";
import { FIXED_PER_HOUSE_FEES } from "@/lib/constants";
import { calculateDealSheet, type DealSheetInputs } from "@/lib/deal-engine";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatPercent } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pipeline/$opportunityId/deal-sheet")({
  component: DealSheet,
});

interface DealAnalysis {
  id: string;
  opportunity_id: string;
  version: number;
  purchase_price: number;
  site_work: number;
  base_build_cost: number;
  upgrade_package: number;
  asp: number;
  concessions: number;
  duration_months: number;
  interest_rate: number;
  ltc_ratio: number;
  notes: string | null;
  created_at: string;
}

function DealSheet() {
  const { opportunityId } = Route.useParams();
  const queryClient = useQueryClient();
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  const { data: analyses = [] } = useQuery<DealAnalysis[]>({
    queryKey: ["deal-analyses", opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_analyses")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("version", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const activeAnalysis = useMemo(() => {
    if (selectedVersion) return analyses.find((a) => a.id === selectedVersion) ?? analyses[0];
    return analyses[0];
  }, [analyses, selectedVersion]);

  const createAnalysis = useMutation({
    mutationFn: async () => {
      const nextVersion = (analyses[0]?.version ?? 0) + 1;
      const { data, error } = await supabase
        .from("deal_analyses")
        .insert({
          opportunity_id: opportunityId,
          version: nextVersion,
          purchase_price: 0,
          site_work: 0,
          base_build_cost: 0,
          upgrade_package: 0,
          asp: 0,
          concessions: 0,
          duration_months: 8,
          interest_rate: 0.1,
          ltc_ratio: 0.75,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["deal-analyses", opportunityId] });
      setSelectedVersion(data.id);
    },
  });

  const updateAnalysis = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      if (!activeAnalysis) return;
      const { error } = await supabase.from("deal_analyses").update(updates).eq("id", activeAnalysis.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deal-analyses", opportunityId] }),
  });

  const save = useCallback(
    (field: string) => async (value: string | number) => {
      await updateAnalysis.mutateAsync({ [field]: value });
    },
    [updateAnalysis],
  );

  const dealOutputs = useMemo(() => {
    if (!activeAnalysis) return null;
    const inputs: DealSheetInputs = {
      lot_purchase_price: activeAnalysis.purchase_price ?? 0,
      closing_costs: 0,
      sticks_bricks: activeAnalysis.base_build_cost ?? 0,
      upgrades: activeAnalysis.upgrade_package ?? 0,
      soft_costs: 0,
      land_prep: 0,
      site_specific: 0,
      site_work_total: activeAnalysis.site_work ?? 0,
      is_rch_related_owner: true,
      asset_sales_price: activeAnalysis.asp ?? 0,
      selling_cost_rate: 0.085,
      selling_concessions: activeAnalysis.concessions ?? 0,
      ltc_ratio: activeAnalysis.ltc_ratio ?? 0.85,
      interest_rate: activeAnalysis.interest_rate ?? 0.10,
      cost_of_capital: 0.16,
      project_duration_days: (activeAnalysis.duration_months ?? 4) * 30,
    };
    return calculateDealSheet(inputs);
  }, [activeAnalysis]);

  if (!activeAnalysis) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Deal Sheet</h2>
          <button
            type="button"
            onClick={() => createAnalysis.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
          >
            + New Analysis
          </button>
        </div>
        <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-24">
          <p className="text-sm text-muted">No deal analysis yet. Create one to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">Deal Sheet</h2>
          {analyses.length > 1 && (
            <select
              value={activeAnalysis.id}
              onChange={(e) => setSelectedVersion(e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
            >
              {analyses.map((a) => (
                <option key={a.id} value={a.id}>
                  Version {a.version}
                </option>
              ))}
            </select>
          )}
        </div>
        <button
          type="button"
          onClick={() => createAnalysis.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + New Analysis
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Inputs Column */}
        <div className="space-y-6">
          {/* Deal Inputs */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Deal Inputs</h3>
            <div className="space-y-4">
              <CurrencyInput
                label="Purchase Price (Land)"
                value={activeAnalysis.purchase_price}
                onSave={save("purchase_price")}
              />
              <CurrencyInput label="Site Work" value={activeAnalysis.site_work} onSave={save("site_work")} />
              <CurrencyInput
                label="Base Build Cost"
                value={activeAnalysis.base_build_cost}
                onSave={save("base_build_cost")}
              />
              <CurrencyInput
                label="Upgrade Package"
                value={activeAnalysis.upgrade_package}
                onSave={save("upgrade_package")}
              />
              <CurrencyInput label="Anticipated Sales Price" value={activeAnalysis.asp} onSave={save("asp")} />
              <CurrencyInput label="Concessions" value={activeAnalysis.concessions} onSave={save("concessions")} />
            </div>
          </div>

          {/* Financing */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Financing</h3>
            <div className="space-y-4">
              <AutoSaveField
                label="Duration (months)"
                value={activeAnalysis.duration_months}
                onSave={save("duration_months")}
                type="number"
              />
              <PercentageInput
                label="Interest Rate"
                value={activeAnalysis.interest_rate}
                onSave={save("interest_rate")}
              />
              <PercentageInput label="LTC Ratio" value={activeAnalysis.ltc_ratio} onSave={save("ltc_ratio")} />
            </div>
          </div>

          {/* Fixed Costs */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
              Fixed Per-House Fees
            </h3>
            <div className="space-y-2">
              {Object.entries(FIXED_PER_HOUSE_FEES).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <span className="text-sm text-muted">
                    {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                  <span className="text-sm font-medium text-foreground">{formatCurrency(val)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Outputs Column */}
        {dealOutputs && (
          <div className="space-y-6">
            {/* Verdicts */}
            <div className="grid grid-cols-2 gap-4">
              <VerdictCard label="Net Profit Margin" value={formatPercent(dealOutputs.net_profit_margin)} verdict={dealOutputs.profit_verdict} />
              <VerdictCard label="Land Cost Ratio" value={formatPercent(dealOutputs.land_cost_ratio)} verdict={dealOutputs.land_verdict} />
            </div>

            {/* Cost Summary */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Cost Summary</h3>
              <div className="space-y-2">
                <OutputRow label="Total Lot Basis" value={formatCurrency(dealOutputs.total_lot_basis)} />
                <OutputRow label="Sections 1-5" value={formatCurrency(dealOutputs.sections_1_to_5)} />
                <OutputRow label="Builder Fee (S6)" value={formatCurrency(dealOutputs.builder_fee)} />
                <OutputRow label="Contingency (S7)" value={formatCurrency(dealOutputs.contingency)} />
                <OutputRow label="Total Contract Cost" value={formatCurrency(dealOutputs.total_contract_cost)} />
                <OutputRow label="Fixed Per-House" value={formatCurrency(dealOutputs.total_fixed_per_house)} />
                <div className="border-t border-border pt-2">
                  <OutputRow label="Total Project Cost" value={formatCurrency(dealOutputs.total_project_cost)} bold />
                </div>
              </div>
            </div>

            {/* Financing */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Financing</h3>
              <div className="space-y-2">
                <OutputRow label="Loan Amount" value={formatCurrency(dealOutputs.loan_amount)} />
                <OutputRow label="Equity Required" value={formatCurrency(dealOutputs.equity_required)} />
                <OutputRow label="Interest Cost" value={formatCurrency(dealOutputs.interest_cost)} />
                <OutputRow label="Cost of Capital" value={formatCurrency(dealOutputs.cost_of_capital_amount)} />
                <div className="border-t border-border pt-2">
                  <OutputRow label="Total All-In" value={formatCurrency(dealOutputs.total_all_in)} bold />
                </div>
              </div>
            </div>

            {/* Returns */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Returns</h3>
              <div className="space-y-2">
                <OutputRow label="Selling Costs" value={formatCurrency(dealOutputs.selling_costs)} />
                <OutputRow label="Net Proceeds" value={formatCurrency(dealOutputs.net_proceeds)} />
                <div className="border-t border-border pt-2">
                  <OutputRow label="Net Profit" value={formatCurrency(dealOutputs.net_profit)} bold />
                  <OutputRow label="Net Profit Margin" value={formatPercent(dealOutputs.net_profit_margin)} />
                  <OutputRow label="Land Cost Ratio" value={formatPercent(dealOutputs.land_cost_ratio)} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OutputRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-sm text-muted">{label}</span>
      <span className={`text-sm ${bold ? "font-semibold text-foreground" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

const VERDICT_COLORS: Record<string, string> = {
  STRONG: "#4A7A5B",
  GOOD: "#48BB78",
  ACCEPTABLE: "#48BB78",
  MARGINAL: "#C4841D",
  CAUTION: "#C4841D",
  "NO GO": "#B84040",
  OVERPAYING: "#B84040",
};

function VerdictCard({ label, value, verdict }: { label: string; value: string; verdict: string }) {
  const color = VERDICT_COLORS[verdict] ?? "#6B7280";
  return (
    <div className="rounded-lg border-2 bg-card p-4 text-center" style={{ borderColor: color }}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold" style={{ color }}>{verdict}</p>
      <p className="mt-0.5 text-sm text-muted">{value}</p>
    </div>
  );
}

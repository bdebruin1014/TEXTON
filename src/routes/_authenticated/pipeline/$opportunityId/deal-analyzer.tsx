import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { useCallback, useMemo, useState } from "react";
import { AutoSaveField } from "@/components/forms/AutoSaveField";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { PercentageInput } from "@/components/forms/PercentageInput";
import { FEE_DEFAULTS } from "@/lib/constants";
import { calculateDeal, type DealInputs } from "@/lib/deal-engine";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatPercent } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pipeline/$opportunityId/deal-analyzer")({
  component: DealAnalyzer,
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

function DealAnalyzer() {
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
    const inputs: DealInputs = {
      purchase_price: activeAnalysis.purchase_price ?? 0,
      site_work: activeAnalysis.site_work ?? 0,
      base_build_cost: activeAnalysis.base_build_cost ?? 0,
      upgrade_package: activeAnalysis.upgrade_package ?? 0,
      asp: activeAnalysis.asp ?? 0,
      concessions: activeAnalysis.concessions ?? 0,
      duration_months: activeAnalysis.duration_months ?? 8,
      interest_rate: activeAnalysis.interest_rate ?? 0.1,
      ltc_ratio: activeAnalysis.ltc_ratio ?? 0.75,
    };
    return calculateDeal(inputs);
  }, [activeAnalysis]);

  if (!activeAnalysis) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Deal Analyzer</h2>
          <button
            type="button"
            onClick={() => createAnalysis.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
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
          <h2 className="text-lg font-semibold text-foreground">Deal Analyzer</h2>
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
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
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
              Fixed Costs (Org Defaults)
            </h3>
            <div className="space-y-2">
              {Object.entries(FEE_DEFAULTS).map(([key, val]) => (
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
            {/* Verdict */}
            <div className="rounded-lg border-2 bg-card p-6" style={{ borderColor: dealOutputs.verdict_color }}>
              <div className="text-center">
                <p className="text-sm font-semibold uppercase tracking-wider text-muted">Verdict</p>
                <p className="mt-1 text-3xl font-bold" style={{ color: dealOutputs.verdict_color }}>
                  {dealOutputs.verdict}
                </p>
                <p className="mt-1 text-sm text-muted">Annualized ROI: {formatPercent(dealOutputs.annualized_roi)}</p>
              </div>
            </div>

            {/* Cost Summary */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Cost Summary</h3>
              <div className="space-y-2">
                <OutputRow label="Land Cost" value={formatCurrency(dealOutputs.land_cost)} />
                <OutputRow label="Hard Costs" value={formatCurrency(dealOutputs.hard_costs)} />
                <OutputRow label="Fixed Costs" value={formatCurrency(dealOutputs.fixed_costs)} />
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
                <OutputRow label="Interest Expense" value={formatCurrency(dealOutputs.interest_expense)} />
              </div>
            </div>

            {/* Returns */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Returns</h3>
              <div className="space-y-2">
                <OutputRow label="Gross Revenue" value={formatCurrency(dealOutputs.gross_revenue)} />
                <OutputRow label="Net Revenue" value={formatCurrency(dealOutputs.net_revenue)} />
                <OutputRow label="Gross Profit" value={formatCurrency(dealOutputs.gross_profit)} />
                <OutputRow label="Net Profit" value={formatCurrency(dealOutputs.net_profit)} bold />
                <div className="border-t border-border pt-2">
                  <OutputRow label="Gross Margin" value={formatPercent(dealOutputs.gross_margin)} />
                  <OutputRow label="Net Margin" value={formatPercent(dealOutputs.net_margin)} />
                  <OutputRow label="ROI (on Equity)" value={formatPercent(dealOutputs.roi)} />
                  <OutputRow label="Annualized ROI" value={formatPercent(dealOutputs.annualized_roi)} bold />
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

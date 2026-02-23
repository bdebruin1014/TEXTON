import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { PercentageInput } from "@/components/forms/PercentageInput";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { calculateLotPurchaseProforma } from "@/lib/lot-purchase-proforma-engine";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatPercent } from "@/lib/utils";

interface LotPurchaseRecord {
  id: string;
  name: string;
  opportunity_id: string | null;
  scenario_number: number;
  scenario_name: string | null;
  is_primary: boolean;
  total_lots: number;
  takedown_tranches: number;
  lots_per_tranche: number;
  lot_cost_per_lot: number;
  deposit_per_lot: number;
  vertical_cost: number;
  upgrades: number;
  municipality_soft_costs: number;
  fixed_per_house_fees: number;
  asp_per_home: number;
  selling_cost_pct: number;
  seller_concession: number;
  ltc_ratio: number;
  interest_rate: number;
  project_duration_days: number;
  absorption_homes_per_month: number;
}

const DEFAULTS = {
  total_lots: 30,
  takedown_tranches: 3,
  lots_per_tranche: 10,
  lot_cost_per_lot: 65000,
  deposit_per_lot: 5000,
  vertical_cost: 185000,
  upgrades: 0,
  municipality_soft_costs: 12000,
  fixed_per_house_fees: 35900,
  asp_per_home: 375000,
  selling_cost_pct: 0.085,
  seller_concession: 5000,
  ltc_ratio: 0.85,
  interest_rate: 0.1,
  project_duration_days: 120,
  absorption_homes_per_month: 3,
};

function NumericField({ label, value, onSave }: { label: string; value: number; onSave: (v: number) => Promise<void> }) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value) || 0;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSave(v);
      }, 800);
    },
    [onSave],
  );
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</span>
      <input
        type="number"
        defaultValue={value}
        onChange={handleChange}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
      />
    </label>
  );
}

function ResultRow({
  label,
  value,
  bold,
  highlight,
}: { label: string; value: string; bold?: boolean; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={`text-muted ${bold ? "font-semibold" : ""}`}>{label}</span>
      <span className={`font-mono ${bold ? "font-bold" : ""} ${highlight ? "text-green-600" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

interface LotPurchaseFormProps {
  proforma: LotPurchaseRecord;
  queryKey: unknown[];
}

function LotPurchaseForm({ proforma: p, queryKey }: LotPurchaseFormProps) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("lot_purchase_proformas").update(updates).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const save = useCallback(
    (field: string) => async (value: number) => {
      await updateMutation.mutateAsync({ [field]: value });
    },
    [updateMutation],
  );

  const saveNumeric = useCallback(
    (field: string) => async (v: number) => {
      await updateMutation.mutateAsync({ [field]: v });
    },
    [updateMutation],
  );

  const inputs = useMemo(
    () => ({
      total_lots: p.total_lots ?? DEFAULTS.total_lots,
      takedown_tranches: p.takedown_tranches ?? DEFAULTS.takedown_tranches,
      lots_per_tranche: p.lots_per_tranche ?? DEFAULTS.lots_per_tranche,
      lot_cost_per_lot: p.lot_cost_per_lot ?? DEFAULTS.lot_cost_per_lot,
      deposit_per_lot: p.deposit_per_lot ?? DEFAULTS.deposit_per_lot,
      vertical_cost: p.vertical_cost ?? DEFAULTS.vertical_cost,
      upgrades: p.upgrades ?? DEFAULTS.upgrades,
      municipality_soft_costs: p.municipality_soft_costs ?? DEFAULTS.municipality_soft_costs,
      fixed_per_house_fees: p.fixed_per_house_fees ?? DEFAULTS.fixed_per_house_fees,
      asp_per_home: p.asp_per_home ?? DEFAULTS.asp_per_home,
      selling_cost_pct: p.selling_cost_pct ?? DEFAULTS.selling_cost_pct,
      seller_concession: p.seller_concession ?? DEFAULTS.seller_concession,
      ltc_ratio: p.ltc_ratio ?? DEFAULTS.ltc_ratio,
      interest_rate: p.interest_rate ?? DEFAULTS.interest_rate,
      project_duration_days: p.project_duration_days ?? DEFAULTS.project_duration_days,
      absorption_homes_per_month: p.absorption_homes_per_month ?? DEFAULTS.absorption_homes_per_month,
    }),
    [p],
  );

  const results = useMemo(() => calculateLotPurchaseProforma(inputs), [inputs]);
  const { tranches, perHome, project } = results;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      {/* LEFT: Inputs (2/3 width) */}
      <div className="space-y-6 xl:col-span-2">
        {/* Lot Purchase Agreement */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Lot Purchase Agreement</h3>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
            <NumericField label="Total Lots" value={inputs.total_lots} onSave={saveNumeric("total_lots")} />
            <NumericField
              label="Takedown Tranches"
              value={inputs.takedown_tranches}
              onSave={saveNumeric("takedown_tranches")}
            />
            <NumericField
              label="Lots per Tranche"
              value={inputs.lots_per_tranche}
              onSave={saveNumeric("lots_per_tranche")}
            />
            <CurrencyInput label="Lot Cost / Lot" value={p.lot_cost_per_lot} onSave={save("lot_cost_per_lot")} />
            <CurrencyInput label="Deposit / Lot" value={p.deposit_per_lot} onSave={save("deposit_per_lot")} />
          </div>
        </div>

        {/* Per-Home Costs */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Per-Home Costs</h3>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
            <CurrencyInput label="Vertical Cost" value={p.vertical_cost} onSave={save("vertical_cost")} />
            <CurrencyInput label="Upgrades" value={p.upgrades} onSave={save("upgrades")} />
            <CurrencyInput
              label="Municipality Soft Costs"
              value={p.municipality_soft_costs}
              onSave={save("municipality_soft_costs")}
            />
            <CurrencyInput
              label="Fixed Per-House Fees"
              value={p.fixed_per_house_fees}
              onSave={save("fixed_per_house_fees")}
            />
            <CurrencyInput label="ASP / Home" value={p.asp_per_home} onSave={save("asp_per_home")} />
            <PercentageInput label="Selling Cost %" value={p.selling_cost_pct} onSave={save("selling_cost_pct")} />
            <CurrencyInput
              label="Seller Concession"
              value={p.seller_concession}
              onSave={save("seller_concession")}
            />
          </div>
        </div>

        {/* Financing & Absorption */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Financing & Absorption</h3>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
            <PercentageInput label="LTC Ratio" value={p.ltc_ratio} onSave={save("ltc_ratio")} />
            <PercentageInput label="Interest Rate" value={p.interest_rate} onSave={save("interest_rate")} />
            <NumericField
              label="Build Duration (days)"
              value={inputs.project_duration_days}
              onSave={saveNumeric("project_duration_days")}
            />
            <NumericField
              label="Homes Started / Month"
              value={inputs.absorption_homes_per_month}
              onSave={saveNumeric("absorption_homes_per_month")}
            />
          </div>
        </div>

        {/* Takedown Schedule */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Takedown Schedule</h3>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50">
                  <th className="px-3 py-2 text-left font-medium text-muted">Tranche</th>
                  <th className="px-3 py-2 text-right font-medium text-muted">Lots</th>
                  <th className="px-3 py-2 text-right font-medium text-muted">Price / Lot</th>
                  <th className="px-3 py-2 text-right font-medium text-muted">Total Cost</th>
                  <th className="px-3 py-2 text-right font-medium text-muted">Deposit</th>
                </tr>
              </thead>
              <tbody>
                {tranches.map((t) => (
                  <tr key={t.tranche} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2 font-medium text-foreground">Tranche {t.tranche}</td>
                    <td className="px-3 py-2 text-right font-mono text-foreground">{t.lots}</td>
                    <td className="px-3 py-2 text-right font-mono text-foreground">
                      {formatCurrency(p.lot_cost_per_lot)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-foreground">{formatCurrency(t.totalCost)}</td>
                    <td className="px-3 py-2 text-right font-mono text-foreground">{formatCurrency(t.deposit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RIGHT: Results (1/3 width, sticky) */}
      <div className="xl:sticky xl:top-4 xl:self-start">
        <div className="space-y-4">
          {/* Per-Home Economics */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Per-Home Economics</h3>
            <div className="space-y-1">
              <ResultRow label="Lot Cost" value={formatCurrency(p.lot_cost_per_lot)} />
              <ResultRow label="Vertical Cost" value={formatCurrency(p.vertical_cost)} />
              <ResultRow label="Upgrades" value={formatCurrency(p.upgrades)} />
              <ResultRow label="Soft Costs" value={formatCurrency(p.municipality_soft_costs)} />
              <ResultRow label="Fixed Fees" value={formatCurrency(p.fixed_per_house_fees)} />
              <div className="border-t border-border pt-1.5">
                <ResultRow label="Hard Cost Subtotal" value={formatCurrency(perHome.totalCostPerHome)} bold />
              </div>
              <ResultRow label="Selling Costs" value={formatCurrency(perHome.sellingCosts)} />
              <ResultRow label="Concession" value={formatCurrency(p.seller_concession)} />
              <ResultRow label="Construction Interest" value={formatCurrency(perHome.constructionInterest)} />
              <div className="border-t border-border pt-1.5">
                <ResultRow label="All-In Cost / Home" value={formatCurrency(perHome.totalAllInCost)} bold />
              </div>
              <div className="border-t border-border pt-1.5">
                <ResultRow label="ASP" value={formatCurrency(p.asp_per_home)} />
                <ResultRow
                  label="Profit / Home"
                  value={formatCurrency(perHome.profitPerHome)}
                  highlight={perHome.profitPerHome > 0}
                />
                <ResultRow label="Margin" value={formatPercent(perHome.marginPerHome)} />
              </div>
            </div>
          </div>

          {/* Project Summary */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Project Summary ({inputs.total_lots} homes)
            </h3>
            <div className="space-y-1">
              <ResultRow label="Total Equity" value={formatCurrency(project.totalEquity)} />
              <ResultRow label="Total Revenue" value={formatCurrency(project.totalRevenue)} />
              <ResultRow label="Total Costs" value={formatCurrency(project.totalCosts)} />
              <ResultRow
                label="Total Profit"
                value={formatCurrency(project.totalProfit)}
                bold
                highlight={project.totalProfit > 0}
              />
              <div className="border-t border-border pt-1.5">
                <ResultRow label="ROI on Equity" value={formatPercent(project.projectROI)} />
                <ResultRow label="Equity Multiple" value={`${project.equityMultiple.toFixed(2)}x`} />
                <ResultRow label="Sellout Period" value={`${project.selloutMonths} months`} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface LotPurchaseDealSheetProps {
  opportunityId: string;
}

export function LotPurchaseDealSheet({ opportunityId }: LotPurchaseDealSheetProps) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const queryKey = ["lot_purchase_proformas", opportunityId];

  const {
    data: proformas = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lot_purchase_proformas")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("scenario_number", { ascending: true });
      if (error) throw error;
      return data as LotPurchaseRecord[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("lot_purchase_proformas")
        .insert({
          opportunity_id: opportunityId,
          name: `Scenario ${proformas.length + 1}`,
          scenario_number: proformas.length + 1,
          scenario_name: `Scenario ${proformas.length + 1}`,
          is_primary: proformas.length === 0,
          ...DEFAULTS,
        })
        .select()
        .single();
      if (error) throw error;
      return data as LotPurchaseRecord;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey });
      setSelectedId(created.id);
    },
  });

  const active = useMemo(() => {
    if (proformas.length === 0) return null;
    if (selectedId) {
      const found = proformas.find((p) => p.id === selectedId);
      if (found) return found;
    }
    return proformas[0];
  }, [proformas, selectedId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <FormSkeleton fields={6} />
        <FormSkeleton fields={4} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        Failed to load lot purchase proformas. Please try again.
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Lot Purchase Deal Sheet</h2>
          <p className="text-sm text-muted">LPA takedown + per-home economics</p>
        </div>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || proformas.length >= 5}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {createMutation.isPending ? "Creating..." : "+ New Scenario"}
        </button>
      </div>

      {/* Scenario Tab Bar */}
      {proformas.length > 1 && (
        <div className="mb-6 flex items-center gap-1 border-b border-border">
          {proformas.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${active?.id === p.id ? "border-b-2 border-primary text-primary" : "text-muted hover:text-foreground"}`}
            >
              {p.scenario_name || p.name}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {active ? (
        <LotPurchaseForm key={active.id} proforma={active} queryKey={queryKey} />
      ) : (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-sm text-muted">No scenarios yet. Create one to start analyzing.</p>
        </div>
      )}
    </div>
  );
}

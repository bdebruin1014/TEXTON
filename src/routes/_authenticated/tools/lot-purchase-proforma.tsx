import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { PercentageInput } from "@/components/forms/PercentageInput";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatPercent } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tools/lot-purchase-proforma")({
  component: LotPurchaseProforma,
});

interface LotPurchaseRecord {
  id: string;
  name: string;
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

const DEFAULTS: Omit<LotPurchaseRecord, "id" | "name"> = {
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

function LotPurchaseProforma() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryKey = ["lot-purchase-proformas"];

  const { data: proformas = [], isLoading } = useQuery<LotPurchaseRecord[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lot_purchase_proformas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const active = useMemo(() => {
    if (selectedId) return proformas.find((p) => p.id === selectedId) ?? proformas[0];
    return proformas[0];
  }, [proformas, selectedId]);

  const createProforma = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("lot_purchase_proformas")
        .insert({ name: `Lot Purchase ${proformas.length + 1}`, ...DEFAULTS })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey });
      setSelectedId(data.id);
    },
  });

  if (isLoading) return <FormSkeleton />;

  if (!active) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Lot Purchase Proforma</h1>
            <p className="mt-0.5 text-sm text-muted">
              Lot purchase agreement model with takedown schedule and per-home economics
            </p>
          </div>
          <button
            type="button"
            onClick={() => createProforma.mutate()}
            className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
          >
            + New Proforma
          </button>
        </div>
        <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-24">
          <p className="text-sm text-muted">Create a new proforma to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Lot Purchase Proforma</h1>
            <p className="mt-0.5 text-sm text-muted">LPA takedown + per-home economics</p>
          </div>
          {proformas.length > 1 && (
            <select
              value={active.id}
              onChange={(e) => setSelectedId(e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
            >
              {proformas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <button
          type="button"
          onClick={() => createProforma.mutate()}
          className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + New Proforma
        </button>
      </div>

      <LotPurchaseForm proforma={active} queryKey={queryKey} />
    </div>
  );
}

function LotPurchaseForm({ proforma, queryKey }: { proforma: LotPurchaseRecord; queryKey: unknown[] }) {
  const queryClient = useQueryClient();
  const makeOnSave = useCallback(
    (field: string) => async (value: number) => {
      const { error } = await supabase
        .from("lot_purchase_proformas")
        .update({ [field]: value })
        .eq("id", proforma.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey });
    },
    [proforma.id, queryClient, queryKey],
  );

  const p = proforma;

  // Per-Home Economics
  const totalCostPerHome =
    p.lot_cost_per_lot + p.vertical_cost + p.upgrades + p.municipality_soft_costs + p.fixed_per_house_fees;
  const sellingCosts = p.asp_per_home * p.selling_cost_pct;
  const constructionInterest = totalCostPerHome * p.ltc_ratio * p.interest_rate * (p.project_duration_days / 360);
  const totalAllInCost = totalCostPerHome + sellingCosts + p.seller_concession + constructionInterest;
  const profitPerHome = p.asp_per_home - totalAllInCost;
  const marginPerHome = p.asp_per_home > 0 ? profitPerHome / p.asp_per_home : 0;

  // Project Totals
  const totalEquity = p.total_lots * totalCostPerHome * (1 - p.ltc_ratio);
  const totalRevenue = p.total_lots * p.asp_per_home;
  const totalCosts = p.total_lots * totalAllInCost;
  const totalProfit = totalRevenue - totalCosts;
  const projectROI = totalEquity > 0 ? totalProfit / totalEquity : 0;
  const equityMultiple = totalEquity > 0 ? (totalEquity + totalProfit) / totalEquity : 0;

  // Takedown Schedule
  const tranches = Array.from({ length: p.takedown_tranches }, (_, i) => {
    const lots = i < p.takedown_tranches - 1 ? p.lots_per_tranche : p.total_lots - p.lots_per_tranche * i;
    const totalCost = lots * p.lot_cost_per_lot;
    const deposit = lots * p.deposit_per_lot;
    return { tranche: i + 1, lots: Math.max(0, lots), totalCost, deposit };
  });

  // Absorption
  const selloutMonths = p.absorption_homes_per_month > 0 ? Math.ceil(p.total_lots / p.absorption_homes_per_month) : 0;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* LPA Assumptions */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Lot Purchase Agreement</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <NumericField label="Total Lots" value={p.total_lots} onSave={makeOnSave("total_lots")} />
            <NumericField
              label="Takedown Tranches"
              value={p.takedown_tranches}
              onSave={makeOnSave("takedown_tranches")}
            />
            <NumericField label="Lots / Tranche" value={p.lots_per_tranche} onSave={makeOnSave("lots_per_tranche")} />
            <CurrencyField label="Lot Cost / Lot" value={p.lot_cost_per_lot} onSave={makeOnSave("lot_cost_per_lot")} />
            <CurrencyField label="Deposit / Lot" value={p.deposit_per_lot} onSave={makeOnSave("deposit_per_lot")} />
          </div>
        </section>

        {/* Construction Costs */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Per-Home Costs</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <CurrencyField label="Vertical Cost" value={p.vertical_cost} onSave={makeOnSave("vertical_cost")} />
            <CurrencyField label="Upgrades" value={p.upgrades} onSave={makeOnSave("upgrades")} />
            <CurrencyField
              label="Municipality Soft Costs"
              value={p.municipality_soft_costs}
              onSave={makeOnSave("municipality_soft_costs")}
            />
            <CurrencyField
              label="Fixed Per-House Fees"
              value={p.fixed_per_house_fees}
              onSave={makeOnSave("fixed_per_house_fees")}
            />
            <CurrencyField label="ASP / Home" value={p.asp_per_home} onSave={makeOnSave("asp_per_home")} />
            <PctField label="Selling Cost %" value={p.selling_cost_pct} onSave={makeOnSave("selling_cost_pct")} />
            <CurrencyField
              label="Seller Concession"
              value={p.seller_concession}
              onSave={makeOnSave("seller_concession")}
            />
          </div>
        </section>

        {/* Financing */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Financing & Absorption</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <PctField label="LTC Ratio" value={p.ltc_ratio} onSave={makeOnSave("ltc_ratio")} />
            <PctField label="Interest Rate" value={p.interest_rate} onSave={makeOnSave("interest_rate")} />
            <NumericField
              label="Build Duration (days)"
              value={p.project_duration_days}
              onSave={makeOnSave("project_duration_days")}
            />
            <NumericField
              label="Homes Started / Mo"
              value={p.absorption_homes_per_month}
              onSave={makeOnSave("absorption_homes_per_month")}
            />
          </div>
        </section>

        {/* Takedown Schedule */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Takedown Schedule</h3>
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
        </section>
      </div>

      {/* Right — Results */}
      <div className="space-y-6">
        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Per-Home Economics</h3>
          <div className="space-y-1 text-xs">
            <ResultRow label="Lot Cost" value={formatCurrency(p.lot_cost_per_lot)} />
            <ResultRow label="Vertical Cost" value={formatCurrency(p.vertical_cost)} />
            <ResultRow label="Upgrades" value={formatCurrency(p.upgrades)} />
            <ResultRow label="Soft Costs" value={formatCurrency(p.municipality_soft_costs)} />
            <ResultRow label="Fixed Fees" value={formatCurrency(p.fixed_per_house_fees)} />
            <div className="border-t border-border pt-1">
              <ResultRow label="Hard Cost Subtotal" value={formatCurrency(totalCostPerHome)} bold />
            </div>
            <ResultRow label="Selling Costs" value={formatCurrency(sellingCosts)} />
            <ResultRow label="Concession" value={formatCurrency(p.seller_concession)} />
            <ResultRow label="Construction Interest" value={formatCurrency(constructionInterest)} />
            <div className="border-t border-border pt-1">
              <ResultRow label="All-In Cost / Home" value={formatCurrency(totalAllInCost)} bold />
            </div>
            <div className="mt-2 border-t border-border pt-2">
              <ResultRow label="ASP" value={formatCurrency(p.asp_per_home)} />
              <ResultRow label="Profit / Home" value={formatCurrency(profitPerHome)} highlight={profitPerHome > 0} />
              <ResultRow label="Margin" value={formatPercent(marginPerHome)} />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Project Summary ({p.total_lots} homes)</h3>
          <div className="space-y-1 text-xs">
            <ResultRow label="Total Equity" value={formatCurrency(totalEquity)} />
            <ResultRow label="Total Revenue" value={formatCurrency(totalRevenue)} />
            <ResultRow label="Total Costs" value={formatCurrency(totalCosts)} />
            <ResultRow label="Total Profit" value={formatCurrency(totalProfit)} bold highlight={totalProfit > 0} />
            <div className="mt-2 border-t border-border pt-2">
              <ResultRow label="ROI on Equity" value={formatPercent(projectROI)} />
              <ResultRow label="Equity Multiple" value={`${equityMultiple.toFixed(2)}x`} />
              <ResultRow label="Sellout Period" value={`${selloutMonths} months`} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ResultRow({
  label,
  value,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className={`text-muted ${bold ? "font-semibold" : ""}`}>{label}</span>
      <span className={`font-mono ${bold ? "font-bold" : ""} ${highlight ? "text-green-600" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

function NumericField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: number;
  onSave: (v: number) => Promise<void>;
}) {
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

function CurrencyField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: number;
  onSave: (v: number) => Promise<void>;
}) {
  return <CurrencyInput label={label} value={value} onSave={onSave} />;
}

function PctField({ label, value, onSave }: { label: string; value: number; onSave: (v: number) => Promise<void> }) {
  return <PercentageInput label={label} value={value} onSave={onSave} />;
}

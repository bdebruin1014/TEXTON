import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { PercentageInput } from "@/components/forms/PercentageInput";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { calculateCommunityProforma } from "@/lib/community-proforma-engine";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatPercent } from "@/lib/utils";

interface ProformaRecord {
  id: string;
  name: string;
  opportunity_id: string | null;
  scenario_number: number;
  scenario_name: string | null;
  is_primary: boolean;
  total_lots: number;
  land_value_per_lot: number;
  horizontal_dev_per_lot: number;
  ae_per_lot: number;
  amenity_package: number;
  monument_sign: number;
  carry_costs_per_lot: number;
  contingency_pct: number;
  cm_fee_per_lot: number;
  developer_fee_per_lot: number;
  lot_sales_price: number;
  bank_ltc: number;
  bank_interest_rate: number;
  lp_pref_return: number;
  lp_buyout_irr: number;
  home_sales_price: number;
  selling_costs_pct: number;
  seller_concession: number;
  vertical_cost: number;
  construction_interest_rate: number;
  construction_months: number;
  lp_accruing_return_rate: number;
  lp_investment_period_months: number;
  gp_split_pct: number;
}

const DEFAULTS = {
  total_lots: 50,
  land_value_per_lot: 25000,
  horizontal_dev_per_lot: 35000,
  ae_per_lot: 5000,
  amenity_package: 150000,
  monument_sign: 25000,
  carry_costs_per_lot: 2000,
  contingency_pct: 0.05,
  cm_fee_per_lot: 3000,
  developer_fee_per_lot: 5000,
  lot_sales_price: 85000,
  bank_ltc: 0.65,
  bank_interest_rate: 0.08,
  lp_pref_return: 0.08,
  lp_buyout_irr: 0.15,
  home_sales_price: 350000,
  selling_costs_pct: 0.085,
  seller_concession: 5000,
  vertical_cost: 180000,
  construction_interest_rate: 0.1,
  construction_months: 6,
  lp_accruing_return_rate: 0.12,
  lp_investment_period_months: 24,
  gp_split_pct: 0.5,
};

const MAX_SCENARIOS = 5;

interface CommunityDevDealSheetProps {
  opportunityId: string;
}

export function CommunityDevDealSheet({ opportunityId }: CommunityDevDealSheetProps) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryKey = ["community-proformas", opportunityId];

  const { data: proformas = [], isLoading } = useQuery<ProformaRecord[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_proformas")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("scenario_number", { ascending: true });
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
        .from("community_proformas")
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
            <h1 className="text-xl font-semibold text-foreground">Community Development Deal Sheet</h1>
            <p className="mt-0.5 text-sm text-muted">Phase 1 Horizontal + Phase 2 Vertical with LP Waterfall</p>
          </div>
          <button
            type="button"
            onClick={() => createProforma.mutate()}
            disabled={createProforma.isPending}
            className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover disabled:opacity-50"
          >
            + New Scenario
          </button>
        </div>
        <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-24">
          <p className="text-sm text-muted">No scenarios yet. Create one to start analyzing.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Community Development Deal Sheet</h1>
          <p className="mt-0.5 text-sm text-muted">Phase 1 Horizontal + Phase 2 Vertical with LP Waterfall</p>
        </div>
        <button
          type="button"
          onClick={() => createProforma.mutate()}
          disabled={createProforma.isPending || proformas.length >= MAX_SCENARIOS}
          className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover disabled:opacity-50"
        >
          + New Scenario
        </button>
      </div>

      {proformas.length > 1 && (
        <div className="mb-6 flex items-center gap-1 border-b border-border">
          {proformas.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                active?.id === p.id ? "border-b-2 border-primary text-primary" : "text-muted hover:text-foreground"
              }`}
            >
              {p.scenario_name || p.name}
            </button>
          ))}
        </div>
      )}

      <CommunityProformaForm proforma={active} queryKey={queryKey} />
    </div>
  );
}

function CommunityProformaForm({ proforma, queryKey }: { proforma: ProformaRecord; queryKey: unknown[] }) {
  const queryClient = useQueryClient();

  const makeOnSave = useCallback(
    (field: string) => async (value: number) => {
      const { error } = await supabase
        .from("community_proformas")
        .update({ [field]: value })
        .eq("id", proforma.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey });
    },
    [proforma.id, queryClient, queryKey],
  );

  const p = proforma;
  const results = useMemo(() => calculateCommunityProforma(p), [p]);
  const { phase1, phase2PerHome, phase2Totals, waterfall } = results;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Left -- Inputs */}
      <div className="space-y-6 lg:col-span-2">
        {/* Phase 1 Assumptions */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Phase 1 -- Horizontal Development Assumptions</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <NumericField label="Total Lots" value={p.total_lots} onSave={makeOnSave("total_lots")} />
            <CurrencyInput
              label="Land Value / Lot"
              value={p.land_value_per_lot}
              onSave={makeOnSave("land_value_per_lot")}
            />
            <CurrencyInput
              label="Horizontal Dev / Lot"
              value={p.horizontal_dev_per_lot}
              onSave={makeOnSave("horizontal_dev_per_lot")}
            />
            <CurrencyInput label="A&E / Lot" value={p.ae_per_lot} onSave={makeOnSave("ae_per_lot")} />
            <CurrencyInput label="Amenity Package" value={p.amenity_package} onSave={makeOnSave("amenity_package")} />
            <CurrencyInput label="Monument Sign" value={p.monument_sign} onSave={makeOnSave("monument_sign")} />
            <CurrencyInput
              label="Carry Costs / Lot"
              value={p.carry_costs_per_lot}
              onSave={makeOnSave("carry_costs_per_lot")}
            />
            <PercentageInput label="Contingency %" value={p.contingency_pct} onSave={makeOnSave("contingency_pct")} />
            <CurrencyInput label="CM Fee / Lot" value={p.cm_fee_per_lot} onSave={makeOnSave("cm_fee_per_lot")} />
            <CurrencyInput
              label="Developer Fee / Lot"
              value={p.developer_fee_per_lot}
              onSave={makeOnSave("developer_fee_per_lot")}
            />
            <CurrencyInput label="Lot Sales Price" value={p.lot_sales_price} onSave={makeOnSave("lot_sales_price")} />
          </div>
          <h4 className="mb-3 mt-5 text-xs font-semibold uppercase tracking-wider text-muted">Financing</h4>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <PercentageInput label="Bank LTC" value={p.bank_ltc} onSave={makeOnSave("bank_ltc")} />
            <PercentageInput label="Bank Rate" value={p.bank_interest_rate} onSave={makeOnSave("bank_interest_rate")} />
            <PercentageInput label="LP Pref Return" value={p.lp_pref_return} onSave={makeOnSave("lp_pref_return")} />
            <PercentageInput label="LP Buyout IRR" value={p.lp_buyout_irr} onSave={makeOnSave("lp_buyout_irr")} />
          </div>
        </section>

        {/* Phase 2 Assumptions */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Phase 2 -- Vertical Construction Assumptions</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <CurrencyInput
              label="Home Sales Price"
              value={p.home_sales_price}
              onSave={makeOnSave("home_sales_price")}
            />
            <PercentageInput
              label="Selling Costs %"
              value={p.selling_costs_pct}
              onSave={makeOnSave("selling_costs_pct")}
            />
            <CurrencyInput
              label="Seller Concession"
              value={p.seller_concession}
              onSave={makeOnSave("seller_concession")}
            />
            <CurrencyInput label="Vertical Cost / Home" value={p.vertical_cost} onSave={makeOnSave("vertical_cost")} />
            <PercentageInput
              label="Construction Rate"
              value={p.construction_interest_rate}
              onSave={makeOnSave("construction_interest_rate")}
            />
            <NumericField
              label="Build Duration (mo)"
              value={p.construction_months}
              onSave={makeOnSave("construction_months")}
            />
          </div>
          <h4 className="mb-3 mt-5 text-xs font-semibold uppercase tracking-wider text-muted">LP Terms</h4>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <PercentageInput
              label="LP Accruing Return"
              value={p.lp_accruing_return_rate}
              onSave={makeOnSave("lp_accruing_return_rate")}
            />
            <NumericField
              label="Investment Period (mo)"
              value={p.lp_investment_period_months}
              onSave={makeOnSave("lp_investment_period_months")}
            />
            <PercentageInput label="GP Split %" value={p.gp_split_pct} onSave={makeOnSave("gp_split_pct")} />
          </div>
        </section>
      </div>

      {/* Right -- Computed Results (sticky) */}
      <div className="space-y-6 lg:sticky lg:top-4 lg:self-start">
        {/* Phase 1 Sources & Uses */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Phase 1 -- Sources & Uses</h3>
          <div className="space-y-1 text-xs">
            <ResultRow label="Land Acquisition" value={formatCurrency(phase1.landAcquisition)} />
            <ResultRow label="Horizontal Development" value={formatCurrency(phase1.horizontalDev)} />
            <ResultRow label="A&E" value={formatCurrency(phase1.ae)} />
            <ResultRow label="Amenity Package" value={formatCurrency(p.amenity_package)} />
            <ResultRow label="Monument Sign" value={formatCurrency(p.monument_sign)} />
            <ResultRow label="Carry Costs" value={formatCurrency(phase1.carryCosts)} />
            <div className="border-t border-border pt-1">
              <ResultRow label="Subtotal Hard Costs" value={formatCurrency(phase1.subtotalHard)} bold />
            </div>
            <ResultRow label="Contingency" value={formatCurrency(phase1.contingency)} />
            <ResultRow label="Hard + Contingency" value={formatCurrency(phase1.totalHardPlusContingency)} bold />
            <ResultRow label="CM Fee" value={formatCurrency(phase1.cmFee)} />
            <ResultRow label="Developer Fee" value={formatCurrency(phase1.developerFee)} />
            <ResultRow label="Interest Reserve" value={formatCurrency(phase1.interestReserve)} />
            <div className="border-t border-border pt-1">
              <ResultRow label="Total Uses" value={formatCurrency(phase1.totalUses)} bold />
            </div>
            <div className="mt-2 border-t border-border pt-2">
              <ResultRow label="Senior Debt" value={formatCurrency(phase1.seniorDebt)} />
              <ResultRow label="LP Equity" value={formatCurrency(phase1.lpEquity)} />
            </div>
            <div className="mt-2 border-t border-border pt-2">
              <ResultRow label="Lot Sales Proceeds" value={formatCurrency(phase1.lotSalesProceeds)} />
              <ResultRow
                label="Gross Margin"
                value={formatCurrency(phase1.grossMargin)}
                highlight={phase1.grossMargin > 0}
              />
            </div>
          </div>
        </section>

        {/* Phase 2 Per-Home Economics */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Phase 2 -- Per-Home Economics</h3>
          <div className="space-y-1 text-xs">
            <ResultRow label="Home Sales Price" value={formatCurrency(p.home_sales_price)} />
            <ResultRow label="Lot Cost" value={formatCurrency(phase2PerHome.lotCost)} />
            <ResultRow label="Vertical Cost" value={formatCurrency(p.vertical_cost)} />
            <ResultRow label="Construction Interest" value={formatCurrency(phase2PerHome.constructionInterest)} />
            <ResultRow label="Selling Costs" value={formatCurrency(phase2PerHome.sellingCosts)} />
            <ResultRow label="Seller Concession" value={formatCurrency(p.seller_concession)} />
            <div className="border-t border-border pt-1">
              <ResultRow label="Total Cost / Home" value={formatCurrency(phase2PerHome.totalCostPerHome)} bold />
              <ResultRow
                label="Profit / Home"
                value={formatCurrency(phase2PerHome.perHomeProfit)}
                highlight={phase2PerHome.perHomeProfit > 0}
              />
              <ResultRow label="Margin" value={formatPercent(phase2PerHome.perHomeMargin)} />
            </div>
          </div>
        </section>

        {/* Project Totals */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Project Totals ({p.total_lots} homes)</h3>
          <div className="space-y-1 text-xs">
            <ResultRow label="Total Revenue" value={formatCurrency(phase2Totals.totalRevenue)} />
            <ResultRow label="Total Costs" value={formatCurrency(phase2Totals.totalCosts)} />
            <ResultRow
              label="Total Profit"
              value={formatCurrency(phase2Totals.totalProfit)}
              bold
              highlight={phase2Totals.totalProfit > 0}
            />
          </div>
        </section>

        {/* LP Waterfall */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">LP Waterfall</h3>
          <div className="space-y-1 text-xs">
            <ResultRow label="GP Rolled Equity" value={formatCurrency(waterfall.gpRolledEquity)} />
            <ResultRow label="Total Lot Cost" value={formatCurrency(waterfall.totalLotCost)} />
            <ResultRow label="SL Fund LP Capital" value={formatCurrency(waterfall.slFundLPCapital)} />
            <ResultRow label="LP Accrued Return" value={formatCurrency(waterfall.lpAccruedReturn)} />
            <div className="border-t border-border pt-1">
              <ResultRow label="Total LP Payout" value={formatCurrency(waterfall.totalLPPayout)} bold />
            </div>
            <div className="mt-2 border-t border-border pt-2">
              <ResultRow label="Gross Profit" value={formatCurrency(waterfall.grossProfitFromSales)} />
              <ResultRow label="Less: LP Return" value={formatCurrency(-waterfall.lpAccruedReturn)} />
              <ResultRow label="Remaining to GPs" value={formatCurrency(waterfall.remainingToGPs)} />
              <ResultRow label="GP Share" value={formatCurrency(waterfall.gpShare)} highlight={waterfall.gpShare > 0} />
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

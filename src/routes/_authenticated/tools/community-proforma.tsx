import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { PercentageInput } from "@/components/forms/PercentageInput";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatPercent } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tools/community-proforma")({
  component: CommunityProforma,
});

interface ProformaRecord {
  id: string;
  name: string;
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

const DEFAULTS: Omit<ProformaRecord, "id" | "name"> = {
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

function CommunityProforma() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryKey = ["community-proformas"];

  const { data: proformas = [], isLoading } = useQuery<ProformaRecord[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_proformas")
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
        .from("community_proformas")
        .insert({ name: `Community Dev ${proformas.length + 1}`, ...DEFAULTS })
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
            <h1 className="text-xl font-semibold text-foreground">Community Development Proforma</h1>
            <p className="mt-0.5 text-sm text-muted">
              Two-phase model: horizontal lot development + vertical construction with LP waterfall
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
            <h1 className="text-xl font-semibold text-foreground">Community Development Proforma</h1>
            <p className="mt-0.5 text-sm text-muted">Phase 1 Horizontal + Phase 2 Vertical with LP Waterfall</p>
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

  // Phase 1 — Horizontal Development
  const p = proforma;
  const landAcquisition = p.total_lots * p.land_value_per_lot;
  const horizontalDev = p.total_lots * p.horizontal_dev_per_lot;
  const ae = p.total_lots * p.ae_per_lot;
  const carryCosts = p.total_lots * p.carry_costs_per_lot;
  const subtotalHard = landAcquisition + horizontalDev + ae + p.amenity_package + p.monument_sign + carryCosts;
  const contingency = subtotalHard * p.contingency_pct;
  const totalHardPlusContingency = subtotalHard + contingency;
  const cmFee = p.total_lots * p.cm_fee_per_lot;
  const developerFee = p.total_lots * p.developer_fee_per_lot;
  const interestReserve = totalHardPlusContingency * p.bank_interest_rate * 0.5;
  const totalUses = totalHardPlusContingency + cmFee + developerFee + interestReserve;

  const seniorDebt = totalUses * p.bank_ltc;
  const lpEquity = totalUses - seniorDebt;
  const lotSalesProceeds = p.total_lots * p.lot_sales_price;
  const grossMarginPhase1 = lotSalesProceeds - totalUses;

  // Phase 2 — Vertical Construction
  const lotCost = p.lot_sales_price;
  const constructionInterest = p.vertical_cost * 0.5 * p.construction_interest_rate * (p.construction_months / 12);
  const sellingCosts = p.home_sales_price * p.selling_costs_pct;
  const totalCostPerHome = lotCost + p.vertical_cost + constructionInterest + sellingCosts + p.seller_concession;
  const perHomeProfit = p.home_sales_price - totalCostPerHome;
  const perHomeMargin = p.home_sales_price > 0 ? perHomeProfit / p.home_sales_price : 0;

  const totalRevenue = p.total_lots * p.home_sales_price;
  const totalCosts = p.total_lots * totalCostPerHome;
  const totalProfit = totalRevenue - totalCosts;

  // LP Waterfall
  const gpRolledEquity = grossMarginPhase1 > 0 ? grossMarginPhase1 : 0;
  const totalLotCost = p.total_lots * p.lot_sales_price;
  const slFundLPCapital = totalLotCost - gpRolledEquity;
  const lpAccruedReturn = slFundLPCapital * p.lp_accruing_return_rate * (p.lp_investment_period_months / 12);
  const totalLPPayout = slFundLPCapital + lpAccruedReturn;

  const grossProfitFromSales = totalProfit;
  const remainingToGPs = grossProfitFromSales - lpAccruedReturn;
  const gpShare = remainingToGPs * p.gp_split_pct;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Left — Inputs */}
      <div className="space-y-6 lg:col-span-2">
        {/* Phase 1 Assumptions */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Phase 1 — Horizontal Development Assumptions</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <NumericField label="Total Lots" value={p.total_lots} onSave={makeOnSave("total_lots")} />
            <CurrencyField
              label="Land Value / Lot"
              value={p.land_value_per_lot}
              onSave={makeOnSave("land_value_per_lot")}
            />
            <CurrencyField
              label="Horizontal Dev / Lot"
              value={p.horizontal_dev_per_lot}
              onSave={makeOnSave("horizontal_dev_per_lot")}
            />
            <CurrencyField label="A&E / Lot" value={p.ae_per_lot} onSave={makeOnSave("ae_per_lot")} />
            <CurrencyField label="Amenity Package" value={p.amenity_package} onSave={makeOnSave("amenity_package")} />
            <CurrencyField label="Monument Sign" value={p.monument_sign} onSave={makeOnSave("monument_sign")} />
            <CurrencyField
              label="Carry Costs / Lot"
              value={p.carry_costs_per_lot}
              onSave={makeOnSave("carry_costs_per_lot")}
            />
            <PctField label="Contingency %" value={p.contingency_pct} onSave={makeOnSave("contingency_pct")} />
            <CurrencyField label="CM Fee / Lot" value={p.cm_fee_per_lot} onSave={makeOnSave("cm_fee_per_lot")} />
            <CurrencyField
              label="Developer Fee / Lot"
              value={p.developer_fee_per_lot}
              onSave={makeOnSave("developer_fee_per_lot")}
            />
            <CurrencyField label="Lot Sales Price" value={p.lot_sales_price} onSave={makeOnSave("lot_sales_price")} />
          </div>
          <h4 className="mb-3 mt-5 text-xs font-semibold uppercase tracking-wider text-muted">Financing</h4>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <PctField label="Bank LTC" value={p.bank_ltc} onSave={makeOnSave("bank_ltc")} />
            <PctField label="Bank Rate" value={p.bank_interest_rate} onSave={makeOnSave("bank_interest_rate")} />
            <PctField label="LP Pref Return" value={p.lp_pref_return} onSave={makeOnSave("lp_pref_return")} />
            <PctField label="LP Buyout IRR" value={p.lp_buyout_irr} onSave={makeOnSave("lp_buyout_irr")} />
          </div>
        </section>

        {/* Phase 2 Assumptions */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Phase 2 — Vertical Construction Assumptions</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <CurrencyField
              label="Home Sales Price"
              value={p.home_sales_price}
              onSave={makeOnSave("home_sales_price")}
            />
            <PctField label="Selling Costs %" value={p.selling_costs_pct} onSave={makeOnSave("selling_costs_pct")} />
            <CurrencyField
              label="Seller Concession"
              value={p.seller_concession}
              onSave={makeOnSave("seller_concession")}
            />
            <CurrencyField label="Vertical Cost / Home" value={p.vertical_cost} onSave={makeOnSave("vertical_cost")} />
            <PctField
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
            <PctField
              label="LP Accruing Return"
              value={p.lp_accruing_return_rate}
              onSave={makeOnSave("lp_accruing_return_rate")}
            />
            <NumericField
              label="Investment Period (mo)"
              value={p.lp_investment_period_months}
              onSave={makeOnSave("lp_investment_period_months")}
            />
            <PctField label="GP Split %" value={p.gp_split_pct} onSave={makeOnSave("gp_split_pct")} />
          </div>
        </section>
      </div>

      {/* Right — Computed Results */}
      <div className="space-y-6">
        {/* Phase 1 Sources & Uses */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Phase 1 — Sources & Uses</h3>
          <div className="space-y-1 text-xs">
            <ResultRow label="Land Acquisition" value={formatCurrency(landAcquisition)} />
            <ResultRow label="Horizontal Development" value={formatCurrency(horizontalDev)} />
            <ResultRow label="A&E" value={formatCurrency(ae)} />
            <ResultRow label="Amenity Package" value={formatCurrency(p.amenity_package)} />
            <ResultRow label="Monument Sign" value={formatCurrency(p.monument_sign)} />
            <ResultRow label="Carry Costs" value={formatCurrency(carryCosts)} />
            <div className="border-t border-border pt-1">
              <ResultRow label="Subtotal Hard Costs" value={formatCurrency(subtotalHard)} bold />
            </div>
            <ResultRow label="Contingency" value={formatCurrency(contingency)} />
            <ResultRow label="Hard + Contingency" value={formatCurrency(totalHardPlusContingency)} bold />
            <ResultRow label="CM Fee" value={formatCurrency(cmFee)} />
            <ResultRow label="Developer Fee" value={formatCurrency(developerFee)} />
            <ResultRow label="Interest Reserve" value={formatCurrency(interestReserve)} />
            <div className="border-t border-border pt-1">
              <ResultRow label="Total Uses" value={formatCurrency(totalUses)} bold />
            </div>
            <div className="mt-2 border-t border-border pt-2">
              <ResultRow label="Senior Debt" value={formatCurrency(seniorDebt)} />
              <ResultRow label="LP Equity" value={formatCurrency(lpEquity)} />
            </div>
            <div className="mt-2 border-t border-border pt-2">
              <ResultRow label="Lot Sales Proceeds" value={formatCurrency(lotSalesProceeds)} />
              <ResultRow
                label="Gross Margin"
                value={formatCurrency(grossMarginPhase1)}
                highlight={grossMarginPhase1 > 0}
              />
            </div>
          </div>
        </section>

        {/* Phase 2 Per-Home Economics */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Phase 2 — Per-Home Economics</h3>
          <div className="space-y-1 text-xs">
            <ResultRow label="Home Sales Price" value={formatCurrency(p.home_sales_price)} />
            <ResultRow label="Lot Cost" value={formatCurrency(lotCost)} />
            <ResultRow label="Vertical Cost" value={formatCurrency(p.vertical_cost)} />
            <ResultRow label="Construction Interest" value={formatCurrency(constructionInterest)} />
            <ResultRow label="Selling Costs" value={formatCurrency(sellingCosts)} />
            <ResultRow label="Seller Concession" value={formatCurrency(p.seller_concession)} />
            <div className="border-t border-border pt-1">
              <ResultRow label="Total Cost / Home" value={formatCurrency(totalCostPerHome)} bold />
              <ResultRow label="Profit / Home" value={formatCurrency(perHomeProfit)} highlight={perHomeProfit > 0} />
              <ResultRow label="Margin" value={formatPercent(perHomeMargin)} />
            </div>
          </div>
        </section>

        {/* Project Totals */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Project Totals ({p.total_lots} homes)</h3>
          <div className="space-y-1 text-xs">
            <ResultRow label="Total Revenue" value={formatCurrency(totalRevenue)} />
            <ResultRow label="Total Costs" value={formatCurrency(totalCosts)} />
            <ResultRow label="Total Profit" value={formatCurrency(totalProfit)} bold highlight={totalProfit > 0} />
          </div>
        </section>

        {/* LP Waterfall */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">LP Waterfall</h3>
          <div className="space-y-1 text-xs">
            <ResultRow label="GP Rolled Equity" value={formatCurrency(gpRolledEquity)} />
            <ResultRow label="Total Lot Cost" value={formatCurrency(totalLotCost)} />
            <ResultRow label="SL Fund LP Capital" value={formatCurrency(slFundLPCapital)} />
            <ResultRow label="LP Accrued Return" value={formatCurrency(lpAccruedReturn)} />
            <div className="border-t border-border pt-1">
              <ResultRow label="Total LP Payout" value={formatCurrency(totalLPPayout)} bold />
            </div>
            <div className="mt-2 border-t border-border pt-2">
              <ResultRow label="Gross Profit" value={formatCurrency(grossProfitFromSales)} />
              <ResultRow label="Less: LP Return" value={formatCurrency(-lpAccruedReturn)} />
              <ResultRow label="Remaining to GPs" value={formatCurrency(remainingToGPs)} />
              <ResultRow label="GP Share" value={formatCurrency(gpShare)} highlight={gpShare > 0} />
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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { PercentageInput } from "@/components/forms/PercentageInput";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatPercent } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tools/lot-dev-proforma")({
  component: LotDevProforma,
});

interface LotDevRecord {
  id: string;
  name: string;
  total_lots: number;
  phases: number;
  lots_per_phase: number;
  land_acquisition_cost: number;
  horizontal_dev_per_lot: number;
  entitlement_costs: number;
  amenity_costs: number;
  carry_costs_per_lot: number;
  contingency_pct: number;
  developer_fee_per_lot: number;
  cm_fee_per_lot: number;
  lot_sales_price: number;
  bank_ltc: number;
  bank_interest_rate: number;
  lp_pref_return: number;
  absorption_lots_per_month: number;
}

const DEFAULTS: Omit<LotDevRecord, "id" | "name"> = {
  total_lots: 80,
  phases: 2,
  lots_per_phase: 40,
  land_acquisition_cost: 2000000,
  horizontal_dev_per_lot: 40000,
  entitlement_costs: 250000,
  amenity_costs: 200000,
  carry_costs_per_lot: 1500,
  contingency_pct: 0.05,
  developer_fee_per_lot: 5000,
  cm_fee_per_lot: 3000,
  lot_sales_price: 75000,
  bank_ltc: 0.65,
  bank_interest_rate: 0.075,
  lp_pref_return: 0.1,
  absorption_lots_per_month: 4,
};

function LotDevProforma() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryKey = ["lot-dev-proformas"];

  const { data: proformas = [], isLoading } = useQuery<LotDevRecord[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lot_dev_proformas")
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
        .from("lot_dev_proformas")
        .insert({ name: `Lot Dev ${proformas.length + 1}`, ...DEFAULTS })
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
            <h1 className="text-xl font-semibold text-foreground">Lot Development Proforma</h1>
            <p className="mt-0.5 text-sm text-muted">
              Horizontal-only lot development model with absorption schedule and investor returns
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
            <h1 className="text-xl font-semibold text-foreground">Lot Development Proforma</h1>
            <p className="mt-0.5 text-sm text-muted">Horizontal development with absorption schedule</p>
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

      <LotDevForm proforma={active} queryKey={queryKey} />
    </div>
  );
}

function LotDevForm({ proforma, queryKey }: { proforma: LotDevRecord; queryKey: unknown[] }) {
  const queryClient = useQueryClient();
  const makeOnSave = useCallback(
    (field: string) => async (value: number) => {
      const { error } = await supabase
        .from("lot_dev_proformas")
        .update({ [field]: value })
        .eq("id", proforma.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey });
    },
    [proforma.id, queryClient, queryKey],
  );

  const p = proforma;
  const horizontalDev = p.total_lots * p.horizontal_dev_per_lot;
  const carryCosts = p.total_lots * p.carry_costs_per_lot;
  const subtotalHard = p.land_acquisition_cost + horizontalDev + p.entitlement_costs + p.amenity_costs + carryCosts;
  const contingency = subtotalHard * p.contingency_pct;
  const totalHardPlusContingency = subtotalHard + contingency;
  const cmFee = p.total_lots * p.cm_fee_per_lot;
  const developerFee = p.total_lots * p.developer_fee_per_lot;
  const interestReserve = totalHardPlusContingency * p.bank_interest_rate * 0.5;
  const totalUses = totalHardPlusContingency + cmFee + developerFee + interestReserve;

  const seniorDebt = totalUses * p.bank_ltc;
  const lpEquity = totalUses - seniorDebt;
  const totalRevenue = p.total_lots * p.lot_sales_price;
  const grossProfit = totalRevenue - totalUses;
  const profitMargin = totalRevenue > 0 ? grossProfit / totalRevenue : 0;
  const equityMultiple = lpEquity > 0 ? (lpEquity + grossProfit) / lpEquity : 0;

  // Absorption schedule
  const absorptionMonths = p.absorption_lots_per_month > 0 ? Math.ceil(p.total_lots / p.absorption_lots_per_month) : 0;
  const breakevenLots = totalUses > 0 && p.lot_sales_price > 0 ? Math.ceil(totalUses / p.lot_sales_price) : 0;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Project Assumptions</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <NumericField label="Total Lots" value={p.total_lots} onSave={makeOnSave("total_lots")} />
            <NumericField label="Phases" value={p.phases} onSave={makeOnSave("phases")} />
            <NumericField label="Lots / Phase" value={p.lots_per_phase} onSave={makeOnSave("lots_per_phase")} />
            <CurrencyField
              label="Land Acquisition (Total)"
              value={p.land_acquisition_cost}
              onSave={makeOnSave("land_acquisition_cost")}
            />
            <CurrencyField
              label="Horizontal Dev / Lot"
              value={p.horizontal_dev_per_lot}
              onSave={makeOnSave("horizontal_dev_per_lot")}
            />
            <CurrencyField
              label="Entitlement Costs"
              value={p.entitlement_costs}
              onSave={makeOnSave("entitlement_costs")}
            />
            <CurrencyField label="Amenity / Common Area" value={p.amenity_costs} onSave={makeOnSave("amenity_costs")} />
            <CurrencyField
              label="Carry Costs / Lot"
              value={p.carry_costs_per_lot}
              onSave={makeOnSave("carry_costs_per_lot")}
            />
            <PctField label="Contingency %" value={p.contingency_pct} onSave={makeOnSave("contingency_pct")} />
            <CurrencyField
              label="Developer Fee / Lot"
              value={p.developer_fee_per_lot}
              onSave={makeOnSave("developer_fee_per_lot")}
            />
            <CurrencyField label="CM Fee / Lot" value={p.cm_fee_per_lot} onSave={makeOnSave("cm_fee_per_lot")} />
            <CurrencyField label="Lot Sales Price" value={p.lot_sales_price} onSave={makeOnSave("lot_sales_price")} />
          </div>
          <h4 className="mb-3 mt-5 text-xs font-semibold uppercase tracking-wider text-muted">
            Financing & Absorption
          </h4>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <PctField label="Bank LTC" value={p.bank_ltc} onSave={makeOnSave("bank_ltc")} />
            <PctField label="Bank Rate" value={p.bank_interest_rate} onSave={makeOnSave("bank_interest_rate")} />
            <PctField label="LP Pref Return" value={p.lp_pref_return} onSave={makeOnSave("lp_pref_return")} />
            <NumericField
              label="Lots Sold / Month"
              value={p.absorption_lots_per_month}
              onSave={makeOnSave("absorption_lots_per_month")}
            />
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Sources & Uses</h3>
          <div className="space-y-1 text-xs">
            <ResultRow label="Land Acquisition" value={formatCurrency(p.land_acquisition_cost)} />
            <ResultRow label="Horizontal Development" value={formatCurrency(horizontalDev)} />
            <ResultRow label="Entitlement Costs" value={formatCurrency(p.entitlement_costs)} />
            <ResultRow label="Amenity / Common" value={formatCurrency(p.amenity_costs)} />
            <ResultRow label="Carry Costs" value={formatCurrency(carryCosts)} />
            <div className="border-t border-border pt-1">
              <ResultRow label="Subtotal Hard" value={formatCurrency(subtotalHard)} bold />
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
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Returns</h3>
          <div className="space-y-1 text-xs">
            <ResultRow label="Total Revenue" value={formatCurrency(totalRevenue)} />
            <ResultRow label="Gross Profit" value={formatCurrency(grossProfit)} highlight={grossProfit > 0} />
            <ResultRow label="Profit Margin" value={formatPercent(profitMargin)} />
            <ResultRow label="Equity Multiple" value={`${equityMultiple.toFixed(2)}x`} />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Absorption</h3>
          <div className="space-y-1 text-xs">
            <ResultRow label="Total Lots" value={String(p.total_lots)} />
            <ResultRow label="Lots Sold / Month" value={String(p.absorption_lots_per_month)} />
            <ResultRow label="Sellout Period" value={`${absorptionMonths} months`} />
            <ResultRow label="Breakeven Lots" value={String(breakevenLots)} />
            <ResultRow
              label="Breakeven Month"
              value={
                p.absorption_lots_per_month > 0
                  ? `Month ${Math.ceil(breakevenLots / p.absorption_lots_per_month)}`
                  : "—"
              }
            />
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

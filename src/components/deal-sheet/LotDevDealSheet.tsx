import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { PercentageInput } from "@/components/forms/PercentageInput";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { calculateLotDevProforma } from "@/lib/lot-dev-proforma-engine";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatPercent } from "@/lib/utils";

interface LotDevRecord {
  id: string;
  name: string;
  opportunity_id: string | null;
  scenario_number: number;
  scenario_name: string | null;
  is_primary: boolean;
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

const DEFAULTS = {
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

interface LotDevDealSheetProps {
  opportunityId: string;
}

export function LotDevDealSheet({ opportunityId }: LotDevDealSheetProps) {
  const queryClient = useQueryClient();
  const queryKey = ["lot_dev_proformas", opportunityId];

  const { data: proformas, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lot_dev_proformas")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("scenario_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as LotDevRecord[];
    },
  });

  const createScenario = useMutation({
    mutationFn: async () => {
      const current = proformas ?? [];
      const { data, error } = await supabase
        .from("lot_dev_proformas")
        .insert({
          opportunity_id: opportunityId,
          name: `Scenario ${current.length + 1}`,
          scenario_number: current.length + 1,
          scenario_name: `Scenario ${current.length + 1}`,
          is_primary: current.length === 0,
          ...DEFAULTS,
        })
        .select()
        .single();
      if (error) throw error;
      return data as LotDevRecord;
    },
    onSuccess: (newRecord) => {
      queryClient.invalidateQueries({ queryKey });
      setSelectedId(newRecord.id);
    },
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = proformas ?? [];
  const active = list.find((p) => p.id === selectedId) ?? list[0] ?? null;

  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">Lot Development Deal Sheet</h2>
          <p className="text-sm text-muted">Horizontal development with absorption schedule</p>
        </div>
        <FormSkeleton fields={8} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Lot Development Deal Sheet</h2>
          <p className="text-sm text-muted">Horizontal development with absorption schedule</p>
        </div>
        {list.length < 5 && (
          <button
            type="button"
            onClick={() => createScenario.mutate()}
            disabled={createScenario.isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {createScenario.isPending ? "Creating..." : "+ New Scenario"}
          </button>
        )}
      </div>

      {/* Scenario tab bar */}
      {list.length > 1 && (
        <div className="mb-6 flex items-center gap-1 border-b border-border">
          {list.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                active?.id === p.id
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {p.scenario_name || p.name}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {list.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-24">
          <p className="text-sm font-medium text-foreground">No scenarios yet.</p>
          <p className="mt-1 text-xs text-muted">Create one to start analyzing.</p>
        </div>
      )}

      {/* Active scenario form */}
      {active && <LotDevForm record={active} queryKey={queryKey} />}
    </div>
  );
}

/* ---------- Inner form component ---------- */

interface LotDevFormProps {
  record: LotDevRecord;
  queryKey: unknown[];
}

function LotDevForm({ record, queryKey }: LotDevFormProps) {
  const queryClient = useQueryClient();

  const updateRecord = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("lot_dev_proformas").update(updates).eq("id", record.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const makeOnSave = useCallback(
    (field: string) => async (value: string | number) => {
      await updateRecord.mutateAsync({ [field]: Number(value) });
    },
    [updateRecord],
  );

  const results = useMemo(
    () =>
      calculateLotDevProforma({
        total_lots: record.total_lots,
        phases: record.phases,
        lots_per_phase: record.lots_per_phase,
        land_acquisition_cost: record.land_acquisition_cost,
        horizontal_dev_per_lot: record.horizontal_dev_per_lot,
        entitlement_costs: record.entitlement_costs,
        amenity_costs: record.amenity_costs,
        carry_costs_per_lot: record.carry_costs_per_lot,
        contingency_pct: record.contingency_pct,
        developer_fee_per_lot: record.developer_fee_per_lot,
        cm_fee_per_lot: record.cm_fee_per_lot,
        lot_sales_price: record.lot_sales_price,
        bank_ltc: record.bank_ltc,
        bank_interest_rate: record.bank_interest_rate,
        lp_pref_return: record.lp_pref_return,
        absorption_lots_per_month: record.absorption_lots_per_month,
      }),
    [record],
  );

  const su = results.sourcesUses;
  const ret = results.returns;
  const abs = results.absorption;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      {/* LEFT: Inputs (2/3) */}
      <div className="space-y-6 xl:col-span-2">
        {/* Project Assumptions */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Project Assumptions</h3>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
            <NumericField label="Total Lots" value={record.total_lots} onSave={makeOnSave("total_lots")} />
            <NumericField label="Phases" value={record.phases} onSave={makeOnSave("phases")} />
            <NumericField label="Lots per Phase" value={record.lots_per_phase} onSave={makeOnSave("lots_per_phase")} />
            <CurrencyInput
              label="Land Acquisition"
              value={record.land_acquisition_cost}
              onSave={makeOnSave("land_acquisition_cost")}
            />
            <CurrencyInput
              label="Horizontal Dev / Lot"
              value={record.horizontal_dev_per_lot}
              onSave={makeOnSave("horizontal_dev_per_lot")}
            />
            <CurrencyInput
              label="Entitlement Costs"
              value={record.entitlement_costs}
              onSave={makeOnSave("entitlement_costs")}
            />
            <CurrencyInput
              label="Amenity / Common"
              value={record.amenity_costs}
              onSave={makeOnSave("amenity_costs")}
            />
            <CurrencyInput
              label="Carry Costs / Lot"
              value={record.carry_costs_per_lot}
              onSave={makeOnSave("carry_costs_per_lot")}
            />
            <PercentageInput
              label="Contingency %"
              value={record.contingency_pct}
              onSave={makeOnSave("contingency_pct")}
            />
            <CurrencyInput
              label="Developer Fee / Lot"
              value={record.developer_fee_per_lot}
              onSave={makeOnSave("developer_fee_per_lot")}
            />
            <CurrencyInput
              label="CM Fee / Lot"
              value={record.cm_fee_per_lot}
              onSave={makeOnSave("cm_fee_per_lot")}
            />
            <CurrencyInput
              label="Lot Sales Price"
              value={record.lot_sales_price}
              onSave={makeOnSave("lot_sales_price")}
            />
          </div>
        </div>

        {/* Financing & Absorption */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Financing & Absorption</h3>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
            <PercentageInput label="Bank LTC" value={record.bank_ltc} onSave={makeOnSave("bank_ltc")} />
            <PercentageInput
              label="Bank Interest Rate"
              value={record.bank_interest_rate}
              onSave={makeOnSave("bank_interest_rate")}
            />
            <PercentageInput
              label="LP Pref Return"
              value={record.lp_pref_return}
              onSave={makeOnSave("lp_pref_return")}
            />
            <NumericField
              label="Lots Sold / Month"
              value={record.absorption_lots_per_month}
              onSave={makeOnSave("absorption_lots_per_month")}
            />
          </div>
        </div>
      </div>

      {/* RIGHT: Results (1/3, sticky) */}
      <div className="xl:sticky xl:top-4 xl:self-start">
        <div className="space-y-4">
          {/* Sources & Uses */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Sources & Uses</h3>
            <div className="space-y-1">
              <ResultRow label="Land Acquisition" value={formatCurrency(record.land_acquisition_cost)} />
              <ResultRow label="Horizontal Development" value={formatCurrency(su.horizontalDev)} />
              <ResultRow label="Entitlement Costs" value={formatCurrency(record.entitlement_costs)} />
              <ResultRow label="Amenity / Common" value={formatCurrency(record.amenity_costs)} />
              <ResultRow label="Carry Costs" value={formatCurrency(su.carryCosts)} />
              <div className="border-t border-border pt-1.5">
                <ResultRow label="Subtotal Hard" value={formatCurrency(su.subtotalHard)} bold />
              </div>
              <ResultRow label="Contingency" value={formatCurrency(su.contingency)} />
              <ResultRow label="Hard + Contingency" value={formatCurrency(su.totalHardPlusContingency)} bold />
              <ResultRow label="CM Fee" value={formatCurrency(su.cmFee)} />
              <ResultRow label="Developer Fee" value={formatCurrency(su.developerFee)} />
              <ResultRow label="Interest Reserve" value={formatCurrency(su.interestReserve)} />
              <div className="border-t border-border pt-1.5">
                <ResultRow label="Total Uses" value={formatCurrency(su.totalUses)} bold />
              </div>
              <div className="border-t border-border pt-1.5">
                <ResultRow label="Senior Debt" value={formatCurrency(su.seniorDebt)} />
                <ResultRow label="LP Equity" value={formatCurrency(su.lpEquity)} />
              </div>
            </div>
          </div>

          {/* Returns */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Returns</h3>
            <div className="space-y-1">
              <ResultRow label="Total Revenue" value={formatCurrency(ret.totalRevenue)} />
              <ResultRow
                label="Gross Profit"
                value={formatCurrency(ret.grossProfit)}
                highlight={ret.grossProfit > 0}
              />
              <ResultRow label="Profit Margin" value={formatPercent(ret.profitMargin)} />
              <ResultRow label="Equity Multiple" value={`${ret.equityMultiple.toFixed(2)}x`} />
            </div>
          </div>

          {/* Absorption */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Absorption</h3>
            <div className="space-y-1">
              <ResultRow label="Total Lots" value={String(record.total_lots)} />
              <ResultRow label="Lots Sold / Month" value={String(record.absorption_lots_per_month)} />
              <ResultRow label="Sellout Period" value={`${abs.absorptionMonths} months`} />
              <ResultRow label="Breakeven Lots" value={String(abs.breakevenLots)} />
              <ResultRow
                label="Breakeven Month"
                value={abs.breakevenMonth > 0 ? `Month ${abs.breakevenMonth}` : "\u2014"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Helper components ---------- */

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

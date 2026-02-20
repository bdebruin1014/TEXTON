import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AutoSaveField, AutoSaveSelect } from "@/components/forms/AutoSaveField";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { type FloorPlanData, FloorPlanSelect } from "@/components/forms/FloorPlanSelect";
import { type MunicipalityFees, MunicipalitySelect } from "@/components/forms/MunicipalitySelect";
import { PercentageInput } from "@/components/forms/PercentageInput";
import { FIXED_PER_HOUSE_FEES, totalFixedPerHouse } from "@/lib/constants";
import { calculateDealSheet, type DealSheetInputs, runSensitivityAnalysis } from "@/lib/deal-engine";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatPercent } from "@/lib/utils";

export interface DealSheetRecord {
  id: string;
  opportunity_id: string | null;
  name: string | null;
  status: string;
  address: string | null;
  municipality_id: string | null;
  floor_plan_id: string | null;
  lot_purchase_price: number;
  closing_costs: number;
  acquisition_commission: number;
  acquisition_bonus: number;
  other_lot_costs: number;
  sticks_bricks: number;
  upgrades: number;
  soft_costs: number;
  land_prep: number;
  site_specific: number;
  site_work_total: number;
  site_work_mode: string;
  other_site_costs: number;
  is_rch_related_owner: boolean;
  asset_sales_price: number;
  selling_cost_rate: number;
  selling_concessions: number;
  ltc_ratio: number;
  interest_rate: number;
  cost_of_capital: number;
  project_duration_days: number;
  created_at: string;
}

const FEE_LABELS: Record<string, string> = {
  builder_fee: "Builder Fee",
  am_fee: "Asset Management Fee",
  builder_warranty: "Builder Warranty Reserve",
  builders_risk: "Builder's Risk Insurance",
  po_fee: "PO Fee",
  bookkeeping: "Bookkeeping",
  pm_fee: "Project Management Fee",
  utilities: "Utilities During Construction",
};

const UPGRADE_PACKAGES = [
  { label: "None ($0/SF)", value: "none" },
  { label: "Package D ($3/SF)", value: "D" },
  { label: "Package C ($4.50/SF)", value: "C" },
  { label: "Package B ($6/SF)", value: "B" },
  { label: "Package A ($8/SF)", value: "A" },
];

const UPGRADE_RATES: Record<string, number> = { none: 0, D: 3, C: 4.5, B: 6, A: 8 };

interface DealSheetFormProps {
  sheet: DealSheetRecord;
  queryKey: unknown[];
}

export function DealSheetForm({ sheet, queryKey }: DealSheetFormProps) {
  const queryClient = useQueryClient();
  const [upgradePackage, setUpgradePackage] = useState("none");
  const [selectedPlanSF, setSelectedPlanSF] = useState<number>(0);
  const [showSensitivity, setShowSensitivity] = useState(false);

  const updateSheet = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("deal_sheets").update(updates).eq("id", sheet.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const save = useCallback(
    (field: string) => async (value: string | number) => {
      await updateSheet.mutateAsync({ [field]: Number(value) });
    },
    [updateSheet],
  );

  const saveText = useCallback(
    (field: string) => async (value: string) => {
      await updateSheet.mutateAsync({ [field]: value });
    },
    [updateSheet],
  );

  const inputs: DealSheetInputs = useMemo(
    () => ({
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
    }),
    [sheet],
  );

  const dealOutputs = useMemo(() => calculateDealSheet(inputs), [inputs]);

  const sensitivity = useMemo(() => {
    if (!showSensitivity) return null;
    return runSensitivityAnalysis(inputs);
  }, [inputs, showSensitivity]);

  // Persist computed results
  const sheetId = sheet.id;
  useEffect(() => {
    if (!dealOutputs) return;
    supabase
      .from("deal_sheets")
      .update({
        total_lot_basis: dealOutputs.total_lot_basis,
        sections_1_to_5: dealOutputs.sections_1_to_5,
        builder_fee: dealOutputs.builder_fee,
        contingency: dealOutputs.contingency,
        total_contract_cost: dealOutputs.total_contract_cost,
        total_fixed_per_house: dealOutputs.total_fixed_per_house,
        total_project_cost: dealOutputs.total_project_cost,
        loan_amount: dealOutputs.loan_amount,
        equity_required: dealOutputs.equity_required,
        interest_cost: dealOutputs.interest_cost,
        cost_of_capital_amount: dealOutputs.cost_of_capital_amount,
        total_all_in: dealOutputs.total_all_in,
        selling_costs: dealOutputs.selling_costs,
        net_proceeds: dealOutputs.net_proceeds,
        net_profit: dealOutputs.net_profit,
        net_profit_margin: dealOutputs.net_profit_margin,
        land_cost_ratio: dealOutputs.land_cost_ratio,
        profit_verdict: dealOutputs.profit_verdict,
        land_verdict: dealOutputs.land_verdict,
      })
      .eq("id", sheetId)
      .then();
  }, [sheetId, dealOutputs]);

  const handleFloorPlanLoaded = useCallback(
    (plan: FloorPlanData) => {
      const snb = plan.contract_snb ?? plan.dm_budget_snb ?? plan.base_construction_cost ?? 0;
      setSelectedPlanSF(plan.heated_sqft ?? 0);
      updateSheet.mutate({ sticks_bricks: snb, floor_plan_id: plan.id });
    },
    [updateSheet],
  );

  const handleMunicipalityFees = useCallback(
    (fees: MunicipalityFees) => {
      const total =
        (fees.water_tap ?? 0) +
        (fees.sewer_tap ?? 0) +
        (fees.gas_tap ?? 0) +
        (fees.permitting ?? 0) +
        (fees.impact ?? 0) +
        (fees.architect ?? 0) +
        (fees.engineering ?? 0) +
        (fees.survey ?? 0);
      updateSheet.mutate({ soft_costs: total });
    },
    [updateSheet],
  );

  const handleUpgradeChange = useCallback(
    async (pkg: string) => {
      setUpgradePackage(pkg);
      const rate = UPGRADE_RATES[pkg] ?? 0;
      const amount = Math.round(rate * selectedPlanSF);
      await updateSheet.mutateAsync({ upgrades: amount });
    },
    [updateSheet, selectedPlanSF],
  );

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      {/* LEFT: Inputs (2 col span) */}
      <div className="space-y-6 xl:col-span-2">
        {/* Section 1: Property & Plan */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
            Section 1 — Property & Plan
          </h3>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
            <AutoSaveField label="Street Address" value={sheet.address} onSave={saveText("address")} />
            <FloorPlanSelect
              label="Floor Plan"
              value={sheet.floor_plan_id}
              onSave={saveText("floor_plan_id")}
              onPlanLoaded={handleFloorPlanLoaded}
            />
          </div>
        </div>

        {/* Section 2: Acquisition */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Section 2 — Acquisition</h3>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
            <CurrencyInput
              label="Lot Purchase Price"
              value={sheet.lot_purchase_price}
              onSave={save("lot_purchase_price")}
            />
            <CurrencyInput label="Closing Costs" value={sheet.closing_costs} onSave={save("closing_costs")} />
            <CurrencyInput
              label="Acquisition Commission"
              value={sheet.acquisition_commission}
              onSave={save("acquisition_commission")}
            />
            <CurrencyInput
              label="Acquisition Bonus / Bird Dog"
              value={sheet.acquisition_bonus}
              onSave={save("acquisition_bonus")}
            />
            <CurrencyInput label="Other Lot Costs" value={sheet.other_lot_costs} onSave={save("other_lot_costs")} />
            <AutoSaveField
              label="Project Duration (days)"
              value={sheet.project_duration_days}
              onSave={save("project_duration_days")}
              type="number"
            />
          </div>
        </div>

        {/* Section 3: Municipality Soft Costs */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
            Section 3 — Municipality Soft Costs
          </h3>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
            <MunicipalitySelect
              label="Municipality"
              value={sheet.municipality_id}
              onSave={saveText("municipality_id")}
              onFeesLoaded={handleMunicipalityFees}
            />
            <CurrencyInput label="Total Soft Costs" value={sheet.soft_costs} onSave={save("soft_costs")} />
            <CurrencyInput label="Land Prep" value={sheet.land_prep} onSave={save("land_prep")} />
            <CurrencyInput label="Site-Specific Costs" value={sheet.site_specific} onSave={save("site_specific")} />
          </div>
        </div>

        {/* Section 4: Upgrades */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Section 4 — Upgrades</h3>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
            <AutoSaveSelect
              label="Upgrade Package"
              value={upgradePackage}
              onSave={handleUpgradeChange}
              options={UPGRADE_PACKAGES}
            />
            <CurrencyInput label="Total Upgrade Cost" value={sheet.upgrades} onSave={save("upgrades")} />
          </div>
          {selectedPlanSF > 0 && upgradePackage !== "none" && (
            <p className="mt-2 text-xs text-muted">
              {selectedPlanSF.toLocaleString()} SF x ${UPGRADE_RATES[upgradePackage]}/SF ={" "}
              {formatCurrency(selectedPlanSF * (UPGRADE_RATES[upgradePackage] ?? 0))}
            </p>
          )}
        </div>

        {/* Section 5: Site Work */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Section 5 — Site Work</h3>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
            <CurrencyInput label="Site Work / Grading" value={sheet.site_work_total} onSave={save("site_work_total")} />
            <CurrencyInput label="Other Site Costs" value={sheet.other_site_costs} onSave={save("other_site_costs")} />
          </div>
        </div>

        {/* Section 6: Fixed Per-House */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">
              Section 6 — Fixed Per-House Fees
            </h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sheet.is_rch_related_owner}
                onChange={async (e) => {
                  await updateSheet.mutateAsync({ is_rch_related_owner: e.target.checked });
                }}
                className="rounded border-border"
              />
              RCH-related entity
            </label>
          </div>
          <div className="space-y-1.5">
            {(Object.entries(FIXED_PER_HOUSE_FEES) as [string, number][]).map(([key, amount]) => {
              if (key === "am_fee" && !sheet.is_rch_related_owner) return null;
              return (
                <div key={key} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5">
                  <span className="text-sm text-foreground">{FEE_LABELS[key] ?? key}</span>
                  <span className="font-mono text-sm font-medium text-foreground">{formatCurrency(amount)}</span>
                </div>
              );
            })}
            <div className="border-t border-border pt-2">
              <div className="flex items-center justify-between px-3">
                <span className="text-sm font-semibold text-foreground">Total Fixed Per-House</span>
                <span className="font-mono text-sm font-bold text-primary">
                  {formatCurrency(totalFixedPerHouse(sheet.is_rch_related_owner))}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 7: Sales */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Section 7 — Sales</h3>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
            <CurrencyInput
              label="Asset Sales Price (ASP)"
              value={sheet.asset_sales_price}
              onSave={save("asset_sales_price")}
            />
            <PercentageInput
              label="Selling Cost Rate"
              value={sheet.selling_cost_rate}
              onSave={save("selling_cost_rate")}
            />
            <CurrencyInput
              label="Selling Concessions"
              value={sheet.selling_concessions}
              onSave={save("selling_concessions")}
            />
          </div>
        </div>

        {/* Section 8: Financing */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Section 8 — Financing</h3>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
            <PercentageInput label="LTC Ratio" value={sheet.ltc_ratio} onSave={save("ltc_ratio")} />
            <PercentageInput label="Interest Rate" value={sheet.interest_rate} onSave={save("interest_rate")} />
            <PercentageInput label="Cost of Capital" value={sheet.cost_of_capital} onSave={save("cost_of_capital")} />
          </div>
        </div>
      </div>

      {/* RIGHT: Results Column (sticky) */}
      <div className="xl:sticky xl:top-4 xl:self-start">
        <div className="space-y-4">
          {/* Verdicts */}
          <div className="grid grid-cols-2 gap-3">
            <VerdictCard
              label="Net Profit Margin"
              value={formatPercent(dealOutputs.net_profit_margin)}
              verdict={dealOutputs.profit_verdict}
            />
            <VerdictCard
              label="Land Cost Ratio"
              value={formatPercent(dealOutputs.land_cost_ratio)}
              verdict={dealOutputs.land_verdict}
            />
          </div>

          {/* Cost Summary */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Cost Summary</h3>
            <div className="space-y-1">
              <OutputRow label="Total Lot Basis" value={formatCurrency(dealOutputs.total_lot_basis)} />
              <OutputRow label="Sections 1-5" value={formatCurrency(dealOutputs.sections_1_to_5)} />
              <OutputRow label="Builder Fee (S6)" value={formatCurrency(dealOutputs.builder_fee)} />
              <OutputRow label="Contingency (S7)" value={formatCurrency(dealOutputs.contingency)} />
              <OutputRow label="Total Contract" value={formatCurrency(dealOutputs.total_contract_cost)} />
              <OutputRow label="Upgrades" value={formatCurrency(sheet.upgrades)} />
              <OutputRow label="Municipality Soft" value={formatCurrency(sheet.soft_costs)} />
              <OutputRow
                label="Site Work"
                value={formatCurrency(sheet.site_work_total + (sheet.other_site_costs ?? 0))}
              />
              <OutputRow label="Fixed Per-House" value={formatCurrency(dealOutputs.total_fixed_per_house)} />
              <div className="border-t border-border pt-1.5">
                <OutputRow label="Total Project Cost" value={formatCurrency(dealOutputs.total_project_cost)} bold />
              </div>
            </div>
          </div>

          {/* Financing */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Financing</h3>
            <div className="space-y-1">
              <OutputRow label="Loan Amount" value={formatCurrency(dealOutputs.loan_amount)} />
              <OutputRow label="Equity Required" value={formatCurrency(dealOutputs.equity_required)} />
              <OutputRow label="Interest Cost" value={formatCurrency(dealOutputs.interest_cost)} />
              <OutputRow label="Cost of Capital" value={formatCurrency(dealOutputs.cost_of_capital_amount)} />
              <div className="border-t border-border pt-1.5">
                <OutputRow label="Total All-In" value={formatCurrency(dealOutputs.total_all_in)} bold />
              </div>
            </div>
          </div>

          {/* Returns */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Returns</h3>
            <div className="space-y-1">
              <OutputRow label="Selling Costs" value={formatCurrency(dealOutputs.selling_costs)} />
              <OutputRow label="Net Proceeds" value={formatCurrency(dealOutputs.net_proceeds)} />
              <div className="border-t border-border pt-1.5">
                <OutputRow label="Net Profit" value={formatCurrency(dealOutputs.net_profit)} bold />
                <OutputRow label="Net Profit Margin" value={formatPercent(dealOutputs.net_profit_margin)} />
                <OutputRow label="Land Cost Ratio" value={formatPercent(dealOutputs.land_cost_ratio)} />
              </div>
            </div>
          </div>

          {/* Sensitivity Analysis */}
          <div className="rounded-lg border border-border bg-card p-4">
            <button
              type="button"
              onClick={() => setShowSensitivity(!showSensitivity)}
              className="flex w-full items-center justify-between text-left"
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Sensitivity Analysis</h3>
              <span className="text-xs text-muted">{showSensitivity ? "Hide" : "Show"}</span>
            </button>
            {showSensitivity && sensitivity && (
              <div className="mt-3 space-y-2">
                {[
                  sensitivity.base,
                  sensitivity.bestCase,
                  sensitivity.worstCase,
                  sensitivity.costOverrun10,
                  sensitivity.aspDecline10,
                  sensitivity.delay30Days,
                ].map((scenario) => (
                  <div
                    key={scenario.label}
                    className={`flex items-center justify-between rounded-md px-3 py-1.5 ${scenario.net_profit_margin < 0.05 ? "bg-red-50" : "bg-gray-50"}`}
                  >
                    <span className="text-xs text-foreground">{scenario.label}</span>
                    <span className="text-xs font-medium text-foreground">
                      {formatCurrency(scenario.net_profit)} ({formatPercent(scenario.net_profit_margin)})
                    </span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 text-xs text-muted">
                  <p>Breakeven ASP: {formatCurrency(sensitivity.breakevenASP)}</p>
                  <p>Min ASP for 5% NPM: {formatCurrency(sensitivity.minimumASP5pct)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OutputRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-xs text-muted">{label}</span>
      <span className={`font-mono text-xs ${bold ? "font-semibold text-foreground" : "text-foreground"}`}>{value}</span>
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
    <div className="rounded-lg border-2 bg-card p-3 text-center" style={{ borderColor: color }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-bold" style={{ color }}>
        {verdict}
      </p>
      <p className="mt-0.5 text-xs text-muted">{value}</p>
    </div>
  );
}

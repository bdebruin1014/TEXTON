import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { useCallback, useMemo } from "react";
import { AutoSaveField } from "@/components/forms/AutoSaveField";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { PercentageInput } from "@/components/forms/PercentageInput";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { FIXED_PER_HOUSE_FEES } from "@/lib/constants";
import { calculateDealSheet, type DealSheetInputs } from "@/lib/deal-engine";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatPercent } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/operations/deal-sheets/$dealSheetId")({
  component: DealSheetDetail,
});

interface DealSheetRow {
  id: string;
  name: string | null;
  deal_type: string | null;
  status: string;
  address: string | null;
  lot_purchase_price: number | null;
  closing_costs: number | null;
  sticks_bricks: number | null;
  upgrades: number | null;
  soft_costs: number | null;
  land_prep: number | null;
  site_specific: number | null;
  site_work_total: number | null;
  is_rch_related_owner: boolean | null;
  asset_sales_price: number | null;
  selling_cost_rate: number | null;
  selling_concessions: number | null;
  ltc_ratio: number | null;
  interest_rate: number | null;
  cost_of_capital: number | null;
  project_duration_days: number | null;
  created_at: string;
  updated_at: string;
}

function DealSheetDetail() {
  const { dealSheetId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: dealSheet, isLoading } = useQuery<DealSheetRow>({
    queryKey: ["deal-sheet", dealSheetId],
    queryFn: async () => {
      const { data, error } = await supabase.from("deal_sheets").select("*").eq("id", dealSheetId).single();
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("deal_sheets").update(updates).eq("id", dealSheetId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deal-sheet", dealSheetId] }),
  });

  const save = useCallback(
    (field: string) => async (value: string | number) => {
      await updateMutation.mutateAsync({ [field]: value });
    },
    [updateMutation],
  );

  const dealOutputs = useMemo(() => {
    if (!dealSheet) return null;
    const inputs: DealSheetInputs = {
      lot_purchase_price: dealSheet.lot_purchase_price ?? 0,
      closing_costs: dealSheet.closing_costs ?? 0,
      sticks_bricks: dealSheet.sticks_bricks ?? 0,
      upgrades: dealSheet.upgrades ?? 0,
      soft_costs: dealSheet.soft_costs ?? 0,
      land_prep: dealSheet.land_prep ?? 0,
      site_specific: dealSheet.site_specific ?? 0,
      site_work_total: dealSheet.site_work_total ?? 0,
      is_rch_related_owner: dealSheet.is_rch_related_owner ?? true,
      asset_sales_price: dealSheet.asset_sales_price ?? 0,
      selling_cost_rate: dealSheet.selling_cost_rate ?? 0.085,
      selling_concessions: dealSheet.selling_concessions ?? 0,
      ltc_ratio: dealSheet.ltc_ratio ?? 0.85,
      interest_rate: dealSheet.interest_rate ?? 0.1,
      cost_of_capital: dealSheet.cost_of_capital ?? 0.16,
      project_duration_days: dealSheet.project_duration_days ?? 120,
    };
    return calculateDealSheet(inputs);
  }, [dealSheet]);

  if (isLoading || !dealSheet) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link
            to="/operations/deal-sheets"
            className="flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors"
          >
            {"←"} Back to Deal Sheets
          </Link>
        </div>
        <FormSkeleton fields={8} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/operations/deal-sheets"
          className="mb-3 flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors"
        >
          {"←"} Back to Deal Sheets
        </Link>
        <h1 className="text-xl font-semibold text-foreground">{dealSheet.name ?? "Untitled Deal Sheet"}</h1>
        {dealSheet.address && <p className="mt-0.5 text-sm text-muted">{dealSheet.address}</p>}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Inputs Column */}
        <div className="space-y-6">
          {/* General Info */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">General</h3>
            <div className="space-y-4">
              <AutoSaveField label="Name" value={dealSheet.name} onSave={save("name")} placeholder="Deal sheet name" />
              <AutoSaveField
                label="Address"
                value={dealSheet.address}
                onSave={save("address")}
                placeholder="Property address"
              />
            </div>
          </div>

          {/* Lot Acquisition */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Lot Acquisition</h3>
            <div className="space-y-4">
              <CurrencyInput
                label="Lot Purchase Price"
                value={dealSheet.lot_purchase_price}
                onSave={save("lot_purchase_price")}
              />
              <CurrencyInput label="Closing Costs" value={dealSheet.closing_costs} onSave={save("closing_costs")} />
            </div>
          </div>

          {/* Construction Costs */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Construction Costs</h3>
            <div className="space-y-4">
              <CurrencyInput label="Sticks & Bricks" value={dealSheet.sticks_bricks} onSave={save("sticks_bricks")} />
              <CurrencyInput label="Upgrades" value={dealSheet.upgrades} onSave={save("upgrades")} />
              <CurrencyInput label="Soft Costs" value={dealSheet.soft_costs} onSave={save("soft_costs")} />
              <CurrencyInput label="Land Prep" value={dealSheet.land_prep} onSave={save("land_prep")} />
              <CurrencyInput label="Site Specific" value={dealSheet.site_specific} onSave={save("site_specific")} />
              <CurrencyInput
                label="Site Work Total"
                value={dealSheet.site_work_total}
                onSave={save("site_work_total")}
              />
            </div>
          </div>

          {/* Sales */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Sales</h3>
            <div className="space-y-4">
              <CurrencyInput
                label="Anticipated Sales Price"
                value={dealSheet.asset_sales_price}
                onSave={save("asset_sales_price")}
              />
              <PercentageInput
                label="Selling Cost Rate"
                value={dealSheet.selling_cost_rate ?? 0.085}
                onSave={save("selling_cost_rate")}
                autoValue={0.085}
              />
              <CurrencyInput
                label="Selling Concessions"
                value={dealSheet.selling_concessions}
                onSave={save("selling_concessions")}
              />
            </div>
          </div>

          {/* Financing */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Financing</h3>
            <div className="space-y-4">
              <PercentageInput
                label="LTC Ratio"
                value={dealSheet.ltc_ratio ?? 0.85}
                onSave={save("ltc_ratio")}
                autoValue={0.85}
              />
              <PercentageInput
                label="Interest Rate"
                value={dealSheet.interest_rate ?? 0.1}
                onSave={save("interest_rate")}
                autoValue={0.1}
              />
              <PercentageInput
                label="Cost of Capital"
                value={dealSheet.cost_of_capital ?? 0.16}
                onSave={save("cost_of_capital")}
                autoValue={0.16}
              />
              <AutoSaveField
                label="Project Duration (days)"
                value={dealSheet.project_duration_days ?? 120}
                onSave={save("project_duration_days")}
                type="number"
              />
            </div>
          </div>

          {/* Fixed Costs */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Fixed Per-House Fees</h3>
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
  STRONG: "#3D7A4E",
  GOOD: "var(--color-primary-accent)",
  ACCEPTABLE: "var(--color-primary-accent)",
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
      <p className="mt-1 text-xl font-medium" style={{ color }}>
        {verdict}
      </p>
      <p className="mt-0.5 text-sm text-muted">{value}</p>
    </div>
  );
}

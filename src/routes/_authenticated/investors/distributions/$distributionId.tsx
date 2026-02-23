import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import {
  calculateWaterfall,
  type WaterfallInput,
  type WaterfallInvestor,
  type WaterfallOutput,
  type WaterfallTierConfig,
} from "@/lib/waterfall-engine";

export const Route = createFileRoute("/_authenticated/investors/distributions/$distributionId")({
  component: DistributionDetail,
});

interface Distribution {
  id: string;
  distribution_number: string | null;
  fund_id: string | null;
  fund_name: string | null;
  distribution_date: string;
  total_amount: number | null;
  distribution_type: string | null;
  status: string;
}

interface Investment {
  id: string;
  investor_name: string | null;
  is_gp: boolean;
  called_amount: number | null;
  distributed_amount: number | null;
  contribution_date: string | null;
  ownership_pct: number | null;
}

interface WaterfallTierRow {
  id: string;
  tier_order: number;
  tier_name: string;
  pref_rate: number | null;
  catch_up_pct: number | null;
  gp_split_pct: number | null;
  lp_split_pct: number | null;
}

interface DistCalc {
  id: string;
  distribution_id: string;
  fund_id: string;
  total_distributable: number;
  total_allocated: number;
  input_snapshot: unknown;
  output_snapshot: unknown;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
}

interface LineItem {
  id: string;
  distribution_id: string;
  calculation_id: string;
  investment_id: string;
  investor_name: string | null;
  tier_name: string;
  tier_order: number;
  amount: number;
  is_gp: boolean;
}

const TIER_LABELS: Record<string, string> = {
  return_of_capital: "Return of Capital",
  preferred_return: "Pref Return",
  catch_up: "Catch-Up",
  profit_split: "Profit Split",
};

function DistributionDetail() {
  const { distributionId } = Route.useParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [waterfallResult, setWaterfallResult] = useState<WaterfallOutput | null>(null);

  const { data: userRole } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("user_profiles").select("role").eq("user_id", user.id).single();
      return data?.role ?? null;
    },
    enabled: !!user?.id,
  });

  const { data: distribution, isLoading } = useQuery<Distribution>({
    queryKey: ["distribution", distributionId],
    queryFn: async () => {
      const { data, error } = await supabase.from("distributions").select("*").eq("id", distributionId).single();
      if (error) throw error;
      return data;
    },
  });

  const fundId = distribution?.fund_id;

  const { data: investments = [] } = useQuery<Investment[]>({
    queryKey: ["fund-investments", fundId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investments")
        .select("id, investor_name, is_gp, called_amount, distributed_amount, contribution_date, ownership_pct")
        .eq("fund_id", fundId!)
        .order("investor_name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!fundId,
  });

  const { data: tiers = [] } = useQuery<WaterfallTierRow[]>({
    queryKey: ["waterfall-tiers", fundId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waterfall_tiers")
        .select("*")
        .eq("fund_id", fundId!)
        .order("tier_order");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!fundId,
  });

  const { data: existingCalc } = useQuery<DistCalc | null>({
    queryKey: ["distribution-calculation", distributionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("distribution_calculations")
        .select("*")
        .eq("distribution_id", distributionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: existingLineItems = [] } = useQuery<LineItem[]>({
    queryKey: ["distribution-line-items", distributionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("distribution_line_items")
        .select("*")
        .eq("distribution_id", distributionId)
        .order("tier_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Prior distribution line items for this fund (excluding current distribution)
  const { data: priorLineItems = [] } = useQuery<LineItem[]>({
    queryKey: ["prior-distribution-items", fundId, distributionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("distribution_line_items")
        .select("*")
        .neq("distribution_id", distributionId);
      if (error) throw error;
      // Filter to items for investments in this fund
      const investmentIds = new Set(investments.map((i) => i.id));
      return (data ?? []).filter((item) => investmentIds.has(item.investment_id));
    },
    enabled: !!fundId && investments.length > 0,
  });

  // Build waterfall input from DB data
  function buildWaterfallInput(): WaterfallInput | null {
    if (!distribution || !fundId || investments.length === 0 || tiers.length === 0) return null;

    const waterfallInvestors: WaterfallInvestor[] = investments.map((inv) => {
      const priorItems = priorLineItems.filter((li) => li.investment_id === inv.id);
      const sumByTier = (tierName: string) =>
        priorItems.filter((li) => li.tier_name === tierName).reduce((s, li) => s + li.amount, 0);

      return {
        investment_id: inv.id,
        investor_name: inv.investor_name ?? "Unknown",
        is_gp: inv.is_gp,
        called_amount: inv.called_amount ?? 0,
        contribution_date: inv.contribution_date ?? distribution.distribution_date,
        prior_return_of_capital: sumByTier("return_of_capital"),
        prior_preferred_return: sumByTier("preferred_return"),
        prior_catch_up: sumByTier("catch_up"),
        prior_profit_split: sumByTier("profit_split"),
      };
    });

    const tierConfigs: WaterfallTierConfig[] = tiers.map((t) => ({
      tier_name: t.tier_name as WaterfallTierConfig["tier_name"],
      tier_order: t.tier_order,
      pref_rate: t.pref_rate ?? undefined,
      catch_up_pct: t.catch_up_pct ?? undefined,
      gp_split_pct: t.gp_split_pct ?? undefined,
      lp_split_pct: t.lp_split_pct ?? undefined,
    }));

    return {
      distribution_date: distribution.distribution_date,
      total_distributable: distribution.total_amount ?? 0,
      investors: waterfallInvestors,
      tiers: tierConfigs,
    };
  }

  function handleCalculate() {
    const input = buildWaterfallInput();
    if (!input) {
      toast.error("Missing data for calculation");
      return;
    }
    const result = calculateWaterfall(input);
    setWaterfallResult(result);
    toast.success("Waterfall calculated");
  }

  const saveCalculation = useMutation({
    mutationFn: async () => {
      if (!waterfallResult || !distribution || !fundId) throw new Error("No calculation to save");
      const input = buildWaterfallInput();

      // Upsert calculation
      const { data: calc, error: calcError } = await supabase
        .from("distribution_calculations")
        .insert({
          distribution_id: distributionId,
          fund_id: fundId,
          total_distributable: distribution.total_amount ?? 0,
          total_allocated: waterfallResult.total_distributed,
          input_snapshot: input,
          output_snapshot: waterfallResult,
          calculated_by: user?.id,
          status: "draft",
        })
        .select("id")
        .single();
      if (calcError) throw calcError;

      // Delete old line items for this distribution
      await supabase.from("distribution_line_items").delete().eq("distribution_id", distributionId);

      // Insert new line items
      const lineItems = waterfallResult.line_items.map((li) => ({
        distribution_id: distributionId,
        calculation_id: calc.id,
        investment_id: li.investment_id,
        investor_name: li.investor_name,
        tier_name: li.tier_name,
        tier_order: li.tier_order,
        amount: li.amount,
        is_gp: li.is_gp,
      }));
      if (lineItems.length > 0) {
        const { error: liError } = await supabase.from("distribution_line_items").insert(lineItems);
        if (liError) throw liError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribution-calculation", distributionId] });
      queryClient.invalidateQueries({ queryKey: ["distribution-line-items", distributionId] });
      toast.success("Calculation saved");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save calculation"),
  });

  const approveCalculation = useMutation({
    mutationFn: async () => {
      if (!existingCalc) throw new Error("No calculation to approve");
      const { error } = await supabase
        .from("distribution_calculations")
        .update({ status: "approved", approved_by: user?.id, approved_at: new Date().toISOString() })
        .eq("id", existingCalc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribution-calculation", distributionId] });
      toast.success("Calculation approved");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to approve"),
  });

  const recordDistribution = useMutation({
    mutationFn: async () => {
      if (!existingCalc || existingCalc.status !== "approved") throw new Error("Must be approved first");

      // Update each investment's distributed_amount
      for (const inv of investments) {
        const investorItems = existingLineItems.filter((li) => li.investment_id === inv.id);
        const totalForInvestor = investorItems.reduce((s, li) => s + li.amount, 0);
        if (totalForInvestor > 0) {
          const newDistributed = (inv.distributed_amount ?? 0) + totalForInvestor;
          const { error } = await supabase
            .from("investments")
            .update({ distributed_amount: newDistributed })
            .eq("id", inv.id);
          if (error) throw error;
        }
      }

      // Update distribution status to Paid
      const { error: distErr } = await supabase
        .from("distributions")
        .update({ status: "Paid" })
        .eq("id", distributionId);
      if (distErr) throw distErr;

      // Update calculation status
      const { error: calcErr } = await supabase
        .from("distribution_calculations")
        .update({ status: "recorded" })
        .eq("id", existingCalc.id);
      if (calcErr) throw calcErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribution", distributionId] });
      queryClient.invalidateQueries({ queryKey: ["distribution-calculation", distributionId] });
      queryClient.invalidateQueries({ queryKey: ["fund-investments", fundId] });
      toast.success("Distribution recorded — investor balances updated");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to record distribution"),
  });

  // Use saved results if available, otherwise live calculation
  const displayResult = waterfallResult ?? (existingCalc?.output_snapshot as WaterfallOutput | undefined) ?? null;

  if (isLoading) return <FormSkeleton />;
  if (!distribution) return <EmptyState title="Distribution not found" description="This record may have been removed" />;

  const isDraft = distribution.status === "Draft";
  const missingTiers = tiers.length === 0;
  const missingContribDates = investments.some((inv) => !inv.contribution_date);
  const isAdmin = userRole === "admin";

  return (
    <div>
      {/* Section 1: Header */}
      <div className="mb-6">
        <Link
          to="/investors/distributions"
          className="mb-3 flex items-center gap-1 text-sm text-primary hover:underline"
        >
          {"\u2190"} Back to Distributions
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">
            {distribution.distribution_number ?? "Distribution"}
          </h1>
          <StatusBadge status={distribution.status} />
        </div>
        <p className="mt-0.5 text-sm text-muted">
          {distribution.fund_name ?? "No fund"} · {distribution.distribution_date} ·{" "}
          {formatCurrency(distribution.total_amount ?? 0)}
        </p>
      </div>

      {/* Section 2: Calculate Panel */}
      {isDraft && (
        <div className="mb-8 rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Calculate Waterfall</h2>

          <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted">Distribution Date:</span>{" "}
              <span className="font-medium">{distribution.distribution_date}</span>
            </div>
            <div>
              <span className="text-muted">Total Amount:</span>{" "}
              <span className="font-medium">{formatCurrency(distribution.total_amount ?? 0)}</span>
            </div>
          </div>

          {!fundId && (
            <div className="mb-4 rounded border border-warning-border bg-warning-bg p-3 text-sm text-warning-text">
              No fund linked to this distribution. Edit the distribution to assign a fund.
            </div>
          )}
          {fundId && missingTiers && (
            <div className="mb-4 rounded border border-warning-border bg-warning-bg p-3 text-sm text-warning-text">
              No waterfall tiers configured for this fund.{" "}
              <Link to="/investors/$fundId" params={{ fundId: fundId }} className="underline">
                Configure tiers
              </Link>
            </div>
          )}
          {fundId && missingContribDates && (
            <div className="mb-4 rounded border border-warning-border bg-warning-bg p-3 text-sm text-warning-text">
              Some investments are missing contribution dates. The distribution date will be used as a fallback.
            </div>
          )}

          <button
            type="button"
            onClick={handleCalculate}
            disabled={!fundId || missingTiers || investments.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover disabled:opacity-50"
          >
            Calculate Waterfall
          </button>
        </div>
      )}

      {/* Section 3: Results Table */}
      {displayResult && (
        <div className="mb-8 rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Waterfall Results</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase text-muted">
                  <th className="px-3 py-2">Investor</th>
                  <th className="px-3 py-2">GP/LP</th>
                  <th className="px-3 py-2 text-right">Return of Capital</th>
                  <th className="px-3 py-2 text-right">Pref Return</th>
                  <th className="px-3 py-2 text-right">Catch-Up</th>
                  <th className="px-3 py-2 text-right">Profit Split</th>
                  <th className="px-3 py-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {displayResult.investors.map((inv) => (
                  <tr key={inv.investment_id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium">{inv.investor_name}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          inv.is_gp ? "bg-info-bg text-info-text" : "bg-accent text-muted-foreground"
                        }`}
                      >
                        {inv.is_gp ? "GP" : "LP"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {formatCurrency(inv.return_of_capital)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {formatCurrency(inv.preferred_return)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{formatCurrency(inv.catch_up)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{formatCurrency(inv.profit_split)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs font-semibold">
                      {formatCurrency(inv.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-semibold">
                  <td className="px-3 py-2" colSpan={2}>
                    Totals
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {formatCurrency(displayResult.investors.reduce((s, i) => s + i.return_of_capital, 0))}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {formatCurrency(displayResult.investors.reduce((s, i) => s + i.preferred_return, 0))}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {formatCurrency(displayResult.investors.reduce((s, i) => s + i.catch_up, 0))}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {formatCurrency(displayResult.investors.reduce((s, i) => s + i.profit_split, 0))}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs font-semibold">
                    {formatCurrency(displayResult.total_distributed)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {displayResult.remaining_undistributed > 0 && (
            <div className="mt-4 rounded border border-warning-border bg-warning-bg p-3 text-sm text-warning-text">
              Remaining undistributed: {formatCurrency(displayResult.remaining_undistributed)}
            </div>
          )}

          {/* Tier Breakdown */}
          <div className="mt-4 flex flex-wrap gap-3">
            {displayResult.tier_breakdown.map((tier) => (
              <div key={tier.tier_name} className="rounded border border-border px-3 py-2 text-xs">
                <span className="text-muted">{TIER_LABELS[tier.tier_name] ?? tier.tier_name}:</span>{" "}
                <span className="font-medium">{formatCurrency(tier.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Actions */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Actions</h2>
        <div className="flex flex-wrap gap-3">
          {/* Save Calculation */}
          {isDraft && waterfallResult && (
            <button
              type="button"
              onClick={() => saveCalculation.mutate()}
              disabled={saveCalculation.isPending}
              className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover disabled:opacity-50"
            >
              {saveCalculation.isPending ? "Saving..." : "Save Calculation"}
            </button>
          )}

          {/* Approve (admin only) */}
          {existingCalc?.status === "draft" && isAdmin && (
            <button
              type="button"
              onClick={() => approveCalculation.mutate()}
              disabled={approveCalculation.isPending}
              className="rounded-lg border border-success-border bg-success-bg px-4 py-2 text-sm font-semibold text-success-text transition-colors hover:opacity-80 disabled:opacity-50"
            >
              {approveCalculation.isPending ? "Approving..." : "Approve"}
            </button>
          )}

          {/* Record Distribution */}
          {existingCalc?.status === "approved" && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Record this distribution? This will update investor balances and mark as Paid.")) {
                  recordDistribution.mutate();
                }
              }}
              disabled={recordDistribution.isPending}
              className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover disabled:opacity-50"
            >
              {recordDistribution.isPending ? "Recording..." : "Record Distribution"}
            </button>
          )}

          {existingCalc?.status === "recorded" && (
            <div className="rounded border border-success-border bg-success-bg px-4 py-2 text-sm text-success-text">
              Distribution recorded and investor balances updated
            </div>
          )}

          {!existingCalc && !waterfallResult && (
            <p className="text-sm text-muted">Calculate a waterfall to see available actions.</p>
          )}
        </div>
      </div>
    </div>
  );
}

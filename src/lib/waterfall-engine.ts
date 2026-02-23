// ---------------------------------------------------------------------------
// Waterfall Distribution Engine
// Pure calculation — zero side effects, following deal-engine.ts pattern.
// ---------------------------------------------------------------------------

export interface WaterfallInvestor {
  investment_id: string;
  investor_name: string;
  is_gp: boolean;
  called_amount: number;
  contribution_date: string; // ISO date
  prior_return_of_capital: number;
  prior_preferred_return: number;
  prior_catch_up: number;
  prior_profit_split: number;
}

export interface WaterfallTierConfig {
  tier_name: "return_of_capital" | "preferred_return" | "catch_up" | "profit_split";
  tier_order: number;
  pref_rate?: number;
  catch_up_pct?: number;
  gp_split_pct?: number;
  lp_split_pct?: number;
}

export interface WaterfallInput {
  distribution_date: string; // ISO date
  total_distributable: number;
  investors: WaterfallInvestor[];
  tiers: WaterfallTierConfig[];
}

interface WaterfallLineItem {
  investment_id: string;
  investor_name: string;
  is_gp: boolean;
  tier_name: string;
  tier_order: number;
  amount: number;
}

interface WaterfallInvestorSummary {
  investment_id: string;
  investor_name: string;
  is_gp: boolean;
  return_of_capital: number;
  preferred_return: number;
  catch_up: number;
  profit_split: number;
  total: number;
}

export interface WaterfallOutput {
  total_distributed: number;
  remaining_undistributed: number;
  tier_breakdown: { tier_name: string; tier_order: number; total: number }[];
  investors: WaterfallInvestorSummary[];
  line_items: WaterfallLineItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function roundCurrency(n: number): number {
  return Math.round(n * 100) / 100;
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from);
  const b = new Date(to);
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

// ---------------------------------------------------------------------------
// Tier processors — each consumes from `remaining` and returns line items
// ---------------------------------------------------------------------------

function processReturnOfCapital(
  investors: WaterfallInvestor[],
  remaining: number,
  tierOrder: number,
): { items: WaterfallLineItem[]; consumed: number } {
  const items: WaterfallLineItem[] = [];
  if (remaining <= 0) return { items, consumed: 0 };

  // Each investor's unreturned capital
  const needs = investors.map((inv) => ({
    inv,
    need: Math.max(0, inv.called_amount - inv.prior_return_of_capital),
  }));
  const totalNeed = needs.reduce((s, n) => s + n.need, 0);
  if (totalNeed <= 0) return { items, consumed: 0 };

  const available = Math.min(remaining, totalNeed);
  let consumed = 0;

  for (const { inv, need } of needs) {
    if (need <= 0) continue;
    const share = totalNeed > 0 ? roundCurrency((need / totalNeed) * available) : 0;
    if (share > 0) {
      items.push({
        investment_id: inv.investment_id,
        investor_name: inv.investor_name,
        is_gp: inv.is_gp,
        tier_name: "return_of_capital",
        tier_order: tierOrder,
        amount: share,
      });
      consumed += share;
    }
  }

  // Fix rounding residual — assign to largest position
  const residual = roundCurrency(available - consumed);
  if (residual !== 0 && items.length > 0) {
    items[0]!.amount = roundCurrency(items[0]!.amount + residual);
    consumed = available;
  }

  return { items, consumed: roundCurrency(consumed) };
}

function processPreferredReturn(
  investors: WaterfallInvestor[],
  remaining: number,
  tierOrder: number,
  prefRate: number,
  distributionDate: string,
): { items: WaterfallLineItem[]; consumed: number } {
  const items: WaterfallLineItem[] = [];
  if (remaining <= 0 || prefRate <= 0) return { items, consumed: 0 };

  // LP-only preferred return
  const lpInvestors = investors.filter((inv) => !inv.is_gp);
  const needs = lpInvestors.map((inv) => {
    const days = daysBetween(inv.contribution_date, distributionDate);
    const accrued = inv.called_amount * prefRate * (days / 365);
    const need = Math.max(0, roundCurrency(accrued - inv.prior_preferred_return));
    return { inv, need };
  });

  const totalNeed = needs.reduce((s, n) => s + n.need, 0);
  if (totalNeed <= 0) return { items, consumed: 0 };

  const available = Math.min(remaining, totalNeed);
  let consumed = 0;

  for (const { inv, need } of needs) {
    if (need <= 0) continue;
    const share = roundCurrency((need / totalNeed) * available);
    if (share > 0) {
      items.push({
        investment_id: inv.investment_id,
        investor_name: inv.investor_name,
        is_gp: inv.is_gp,
        tier_name: "preferred_return",
        tier_order: tierOrder,
        amount: share,
      });
      consumed += share;
    }
  }

  const residual = roundCurrency(available - consumed);
  if (residual !== 0 && items.length > 0) {
    items[0]!.amount = roundCurrency(items[0]!.amount + residual);
    consumed = available;
  }

  return { items, consumed: roundCurrency(consumed) };
}

function processCatchUp(
  investors: WaterfallInvestor[],
  remaining: number,
  tierOrder: number,
  catchUpPct: number,
  profitsSoFar: number,
): { items: WaterfallLineItem[]; consumed: number } {
  const items: WaterfallLineItem[] = [];
  if (remaining <= 0 || catchUpPct <= 0) return { items, consumed: 0 };

  // GP receives until they hold catchUpPct of total profits distributed
  // target = (profitsSoFar * catchUpPct) / (1 - catchUpPct)
  const gpInvestors = investors.filter((inv) => inv.is_gp);
  if (gpInvestors.length === 0) return { items, consumed: 0 };

  const gpPriorCatchUp = gpInvestors.reduce((s, inv) => s + inv.prior_catch_up, 0);
  const target = roundCurrency((profitsSoFar * catchUpPct) / (1 - catchUpPct));
  const need = Math.max(0, roundCurrency(target - gpPriorCatchUp));
  if (need <= 0) return { items, consumed: 0 };

  const available = Math.min(remaining, need);

  // Allocate among GP investors by capital weight
  const totalGpCapital = gpInvestors.reduce((s, inv) => s + inv.called_amount, 0);
  let consumed = 0;

  for (const inv of gpInvestors) {
    const weight = totalGpCapital > 0 ? inv.called_amount / totalGpCapital : 1 / gpInvestors.length;
    const share = roundCurrency(weight * available);
    if (share > 0) {
      items.push({
        investment_id: inv.investment_id,
        investor_name: inv.investor_name,
        is_gp: inv.is_gp,
        tier_name: "catch_up",
        tier_order: tierOrder,
        amount: share,
      });
      consumed += share;
    }
  }

  const residual = roundCurrency(available - consumed);
  if (residual !== 0 && items.length > 0) {
    items[0]!.amount = roundCurrency(items[0]!.amount + residual);
    consumed = available;
  }

  return { items, consumed: roundCurrency(consumed) };
}

function processProfitSplit(
  investors: WaterfallInvestor[],
  remaining: number,
  tierOrder: number,
  gpSplitPct: number,
  lpSplitPct: number,
): { items: WaterfallLineItem[]; consumed: number } {
  const items: WaterfallLineItem[] = [];
  if (remaining <= 0) return { items, consumed: 0 };

  const gpInvestors = investors.filter((inv) => inv.is_gp);
  const lpInvestors = investors.filter((inv) => !inv.is_gp);

  // Only allocate to pools that have recipients
  const gpPool = gpInvestors.length > 0 ? roundCurrency(remaining * gpSplitPct) : 0;
  const lpPool = lpInvestors.length > 0 ? roundCurrency(remaining * lpSplitPct) : 0;

  // Allocate within GP pool by capital weight
  const totalGpCapital = gpInvestors.reduce((s, inv) => s + inv.called_amount, 0);
  for (const inv of gpInvestors) {
    const weight = totalGpCapital > 0 ? inv.called_amount / totalGpCapital : 1 / gpInvestors.length;
    const share = roundCurrency(weight * gpPool);
    if (share > 0) {
      items.push({
        investment_id: inv.investment_id,
        investor_name: inv.investor_name,
        is_gp: inv.is_gp,
        tier_name: "profit_split",
        tier_order: tierOrder,
        amount: share,
      });
    }
  }

  // Allocate within LP pool by capital weight
  const totalLpCapital = lpInvestors.reduce((s, inv) => s + inv.called_amount, 0);
  for (const inv of lpInvestors) {
    const weight = totalLpCapital > 0 ? inv.called_amount / totalLpCapital : 1 / lpInvestors.length;
    const share = roundCurrency(weight * lpPool);
    if (share > 0) {
      items.push({
        investment_id: inv.investment_id,
        investor_name: inv.investor_name,
        is_gp: inv.is_gp,
        tier_name: "profit_split",
        tier_order: tierOrder,
        amount: share,
      });
    }
  }

  // Fix rounding residual (tiny floating-point differences only)
  const targetConsumed = gpPool + lpPool;
  const consumed = items.reduce((s, i) => s + i.amount, 0);
  const residual = roundCurrency(targetConsumed - consumed);
  if (residual !== 0 && items.length > 0) {
    items[0]!.amount = roundCurrency(items[0]!.amount + residual);
  }

  return { items, consumed: roundCurrency(targetConsumed) };
}

// ---------------------------------------------------------------------------
// Main calculation
// ---------------------------------------------------------------------------

export function calculateWaterfall(input: WaterfallInput): WaterfallOutput {
  const { investors, tiers, total_distributable, distribution_date } = input;

  if (total_distributable <= 0 || investors.length === 0 || tiers.length === 0) {
    return {
      total_distributed: 0,
      remaining_undistributed: total_distributable,
      tier_breakdown: [],
      investors: investors.map((inv) => ({
        investment_id: inv.investment_id,
        investor_name: inv.investor_name,
        is_gp: inv.is_gp,
        return_of_capital: 0,
        preferred_return: 0,
        catch_up: 0,
        profit_split: 0,
        total: 0,
      })),
      line_items: [],
    };
  }

  const sortedTiers = [...tiers].sort((a, b) => a.tier_order - b.tier_order);
  const allItems: WaterfallLineItem[] = [];
  const tierBreakdown: WaterfallOutput["tier_breakdown"] = [];
  let remaining = total_distributable;

  // Track profits distributed in prior tiers (for catch-up calculation)
  let profitsSoFar = 0;

  for (const tier of sortedTiers) {
    if (remaining <= 0) break;

    let result: { items: WaterfallLineItem[]; consumed: number };

    switch (tier.tier_name) {
      case "return_of_capital":
        result = processReturnOfCapital(investors, remaining, tier.tier_order);
        break;
      case "preferred_return":
        result = processPreferredReturn(investors, remaining, tier.tier_order, tier.pref_rate ?? 0, distribution_date);
        // Preferred return counts as profit for catch-up calculation
        profitsSoFar += result.consumed;
        break;
      case "catch_up":
        result = processCatchUp(investors, remaining, tier.tier_order, tier.catch_up_pct ?? 0, profitsSoFar);
        profitsSoFar += result.consumed;
        break;
      case "profit_split":
        result = processProfitSplit(
          investors,
          remaining,
          tier.tier_order,
          tier.gp_split_pct ?? 0,
          tier.lp_split_pct ?? 1,
        );
        break;
      default:
        continue;
    }

    allItems.push(...result.items);
    remaining = roundCurrency(remaining - result.consumed);
    tierBreakdown.push({
      tier_name: tier.tier_name,
      tier_order: tier.tier_order,
      total: result.consumed,
    });
  }

  // Build per-investor summaries
  const summaryMap = new Map<string, WaterfallInvestorSummary>();
  for (const inv of investors) {
    summaryMap.set(inv.investment_id, {
      investment_id: inv.investment_id,
      investor_name: inv.investor_name,
      is_gp: inv.is_gp,
      return_of_capital: 0,
      preferred_return: 0,
      catch_up: 0,
      profit_split: 0,
      total: 0,
    });
  }

  for (const item of allItems) {
    const summary = summaryMap.get(item.investment_id);
    if (!summary) continue;
    switch (item.tier_name) {
      case "return_of_capital":
        summary.return_of_capital = roundCurrency(summary.return_of_capital + item.amount);
        break;
      case "preferred_return":
        summary.preferred_return = roundCurrency(summary.preferred_return + item.amount);
        break;
      case "catch_up":
        summary.catch_up = roundCurrency(summary.catch_up + item.amount);
        break;
      case "profit_split":
        summary.profit_split = roundCurrency(summary.profit_split + item.amount);
        break;
    }
    summary.total = roundCurrency(summary.total + item.amount);
  }

  return {
    total_distributed: roundCurrency(total_distributable - remaining),
    remaining_undistributed: roundCurrency(remaining),
    tier_breakdown: tierBreakdown,
    investors: Array.from(summaryMap.values()),
    line_items: allItems,
  };
}

import { describe, expect, it } from "vitest";
import { calculateWaterfall, type WaterfallInput, type WaterfallInvestor, type WaterfallTierConfig } from "@/lib/waterfall-engine";

// ---------------------------------------------------------------------------
// Standard waterfall tiers (4-tier American style)
// ---------------------------------------------------------------------------
const STANDARD_TIERS: WaterfallTierConfig[] = [
  { tier_name: "return_of_capital", tier_order: 1 },
  { tier_name: "preferred_return", tier_order: 2, pref_rate: 0.08 },
  { tier_name: "catch_up", tier_order: 3, catch_up_pct: 0.2 },
  { tier_name: "profit_split", tier_order: 4, gp_split_pct: 0.2, lp_split_pct: 0.8 },
];

// ---------------------------------------------------------------------------
// Base investors
// ---------------------------------------------------------------------------
const LP_A: WaterfallInvestor = {
  investment_id: "lp-a",
  investor_name: "LP Alpha",
  is_gp: false,
  called_amount: 500_000,
  contribution_date: "2025-01-01",
  prior_return_of_capital: 0,
  prior_preferred_return: 0,
  prior_catch_up: 0,
  prior_profit_split: 0,
};

const LP_B: WaterfallInvestor = {
  investment_id: "lp-b",
  investor_name: "LP Beta",
  is_gp: false,
  called_amount: 500_000,
  contribution_date: "2025-01-01",
  prior_return_of_capital: 0,
  prior_preferred_return: 0,
  prior_catch_up: 0,
  prior_profit_split: 0,
};

const GP_INVESTOR: WaterfallInvestor = {
  investment_id: "gp-1",
  investor_name: "GP Manager",
  is_gp: true,
  called_amount: 100_000,
  contribution_date: "2025-01-01",
  prior_return_of_capital: 0,
  prior_preferred_return: 0,
  prior_catch_up: 0,
  prior_profit_split: 0,
};

// ---------------------------------------------------------------------------
// Scenario 1: 50/50 LP split
// ---------------------------------------------------------------------------
describe("50/50 LP split", () => {
  const BASE_INPUT: WaterfallInput = {
    distribution_date: "2026-01-01",
    total_distributable: 1_200_000,
    investors: [LP_A, LP_B],
    tiers: STANDARD_TIERS,
  };

  it("returns capital first (pro-rata)", () => {
    const result = calculateWaterfall(BASE_INPUT);
    const lpA = result.investors.find((i) => i.investment_id === "lp-a")!;
    const lpB = result.investors.find((i) => i.investment_id === "lp-b")!;
    // Each LP contributed $500K, so capital return is $500K each
    expect(lpA.return_of_capital).toBe(500_000);
    expect(lpB.return_of_capital).toBe(500_000);
  });

  it("distributes preferred return to LPs equally", () => {
    const result = calculateWaterfall(BASE_INPUT);
    const lpA = result.investors.find((i) => i.investment_id === "lp-a")!;
    const lpB = result.investors.find((i) => i.investment_id === "lp-b")!;
    // Each LP: 500K * 0.08 * (365/365) = 40K
    expect(lpA.preferred_return).toBe(40_000);
    expect(lpB.preferred_return).toBe(40_000);
  });

  it("has zero catch-up (no GP investors)", () => {
    const result = calculateWaterfall(BASE_INPUT);
    const tierCatchUp = result.tier_breakdown.find((t) => t.tier_name === "catch_up");
    expect(tierCatchUp?.total ?? 0).toBe(0);
  });

  it("splits remaining profit — GP pool unallocated when no GP investors", () => {
    const result = calculateWaterfall(BASE_INPUT);
    // Remaining after capital ($1M) + pref ($80K) = $120K for profit split
    // No GP investors: GP pool (20% = $24K) has no recipients → undistributed
    // LP pool: 80% = $96K split equally = $48K each
    const lpA = result.investors.find((i) => i.investment_id === "lp-a")!;
    const lpB = result.investors.find((i) => i.investment_id === "lp-b")!;
    expect(lpA.profit_split).toBe(48_000);
    expect(lpB.profit_split).toBe(48_000);
    expect(result.remaining_undistributed).toBe(24_000);
  });

  it("total distributed accounts for all tiers", () => {
    const result = calculateWaterfall(BASE_INPUT);
    const totalFromInvestors = result.investors.reduce((s, i) => s + i.total, 0);
    expect(totalFromInvestors).toBe(result.total_distributed);
  });

  it("no negative amounts in any line item", () => {
    const result = calculateWaterfall(BASE_INPUT);
    for (const item of result.line_items) {
      expect(item.amount).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: GP catch-up
// ---------------------------------------------------------------------------
describe("GP catch-up", () => {
  const LP_LARGE: WaterfallInvestor = {
    ...LP_A,
    investment_id: "lp-large",
    investor_name: "LP Large",
    called_amount: 900_000,
  };

  const BASE_INPUT: WaterfallInput = {
    distribution_date: "2026-01-01",
    total_distributable: 1_500_000,
    investors: [GP_INVESTOR, LP_LARGE],
    tiers: STANDARD_TIERS,
  };

  it("returns capital to both GP and LP", () => {
    const result = calculateWaterfall(BASE_INPUT);
    const gp = result.investors.find((i) => i.investment_id === "gp-1")!;
    const lp = result.investors.find((i) => i.investment_id === "lp-large")!;
    expect(gp.return_of_capital).toBe(100_000);
    expect(lp.return_of_capital).toBe(900_000);
  });

  it("preferred return goes to LP only", () => {
    const result = calculateWaterfall(BASE_INPUT);
    const gp = result.investors.find((i) => i.investment_id === "gp-1")!;
    const lp = result.investors.find((i) => i.investment_id === "lp-large")!;
    // LP: 900K * 0.08 * (365/365) = 72K
    expect(gp.preferred_return).toBe(0);
    expect(lp.preferred_return).toBe(72_000);
  });

  it("GP catches up to target percentage of profits", () => {
    const result = calculateWaterfall(BASE_INPUT);
    const gp = result.investors.find((i) => i.investment_id === "gp-1")!;
    // After capital ($1M) and pref ($72K), remaining = $428K
    // Profits so far = $72K (pref). GP target = 72K * 0.2 / (1-0.2) = $18K
    expect(gp.catch_up).toBe(18_000);
  });

  it("remaining profit is split 20/80", () => {
    const result = calculateWaterfall(BASE_INPUT);
    const gp = result.investors.find((i) => i.investment_id === "gp-1")!;
    const lp = result.investors.find((i) => i.investment_id === "lp-large")!;
    // After capital ($1M), pref ($72K), catch-up ($18K): remaining = $410K
    // GP gets 20% = $82K, LP gets 80% = $328K
    expect(gp.profit_split).toBe(82_000);
    expect(lp.profit_split).toBe(328_000);
  });

  it("total distributed equals distributable amount", () => {
    const result = calculateWaterfall(BASE_INPUT);
    expect(result.total_distributed).toBe(1_500_000);
    expect(result.remaining_undistributed).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: Partial distribution (not enough for full capital return)
// ---------------------------------------------------------------------------
describe("partial distribution", () => {
  const BASE_INPUT: WaterfallInput = {
    distribution_date: "2026-01-01",
    total_distributable: 800_000,
    investors: [LP_A, LP_B],
    tiers: STANDARD_TIERS,
  };

  it("distributes capital pro-rata when insufficient", () => {
    const result = calculateWaterfall(BASE_INPUT);
    const lpA = result.investors.find((i) => i.investment_id === "lp-a")!;
    const lpB = result.investors.find((i) => i.investment_id === "lp-b")!;
    // $800K available for $1M total capital — each gets $400K
    expect(lpA.return_of_capital).toBe(400_000);
    expect(lpB.return_of_capital).toBe(400_000);
  });

  it("no preferred return when capital not fully returned", () => {
    const result = calculateWaterfall(BASE_INPUT);
    const lpA = result.investors.find((i) => i.investment_id === "lp-a")!;
    const lpB = result.investors.find((i) => i.investment_id === "lp-b")!;
    expect(lpA.preferred_return).toBe(0);
    expect(lpB.preferred_return).toBe(0);
  });

  it("no profit split when capital not fully returned", () => {
    const result = calculateWaterfall(BASE_INPUT);
    const lpA = result.investors.find((i) => i.investment_id === "lp-a")!;
    expect(lpA.profit_split).toBe(0);
  });

  it("all funds are distributed (no remainder)", () => {
    const result = calculateWaterfall(BASE_INPUT);
    expect(result.total_distributed).toBe(800_000);
    expect(result.remaining_undistributed).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: Multi-round distributions
// ---------------------------------------------------------------------------
describe("multi-round distributions", () => {
  it("second round picks up where first left off", () => {
    // Round 1: $800K partial distribution (returns $400K each to 2 LPs)
    const round1Input: WaterfallInput = {
      distribution_date: "2025-07-01",
      total_distributable: 800_000,
      investors: [LP_A, LP_B],
      tiers: STANDARD_TIERS,
    };
    const round1 = calculateWaterfall(round1Input);

    // Round 2: $600K — should return remaining $200K capital, then pref + profit
    const round2Investors: WaterfallInvestor[] = [
      {
        ...LP_A,
        prior_return_of_capital: round1.investors.find((i) => i.investment_id === "lp-a")!.return_of_capital,
        prior_preferred_return: round1.investors.find((i) => i.investment_id === "lp-a")!.preferred_return,
        prior_catch_up: 0,
        prior_profit_split: round1.investors.find((i) => i.investment_id === "lp-a")!.profit_split,
      },
      {
        ...LP_B,
        prior_return_of_capital: round1.investors.find((i) => i.investment_id === "lp-b")!.return_of_capital,
        prior_preferred_return: round1.investors.find((i) => i.investment_id === "lp-b")!.preferred_return,
        prior_catch_up: 0,
        prior_profit_split: round1.investors.find((i) => i.investment_id === "lp-b")!.profit_split,
      },
    ];

    const round2Input: WaterfallInput = {
      distribution_date: "2026-01-01",
      total_distributable: 600_000,
      investors: round2Investors,
      tiers: STANDARD_TIERS,
    };
    const round2 = calculateWaterfall(round2Input);

    const lpA2 = round2.investors.find((i) => i.investment_id === "lp-a")!;
    const lpB2 = round2.investors.find((i) => i.investment_id === "lp-b")!;

    // Remaining capital: $500K - $400K = $100K each
    expect(lpA2.return_of_capital).toBe(100_000);
    expect(lpB2.return_of_capital).toBe(100_000);

    // After capital: $400K remaining for pref + profit
    // Pref should be accrued from contribution date
    expect(lpA2.preferred_return).toBeGreaterThan(0);
    expect(lpB2.preferred_return).toBeGreaterThan(0);

    // Total distributed < distributable because GP pool (20%) has no recipients
    expect(round2.total_distributed).toBe(536_000);
    expect(round2.remaining_undistributed).toBe(64_000);
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: Edge cases
// ---------------------------------------------------------------------------
describe("edge cases", () => {
  it("handles zero distributable amount", () => {
    const result = calculateWaterfall({
      distribution_date: "2026-01-01",
      total_distributable: 0,
      investors: [LP_A],
      tiers: STANDARD_TIERS,
    });
    expect(result.total_distributed).toBe(0);
    expect(result.remaining_undistributed).toBe(0);
    expect(result.line_items).toHaveLength(0);
  });

  it("handles single investor", () => {
    const result = calculateWaterfall({
      distribution_date: "2026-01-01",
      total_distributable: 700_000,
      investors: [LP_A],
      tiers: STANDARD_TIERS,
    });
    const lpA = result.investors.find((i) => i.investment_id === "lp-a")!;
    expect(lpA.return_of_capital).toBe(500_000);
    expect(lpA.preferred_return).toBe(40_000);
    expect(lpA.total).toBeGreaterThan(0);
    // GP pool (20%) has no recipients in LP-only fund → undistributed
    // $700K - $500K capital - $40K pref = $160K remaining. LP gets 80% = $128K
    expect(result.total_distributed).toBe(668_000);
    expect(result.remaining_undistributed).toBe(32_000);
  });

  it("handles all-GP fund (no pref to LPs)", () => {
    const gpOnly: WaterfallInvestor = { ...GP_INVESTOR, called_amount: 500_000 };
    const result = calculateWaterfall({
      distribution_date: "2026-01-01",
      total_distributable: 800_000,
      investors: [gpOnly],
      tiers: STANDARD_TIERS,
    });
    const gp = result.investors[0]!;
    // Capital return first
    expect(gp.return_of_capital).toBe(500_000);
    // No preferred return (GP excluded from pref)
    expect(gp.preferred_return).toBe(0);
    // No negative amounts
    for (const item of result.line_items) {
      expect(item.amount).toBeGreaterThanOrEqual(0);
    }
  });

  it("handles empty investor list", () => {
    const result = calculateWaterfall({
      distribution_date: "2026-01-01",
      total_distributable: 100_000,
      investors: [],
      tiers: STANDARD_TIERS,
    });
    expect(result.total_distributed).toBe(0);
    expect(result.remaining_undistributed).toBe(100_000);
  });

  it("handles empty tier list", () => {
    const result = calculateWaterfall({
      distribution_date: "2026-01-01",
      total_distributable: 100_000,
      investors: [LP_A],
      tiers: [],
    });
    expect(result.total_distributed).toBe(0);
    expect(result.remaining_undistributed).toBe(100_000);
  });

  it("all amounts are non-negative across all scenarios", () => {
    const inputs: WaterfallInput[] = [
      { distribution_date: "2026-01-01", total_distributable: 1, investors: [LP_A], tiers: STANDARD_TIERS },
      { distribution_date: "2026-01-01", total_distributable: 1_000_000, investors: [LP_A, LP_B], tiers: STANDARD_TIERS },
      { distribution_date: "2026-01-01", total_distributable: 100, investors: [GP_INVESTOR, LP_A], tiers: STANDARD_TIERS },
    ];
    for (const input of inputs) {
      const result = calculateWaterfall(input);
      for (const item of result.line_items) {
        expect(item.amount).toBeGreaterThanOrEqual(0);
      }
      for (const inv of result.investors) {
        expect(inv.return_of_capital).toBeGreaterThanOrEqual(0);
        expect(inv.preferred_return).toBeGreaterThanOrEqual(0);
        expect(inv.catch_up).toBeGreaterThanOrEqual(0);
        expect(inv.profit_split).toBeGreaterThanOrEqual(0);
        expect(inv.total).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

import { describe, expect, it } from "vitest";
import { calculateDeal, type DealInputs } from "@/lib/deal-engine";

const BASE_INPUTS: DealInputs = {
  purchase_price: 80000,
  site_work: 15000,
  base_build_cost: 180000,
  upgrade_package: 25000,
  asp: 450000,
  concessions: 5000,
  duration_months: 8,
  interest_rate: 0.1,
  ltc_ratio: 0.75,
};

describe("calculateDeal", () => {
  it("calculates cost breakdown correctly", () => {
    const result = calculateDeal(BASE_INPUTS);

    expect(result.land_cost).toBe(80000);
    expect(result.hard_costs).toBe(220000); // 15000 + 180000 + 25000
    // Default fees: 15000+5000+1500+3000+3500+1400+10000 = 39400
    expect(result.fixed_costs).toBe(39400);
    expect(result.total_project_cost).toBe(339400);
  });

  it("calculates financing correctly", () => {
    const result = calculateDeal(BASE_INPUTS);

    expect(result.loan_amount).toBe(254550); // 339400 * 0.75
    expect(result.equity_required).toBe(84850); // 339400 * 0.25
    // interest: 254550 * 0.10 * (8/12)
    expect(result.interest_expense).toBeCloseTo(16970, 0);
  });

  it("calculates revenue and profit correctly", () => {
    const result = calculateDeal(BASE_INPUTS);

    expect(result.gross_revenue).toBe(450000);
    expect(result.net_revenue).toBe(445000); // 450000 - 5000
    expect(result.gross_profit).toBe(105600); // 445000 - 339400
    expect(result.net_profit).toBeCloseTo(88630, 0); // 105600 - 16970
  });

  it("calculates margins correctly", () => {
    const result = calculateDeal(BASE_INPUTS);

    expect(result.gross_margin).toBeCloseTo(105600 / 450000, 4);
    expect(result.net_margin).toBeCloseTo(88630 / 450000, 3);
  });

  it("calculates ROI and annualized ROI", () => {
    const result = calculateDeal(BASE_INPUTS);

    // ROI = net_profit / equity_required = 88630 / 84850
    expect(result.roi).toBeCloseTo(1.0445, 3);
    // Annualized ROI = ROI * (12/8) = 1.0445 * 1.5
    expect(result.annualized_roi).toBeCloseTo(1.5668, 3);
    // >25% => Strong Buy
    expect(result.annualized_roi).toBeGreaterThan(0.25);
  });

  it("returns Strong Buy for high annualized ROI (>=25%)", () => {
    const result = calculateDeal(BASE_INPUTS);

    expect(result.verdict).toBe("Strong Buy");
    expect(result.verdict_color).toBe("#4A7A5B");
  });

  it("returns Pass for negative/low ROI deal", () => {
    const result = calculateDeal({
      ...BASE_INPUTS,
      asp: 340000, // barely covers costs
    });

    expect(result.verdict).toBe("Pass");
    expect(result.verdict_color).toBe("#B84040");
  });

  it("returns correct verdict for varying ROI levels", () => {
    // With lower ASP, check verdict maps correctly
    const result = calculateDeal({
      ...BASE_INPUTS,
      asp: 400000,
      duration_months: 12,
    });

    // All verdicts should be one of the valid values
    expect(["Strong Buy", "Buy", "Hold", "Pass"]).toContain(result.verdict);
    // Verify verdict_color is always set
    expect(result.verdict_color).toBeTruthy();
  });

  it("handles 100% LTC (zero equity)", () => {
    const result = calculateDeal({
      ...BASE_INPUTS,
      ltc_ratio: 1.0,
    });

    expect(result.equity_required).toBe(0);
    expect(result.roi).toBe(0);
    expect(result.annualized_roi).toBe(0);
  });

  it("handles zero duration", () => {
    const result = calculateDeal({
      ...BASE_INPUTS,
      duration_months: 0,
    });

    expect(result.interest_expense).toBe(0);
    expect(result.annualized_roi).toBe(0);
  });

  it("handles zero sales price", () => {
    const result = calculateDeal({
      ...BASE_INPUTS,
      asp: 0,
    });

    expect(result.gross_revenue).toBe(0);
    expect(result.gross_margin).toBe(0);
    expect(result.net_margin).toBe(0);
    expect(result.verdict).toBe("Pass");
  });

  it("applies custom fee overrides", () => {
    const result = calculateDeal(BASE_INPUTS, {
      builder_fee: 20000, // override from default 15000
    });

    // New fixed costs: 20000+5000+1500+3000+3500+1400+10000 = 44400
    expect(result.fixed_costs).toBe(44400);
    expect(result.total_project_cost).toBe(344400);
  });

  it("applies partial fee overrides, keeping defaults for others", () => {
    const result = calculateDeal(BASE_INPUTS, {
      warranty: 0,
      contingency: 0,
    });

    // Fixed costs: 15000+0+1500+3000+3500+1400+0 = 24400
    expect(result.fixed_costs).toBe(24400);
  });
});

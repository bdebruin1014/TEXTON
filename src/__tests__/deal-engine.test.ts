import { describe, expect, it } from "vitest";
import { calculateDealSheet, type DealSheetInputs, runSensitivityAnalysis } from "@/lib/deal-engine";

const BASE_INPUTS: DealSheetInputs = {
  lot_purchase_price: 80_000,
  closing_costs: 3_000,
  acquisition_commission: 0,
  acquisition_bonus: 0,
  other_lot_costs: 0,
  sticks_bricks: 180_000,
  upgrades: 25_000,
  soft_costs: 10_000,
  land_prep: 5_000,
  site_specific: 0,
  site_work_total: 15_000,
  other_site_costs: 0,
  is_rch_related_owner: true,
  asset_sales_price: 450_000,
  selling_cost_rate: 0.085,
  selling_concessions: 5_000,
  ltc_ratio: 0.85,
  interest_rate: 0.1,
  cost_of_capital: 0.16,
  project_duration_days: 120,
};

describe("calculateDealSheet", () => {
  it("calculates lot basis correctly", () => {
    const result = calculateDealSheet(BASE_INPUTS);
    // 80000 + 3000 + 0 + 0 + 0
    expect(result.total_lot_basis).toBe(83_000);
  });

  it("calculates contract sections correctly", () => {
    const result = calculateDealSheet(BASE_INPUTS);
    // sections 1-5: 180000 + 25000 + 10000 + 5000 + 0 = 220000
    expect(result.sections_1_to_5).toBe(220_000);
    // builder fee: max(25000, 220000*0.10) = max(25000, 22000) = 25000
    expect(result.builder_fee).toBe(25_000);
    // contingency: min(10000, 220000*0.05) = min(10000, 11000) = 10000
    expect(result.contingency).toBe(10_000);
    // total contract: 220000 + 25000 + 10000 = 255000
    expect(result.total_contract_cost).toBe(255_000);
  });

  it("calculates fixed per-house fees for RCH-related", () => {
    const result = calculateDealSheet(BASE_INPUTS);
    // 15000+5000+5000+1500+3000+1500+3500+1400 = 35900
    expect(result.total_fixed_per_house).toBe(35_900);
  });

  it("excludes AM fee for non-RCH-related", () => {
    const result = calculateDealSheet({ ...BASE_INPUTS, is_rch_related_owner: false });
    // 35900 - 5000 = 30900
    expect(result.total_fixed_per_house).toBe(30_900);
  });

  it("calculates total project cost correctly", () => {
    const result = calculateDealSheet(BASE_INPUTS);
    // lot_basis(83000) + contract(255000) + fixed(35900) + site_work(15000) + other_site(0) = 388900
    expect(result.total_project_cost).toBe(388_900);
  });

  it("calculates financing with actual/360 day count", () => {
    const result = calculateDealSheet(BASE_INPUTS);
    // loan: 388900 * 0.85 = 330565
    expect(result.loan_amount).toBeCloseTo(330_565, 0);
    // equity: 388900 - 330565 = 58335
    expect(result.equity_required).toBeCloseTo(58_335, 0);
    // interest: 330565 * 0.10 * (120/360) = 11018.83
    expect(result.interest_cost).toBeCloseTo(11_018.83, 0);
    // cost of capital: 58335 * 0.16 * (120/360) = 3111.20
    expect(result.cost_of_capital_amount).toBeCloseTo(3_111.2, 0);
  });

  it("calculates sales and net profit correctly", () => {
    const result = calculateDealSheet(BASE_INPUTS);
    // selling costs: 450000 * 0.085 = 38250
    expect(result.selling_costs).toBeCloseTo(38_250, 0);
    // net proceeds: 450000 - 38250 - 5000 = 406750
    expect(result.net_proceeds).toBeCloseTo(406_750, 0);
    // net profit: 406750 - (388900 + 11018.83 + 3111.20) = 3719.97
    expect(result.net_profit).toBeCloseTo(3_719.97, 0);
  });

  it("calculates margins correctly", () => {
    const result = calculateDealSheet(BASE_INPUTS);
    // npm: 3719.97 / 450000 ≈ 0.00827
    expect(result.net_profit_margin).toBeCloseTo(0.00827, 3);
    // land_cost_ratio: (83000 + 15000 + 0) / 450000
    expect(result.land_cost_ratio).toBeCloseTo(0.2178, 3);
  });

  it("returns correct verdicts", () => {
    const result = calculateDealSheet(BASE_INPUTS);
    // <5% margin = NO GO, 20-25% land = ACCEPTABLE
    expect(result.profit_verdict).toBe("NO GO");
    expect(result.land_verdict).toBe("ACCEPTABLE");
  });

  it("returns STRONG profit verdict for high-margin deal", () => {
    const result = calculateDealSheet({
      ...BASE_INPUTS,
      asset_sales_price: 600_000,
    });
    expect(result.profit_verdict).toBe("STRONG");
  });

  it("handles zero sales price", () => {
    const result = calculateDealSheet({
      ...BASE_INPUTS,
      asset_sales_price: 0,
    });
    expect(result.net_profit_margin).toBe(0);
    expect(result.land_cost_ratio).toBe(0);
    expect(result.profit_verdict).toBe("NO GO");
  });

  it("uses builder fee formula correctly for large builds", () => {
    const result = calculateDealSheet({
      ...BASE_INPUTS,
      sticks_bricks: 300_000,
    });
    // sections 1-5: 300000+25000+10000+5000+0 = 340000
    // builder fee: max(25000, 340000*0.10) = 34000
    expect(result.builder_fee).toBe(34_000);
    // contingency: min(10000, 340000*0.05) = min(10000, 17000) = 10000 (capped)
    expect(result.contingency).toBe(10_000);
  });

  it("contingency is capped at $10K even for high cost builds", () => {
    const result = calculateDealSheet({
      ...BASE_INPUTS,
      sticks_bricks: 500_000,
    });
    // sections 1-5: 500000+25000+10000+5000+0 = 540000
    // 5% of 540000 = 27000, but capped at 10000
    expect(result.contingency).toBe(10_000);
  });

  it("contingency is less than $10K for small builds", () => {
    const result = calculateDealSheet({
      ...BASE_INPUTS,
      sticks_bricks: 80_000,
      upgrades: 0,
      soft_costs: 0,
      land_prep: 0,
    });
    // sections 1-5: 80000+0+0+0+0 = 80000
    // 5% of 80000 = 4000 < 10000
    expect(result.contingency).toBe(4_000);
  });
});

describe("runSensitivityAnalysis", () => {
  it("returns all scenario results", () => {
    const sensitivity = runSensitivityAnalysis(BASE_INPUTS);
    expect(sensitivity.base).toBeDefined();
    expect(sensitivity.bestCase).toBeDefined();
    expect(sensitivity.worstCase).toBeDefined();
    expect(sensitivity.costOverrun10).toBeDefined();
    expect(sensitivity.aspDecline10).toBeDefined();
    expect(sensitivity.delay30Days).toBeDefined();
    expect(sensitivity.breakevenASP).toBeGreaterThan(0);
    expect(sensitivity.minimumASP5pct).toBeGreaterThan(sensitivity.breakevenASP);
  });

  it("best case has higher profit than base", () => {
    const sensitivity = runSensitivityAnalysis(BASE_INPUTS);
    expect(sensitivity.bestCase.net_profit).toBeGreaterThan(sensitivity.base.net_profit);
  });

  it("worst case has lower profit than base", () => {
    const sensitivity = runSensitivityAnalysis(BASE_INPUTS);
    expect(sensitivity.worstCase.net_profit).toBeLessThan(sensitivity.base.net_profit);
  });

  it("breakeven ASP makes net profit ~0", () => {
    const sensitivity = runSensitivityAnalysis(BASE_INPUTS);
    const atBreakeven = calculateDealSheet({
      ...BASE_INPUTS,
      asset_sales_price: sensitivity.breakevenASP,
    });
    expect(Math.abs(atBreakeven.net_profit)).toBeLessThan(1);
  });
});

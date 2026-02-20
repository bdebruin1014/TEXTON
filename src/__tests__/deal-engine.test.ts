import { describe, expect, it } from "vitest";
import { calculateDealSheet, type DealSheetInputs } from "@/lib/deal-engine";

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
  interest_rate: 0.10,
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
    // contingency: max(10000, 220000*0.05) = max(10000, 11000) = 11000
    expect(result.contingency).toBe(11_000);
    // total contract: 220000 + 25000 + 11000 = 256000
    expect(result.total_contract_cost).toBe(256_000);
  });

  it("calculates fixed per-house fees for RCH-related", () => {
    const result = calculateDealSheet(BASE_INPUTS);
    // 15000+5000+5000+1500+3000+1500+3000+1400 = 35400
    expect(result.total_fixed_per_house).toBe(35_400);
  });

  it("excludes AM fee for non-RCH-related", () => {
    const result = calculateDealSheet({ ...BASE_INPUTS, is_rch_related_owner: false });
    // 35400 - 5000 = 30400
    expect(result.total_fixed_per_house).toBe(30_400);
  });

  it("calculates total project cost correctly", () => {
    const result = calculateDealSheet(BASE_INPUTS);
    // lot_basis(83000) + contract(256000) + fixed(35400) + site_work(15000) + other_site(0) = 389400
    expect(result.total_project_cost).toBe(389_400);
  });

  it("calculates financing correctly", () => {
    const result = calculateDealSheet(BASE_INPUTS);
    // loan: 389400 * 0.85 = 330990
    expect(result.loan_amount).toBeCloseTo(330_990, 0);
    // equity: 389400 - 330990 = 58410
    expect(result.equity_required).toBeCloseTo(58_410, 0);
    // interest: 330990 * 0.10 * (120/365) = 10881.86
    expect(result.interest_cost).toBeCloseTo(10_881.86, 0);
    // cost of capital: 58410 * 0.16 * (120/365)
    expect(result.cost_of_capital_amount).toBeCloseTo(3_072.26, 0);
  });

  it("calculates sales and net profit correctly", () => {
    const result = calculateDealSheet(BASE_INPUTS);
    // selling costs: 450000 * 0.085 = 38250
    expect(result.selling_costs).toBeCloseTo(38_250, 0);
    // net proceeds: 450000 - 38250 - 5000 = 406750
    expect(result.net_proceeds).toBeCloseTo(406_750, 0);
    // net profit: 406750 - (389400 + interest + coc)
    expect(result.net_profit).toBeCloseTo(3_395.61, 0);
  });

  it("calculates margins correctly", () => {
    const result = calculateDealSheet(BASE_INPUTS);
    expect(result.net_profit_margin).toBeCloseTo(0.00754, 2);
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
    // contingency: max(10000, 340000*0.05) = 17000
    expect(result.contingency).toBe(17_000);
  });
});

import { computeBuilderFee, computeContingency, FIXED_PER_HOUSE_FEES, totalFixedPerHouse } from "./constants";

export interface DealSheetInputs {
  // Lot acquisition
  lot_purchase_price: number;
  closing_costs: number;
  acquisition_commission?: number;
  acquisition_bonus?: number;
  other_lot_costs?: number;

  // Construction (from floor plan + municipality + overrides)
  sticks_bricks: number;
  upgrades: number;
  soft_costs: number;
  land_prep: number;
  site_specific: number;

  // Site work
  site_work_total: number;
  other_site_costs?: number;

  // Fixed per-house
  is_rch_related_owner: boolean;

  // Sales
  asset_sales_price: number;
  selling_cost_rate: number; // default 0.085
  selling_concessions?: number;

  // Financing
  ltc_ratio: number; // default 0.85
  interest_rate: number; // default 0.10
  cost_of_capital: number; // default 0.16
  project_duration_days: number; // default 120
}

export interface DealSheetResults {
  // Lot basis
  total_lot_basis: number;

  // Contract sections
  sections_1_to_5: number;
  builder_fee: number; // Section 6: GREATER($25K, 10% of S1-5)
  contingency: number; // Section 7: GREATER($10K, 5% of S1-5)
  total_contract_cost: number;

  // Fixed per-house
  total_fixed_per_house: number;

  // Total project cost
  total_project_cost: number;

  // Financing
  loan_amount: number;
  equity_required: number;
  interest_cost: number;
  cost_of_capital_amount: number;
  total_all_in: number;

  // Sales
  selling_costs: number;
  net_proceeds: number;

  // Results
  net_profit: number;
  net_profit_margin: number;
  land_cost_ratio: number;
  profit_verdict: "STRONG" | "GOOD" | "MARGINAL" | "NO GO";
  land_verdict: "STRONG" | "ACCEPTABLE" | "CAUTION" | "OVERPAYING";
}

export function calculateDealSheet(inputs: DealSheetInputs): DealSheetResults {
  // Lot basis
  const total_lot_basis =
    inputs.lot_purchase_price +
    inputs.closing_costs +
    (inputs.acquisition_commission ?? 0) +
    (inputs.acquisition_bonus ?? 0) +
    (inputs.other_lot_costs ?? 0);

  // Contract sections 1-5
  const sections_1_to_5 =
    inputs.sticks_bricks + inputs.upgrades + inputs.soft_costs + inputs.land_prep + inputs.site_specific;

  // Section 6 & 7
  const builder_fee = computeBuilderFee(sections_1_to_5);
  const contingency = computeContingency(sections_1_to_5);
  const total_contract_cost = sections_1_to_5 + builder_fee + contingency;

  // Fixed per-house
  const total_fixed_per_house = totalFixedPerHouse(inputs.is_rch_related_owner);

  // Total project cost
  const total_project_cost =
    total_lot_basis +
    total_contract_cost +
    total_fixed_per_house +
    inputs.site_work_total +
    (inputs.other_site_costs ?? 0);

  // Financing
  const loan_amount = total_project_cost * inputs.ltc_ratio;
  const equity_required = total_project_cost - loan_amount;
  const durationFraction = inputs.project_duration_days / 360;
  const interest_cost = loan_amount * inputs.interest_rate * durationFraction;
  const cost_of_capital_amount = equity_required * inputs.cost_of_capital * durationFraction;
  const total_all_in = total_project_cost + interest_cost + cost_of_capital_amount;

  // Sales
  const selling_costs = inputs.asset_sales_price * inputs.selling_cost_rate;
  const net_proceeds = inputs.asset_sales_price - selling_costs - (inputs.selling_concessions ?? 0);

  // Results
  const net_profit = net_proceeds - total_all_in;
  const net_profit_margin = inputs.asset_sales_price > 0 ? net_profit / inputs.asset_sales_price : 0;
  const land_cost_ratio =
    inputs.asset_sales_price > 0
      ? (total_lot_basis + inputs.site_work_total + (inputs.other_site_costs ?? 0)) / inputs.asset_sales_price
      : 0;

  // Scoring
  let profit_verdict: DealSheetResults["profit_verdict"];
  if (net_profit_margin > 0.1) profit_verdict = "STRONG";
  else if (net_profit_margin >= 0.07) profit_verdict = "GOOD";
  else if (net_profit_margin >= 0.05) profit_verdict = "MARGINAL";
  else profit_verdict = "NO GO";

  let land_verdict: DealSheetResults["land_verdict"];
  if (land_cost_ratio < 0.2) land_verdict = "STRONG";
  else if (land_cost_ratio <= 0.25) land_verdict = "ACCEPTABLE";
  else if (land_cost_ratio <= 0.3) land_verdict = "CAUTION";
  else land_verdict = "OVERPAYING";

  return {
    total_lot_basis,
    sections_1_to_5,
    builder_fee,
    contingency,
    total_contract_cost,
    total_fixed_per_house,
    total_project_cost,
    loan_amount,
    equity_required,
    interest_cost,
    cost_of_capital_amount,
    total_all_in,
    selling_costs,
    net_proceeds,
    net_profit,
    net_profit_margin,
    land_cost_ratio,
    profit_verdict,
    land_verdict,
  };
}

// ---------------------------------------------------------------------------
// Sensitivity analysis
// ---------------------------------------------------------------------------

export interface SensitivityScenario {
  label: string;
  net_profit: number;
  net_profit_margin: number;
  profit_verdict: DealSheetResults["profit_verdict"];
}

function runScenario(
  base: DealSheetInputs,
  label: string,
  costMultiplier: number,
  aspMultiplier: number,
  extraDays: number,
): SensitivityScenario {
  const adjusted: DealSheetInputs = {
    ...base,
    sticks_bricks: base.sticks_bricks * costMultiplier,
    site_work_total: base.site_work_total * costMultiplier,
    asset_sales_price: base.asset_sales_price * aspMultiplier,
    project_duration_days: base.project_duration_days + extraDays,
  };
  const r = calculateDealSheet(adjusted);
  return { label, net_profit: r.net_profit, net_profit_margin: r.net_profit_margin, profit_verdict: r.profit_verdict };
}

export interface SensitivityResults {
  base: SensitivityScenario;
  bestCase: SensitivityScenario;
  worstCase: SensitivityScenario;
  costOverrun10: SensitivityScenario;
  aspDecline10: SensitivityScenario;
  delay30Days: SensitivityScenario;
  breakevenASP: number;
  minimumASP5pct: number;
}

export function runSensitivityAnalysis(inputs: DealSheetInputs): SensitivityResults {
  const base = runScenario(inputs, "Base Case", 1.0, 1.0, 0);
  const bestCase = runScenario(inputs, "Best Case", 0.95, 1.05, 0);
  const worstCase = runScenario(inputs, "Worst Case", 1.1, 0.9, 30);
  const costOverrun10 = runScenario(inputs, "10% Cost Overrun", 1.1, 1.0, 0);
  const aspDecline10 = runScenario(inputs, "10% ASP Decline", 1.0, 0.9, 0);
  const delay30Days = runScenario(inputs, "30-Day Delay", 1.0, 1.0, 30);

  // Breakeven ASP: totalAllIn / (1 - sellingCostRate)
  const baseResult = calculateDealSheet(inputs);
  const sellingCostRate = inputs.selling_cost_rate;
  const concessions = inputs.selling_concessions ?? 0;
  const breakevenASP = (baseResult.total_all_in + concessions) / (1 - sellingCostRate);
  const minimumASP5pct = (baseResult.total_all_in + concessions) / (1 - sellingCostRate - 0.05);

  return { base, bestCase, worstCase, costOverrun10, aspDecline10, delay30Days, breakevenASP, minimumASP5pct };
}

// Re-export for convenience
export { FIXED_PER_HOUSE_FEES, totalFixedPerHouse, computeBuilderFee, computeContingency };

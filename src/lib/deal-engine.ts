import { FEE_DEFAULTS } from "./constants";

export interface DealInputs {
  purchase_price: number;
  site_work: number;
  base_build_cost: number;
  upgrade_package: number;
  asp: number; // anticipated sales price
  concessions: number;
  duration_months: number;
  interest_rate: number; // annual, as decimal (e.g. 0.10 for 10%)
  ltc_ratio: number; // loan-to-cost ratio as decimal (e.g. 0.75)
}

export interface DealFees {
  builder_fee: number;
  warranty: number;
  builders_risk: number;
  po_fee: number;
  pm_fee: number;
  utility: number;
  contingency: number;
}

export interface DealOutputs {
  // Cost breakdown
  land_cost: number;
  hard_costs: number;
  fixed_costs: number;
  total_project_cost: number;

  // Financing
  loan_amount: number;
  equity_required: number;
  interest_expense: number;

  // Revenue
  gross_revenue: number;
  net_revenue: number;

  // Profit
  gross_profit: number;
  net_profit: number;

  // Margins & returns
  gross_margin: number;
  net_margin: number;
  roi: number;
  annualized_roi: number;

  // Verdict
  verdict: "Strong Buy" | "Buy" | "Hold" | "Pass";
  verdict_color: string;
}

function getDefaultFees(): DealFees {
  return {
    builder_fee: FEE_DEFAULTS.builder_fee,
    warranty: FEE_DEFAULTS.warranty,
    builders_risk: FEE_DEFAULTS.builders_risk,
    po_fee: FEE_DEFAULTS.po_fee,
    pm_fee: FEE_DEFAULTS.pm_fee,
    utility: FEE_DEFAULTS.utility,
    contingency: FEE_DEFAULTS.contingency_cap,
  };
}

export function calculateDeal(inputs: DealInputs, fees?: Partial<DealFees>): DealOutputs {
  const f = { ...getDefaultFees(), ...fees };

  // Costs
  const land_cost = inputs.purchase_price;
  const hard_costs = inputs.site_work + inputs.base_build_cost + inputs.upgrade_package;
  const fixed_costs = f.builder_fee + f.warranty + f.builders_risk + f.po_fee + f.pm_fee + f.utility + f.contingency;
  const total_project_cost = land_cost + hard_costs + fixed_costs;

  // Financing
  const loan_amount = total_project_cost * inputs.ltc_ratio;
  const equity_required = total_project_cost - loan_amount;
  const interest_expense = loan_amount * inputs.interest_rate * (inputs.duration_months / 12);

  // Revenue
  const gross_revenue = inputs.asp;
  const net_revenue = gross_revenue - inputs.concessions;

  // Profit
  const gross_profit = net_revenue - total_project_cost;
  const net_profit = gross_profit - interest_expense;

  // Margins
  const gross_margin = gross_revenue > 0 ? gross_profit / gross_revenue : 0;
  const net_margin = gross_revenue > 0 ? net_profit / gross_revenue : 0;

  // ROI (on equity)
  const roi = equity_required > 0 ? net_profit / equity_required : 0;
  const annualized_roi = inputs.duration_months > 0 ? roi * (12 / inputs.duration_months) : 0;

  // Verdict
  let verdict: DealOutputs["verdict"];
  let verdict_color: string;
  if (annualized_roi >= 0.25) {
    verdict = "Strong Buy";
    verdict_color = "#4A7A5B";
  } else if (annualized_roi >= 0.15) {
    verdict = "Buy";
    verdict_color = "#48BB78";
  } else if (annualized_roi >= 0.08) {
    verdict = "Hold";
    verdict_color = "#C4841D";
  } else {
    verdict = "Pass";
    verdict_color = "#B84040";
  }

  return {
    land_cost,
    hard_costs,
    fixed_costs,
    total_project_cost,
    loan_amount,
    equity_required,
    interest_expense,
    gross_revenue,
    net_revenue,
    gross_profit,
    net_profit,
    gross_margin,
    net_margin,
    roi,
    annualized_roi,
    verdict,
    verdict_color,
  };
}

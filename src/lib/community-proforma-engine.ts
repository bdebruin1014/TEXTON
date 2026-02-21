export interface CommunityProformaInputs {
  // Phase 1 — Horizontal Development
  total_lots: number;
  land_value_per_lot: number;
  horizontal_dev_per_lot: number;
  ae_per_lot: number;
  amenity_package: number;
  monument_sign: number;
  carry_costs_per_lot: number;
  contingency_pct: number;
  cm_fee_per_lot: number;
  developer_fee_per_lot: number;
  lot_sales_price: number;
  bank_ltc: number;
  bank_interest_rate: number;
  lp_pref_return: number;
  lp_buyout_irr: number;

  // Phase 2 — Vertical Construction
  home_sales_price: number;
  selling_costs_pct: number;
  seller_concession: number;
  vertical_cost: number;
  construction_interest_rate: number;
  construction_months: number;
  lp_accruing_return_rate: number;
  lp_investment_period_months: number;
  gp_split_pct: number;
}

export interface Phase1Results {
  landAcquisition: number;
  horizontalDev: number;
  ae: number;
  carryCosts: number;
  subtotalHard: number;
  contingency: number;
  totalHardPlusContingency: number;
  cmFee: number;
  developerFee: number;
  interestReserve: number;
  totalUses: number;
  seniorDebt: number;
  lpEquity: number;
  lotSalesProceeds: number;
  grossMargin: number;
}

export interface Phase2PerHome {
  lotCost: number;
  constructionInterest: number;
  sellingCosts: number;
  totalCostPerHome: number;
  perHomeProfit: number;
  perHomeMargin: number;
}

export interface Phase2ProjectTotals {
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
}

export interface LPWaterfall {
  gpRolledEquity: number;
  totalLotCost: number;
  slFundLPCapital: number;
  lpAccruedReturn: number;
  totalLPPayout: number;
  grossProfitFromSales: number;
  remainingToGPs: number;
  gpShare: number;
}

export interface CommunityProformaResults {
  phase1: Phase1Results;
  phase2PerHome: Phase2PerHome;
  phase2Totals: Phase2ProjectTotals;
  waterfall: LPWaterfall;
}

export function calculateCommunityProforma(inputs: CommunityProformaInputs): CommunityProformaResults {
  const p = inputs;

  // Phase 1 — Horizontal Development
  const landAcquisition = p.total_lots * p.land_value_per_lot;
  const horizontalDev = p.total_lots * p.horizontal_dev_per_lot;
  const ae = p.total_lots * p.ae_per_lot;
  const carryCosts = p.total_lots * p.carry_costs_per_lot;
  const subtotalHard = landAcquisition + horizontalDev + ae + p.amenity_package + p.monument_sign + carryCosts;
  const contingency = subtotalHard * p.contingency_pct;
  const totalHardPlusContingency = subtotalHard + contingency;
  const cmFee = p.total_lots * p.cm_fee_per_lot;
  const developerFee = p.total_lots * p.developer_fee_per_lot;
  const interestReserve = totalHardPlusContingency * p.bank_interest_rate * 0.5;
  const totalUses = totalHardPlusContingency + cmFee + developerFee + interestReserve;

  const seniorDebt = totalUses * p.bank_ltc;
  const lpEquity = totalUses - seniorDebt;
  const lotSalesProceeds = p.total_lots * p.lot_sales_price;
  const grossMargin = lotSalesProceeds - totalUses;

  // Phase 2 — Per-Home Economics
  const lotCost = p.lot_sales_price;
  const constructionInterest = p.vertical_cost * 0.5 * p.construction_interest_rate * (p.construction_months / 12);
  const sellingCosts = p.home_sales_price * p.selling_costs_pct;
  const totalCostPerHome = lotCost + p.vertical_cost + constructionInterest + sellingCosts + p.seller_concession;
  const perHomeProfit = p.home_sales_price - totalCostPerHome;
  const perHomeMargin = p.home_sales_price > 0 ? perHomeProfit / p.home_sales_price : 0;

  // Phase 2 — Project Totals
  const totalRevenue = p.total_lots * p.home_sales_price;
  const totalCosts = p.total_lots * totalCostPerHome;
  const totalProfit = totalRevenue - totalCosts;

  // LP Waterfall
  const gpRolledEquity = grossMargin > 0 ? grossMargin : 0;
  const totalLotCost = p.total_lots * p.lot_sales_price;
  const slFundLPCapital = totalLotCost - gpRolledEquity;
  const lpAccruedReturn = slFundLPCapital * p.lp_accruing_return_rate * (p.lp_investment_period_months / 12);
  const totalLPPayout = slFundLPCapital + lpAccruedReturn;
  const grossProfitFromSales = totalProfit;
  const remainingToGPs = grossProfitFromSales - lpAccruedReturn;
  const gpShare = remainingToGPs * p.gp_split_pct;

  return {
    phase1: {
      landAcquisition,
      horizontalDev,
      ae,
      carryCosts,
      subtotalHard,
      contingency,
      totalHardPlusContingency,
      cmFee,
      developerFee,
      interestReserve,
      totalUses,
      seniorDebt,
      lpEquity,
      lotSalesProceeds,
      grossMargin,
    },
    phase2PerHome: {
      lotCost,
      constructionInterest,
      sellingCosts,
      totalCostPerHome,
      perHomeProfit,
      perHomeMargin,
    },
    phase2Totals: {
      totalRevenue,
      totalCosts,
      totalProfit,
    },
    waterfall: {
      gpRolledEquity,
      totalLotCost,
      slFundLPCapital,
      lpAccruedReturn,
      totalLPPayout,
      grossProfitFromSales,
      remainingToGPs,
      gpShare,
    },
  };
}

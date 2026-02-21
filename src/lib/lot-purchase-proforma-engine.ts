export interface LotPurchaseProformaInputs {
  total_lots: number;
  takedown_tranches: number;
  lots_per_tranche: number;
  lot_cost_per_lot: number;
  deposit_per_lot: number;
  vertical_cost: number;
  upgrades: number;
  municipality_soft_costs: number;
  fixed_per_house_fees: number;
  asp_per_home: number;
  selling_cost_pct: number;
  seller_concession: number;
  ltc_ratio: number;
  interest_rate: number;
  project_duration_days: number;
  absorption_homes_per_month: number;
}

export interface TakedownTranche {
  tranche: number;
  lots: number;
  totalCost: number;
  deposit: number;
}

export interface PerHomeEconomics {
  totalCostPerHome: number;
  sellingCosts: number;
  constructionInterest: number;
  totalAllInCost: number;
  profitPerHome: number;
  marginPerHome: number;
}

export interface ProjectSummary {
  totalEquity: number;
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  projectROI: number;
  equityMultiple: number;
  selloutMonths: number;
}

export interface LotPurchaseProformaResults {
  tranches: TakedownTranche[];
  perHome: PerHomeEconomics;
  project: ProjectSummary;
}

export function calculateLotPurchaseProforma(inputs: LotPurchaseProformaInputs): LotPurchaseProformaResults {
  const p = inputs;

  // Per-Home Economics
  const totalCostPerHome =
    p.lot_cost_per_lot + p.vertical_cost + p.upgrades + p.municipality_soft_costs + p.fixed_per_house_fees;
  const sellingCosts = p.asp_per_home * p.selling_cost_pct;
  const constructionInterest = totalCostPerHome * p.ltc_ratio * p.interest_rate * (p.project_duration_days / 360);
  const totalAllInCost = totalCostPerHome + sellingCosts + p.seller_concession + constructionInterest;
  const profitPerHome = p.asp_per_home - totalAllInCost;
  const marginPerHome = p.asp_per_home > 0 ? profitPerHome / p.asp_per_home : 0;

  // Project Totals
  const totalEquity = p.total_lots * totalCostPerHome * (1 - p.ltc_ratio);
  const totalRevenue = p.total_lots * p.asp_per_home;
  const totalCosts = p.total_lots * totalAllInCost;
  const totalProfit = totalRevenue - totalCosts;
  const projectROI = totalEquity > 0 ? totalProfit / totalEquity : 0;
  const equityMultiple = totalEquity > 0 ? (totalEquity + totalProfit) / totalEquity : 0;

  // Takedown Schedule
  const tranches = Array.from({ length: p.takedown_tranches }, (_, i) => {
    const lots = i < p.takedown_tranches - 1 ? p.lots_per_tranche : p.total_lots - p.lots_per_tranche * i;
    const totalCost = Math.max(0, lots) * p.lot_cost_per_lot;
    const deposit = Math.max(0, lots) * p.deposit_per_lot;
    return { tranche: i + 1, lots: Math.max(0, lots), totalCost, deposit };
  });

  // Absorption
  const selloutMonths = p.absorption_homes_per_month > 0 ? Math.ceil(p.total_lots / p.absorption_homes_per_month) : 0;

  return {
    tranches,
    perHome: {
      totalCostPerHome,
      sellingCosts,
      constructionInterest,
      totalAllInCost,
      profitPerHome,
      marginPerHome,
    },
    project: {
      totalEquity,
      totalRevenue,
      totalCosts,
      totalProfit,
      projectROI,
      equityMultiple,
      selloutMonths,
    },
  };
}

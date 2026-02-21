export interface LotDevProformaInputs {
  total_lots: number;
  phases: number;
  lots_per_phase: number;
  land_acquisition_cost: number;
  horizontal_dev_per_lot: number;
  entitlement_costs: number;
  amenity_costs: number;
  carry_costs_per_lot: number;
  contingency_pct: number;
  developer_fee_per_lot: number;
  cm_fee_per_lot: number;
  lot_sales_price: number;
  bank_ltc: number;
  bank_interest_rate: number;
  lp_pref_return: number;
  absorption_lots_per_month: number;
}

export interface LotDevSourcesUses {
  horizontalDev: number;
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
}

export interface LotDevReturns {
  totalRevenue: number;
  grossProfit: number;
  profitMargin: number;
  equityMultiple: number;
}

export interface LotDevAbsorption {
  absorptionMonths: number;
  breakevenLots: number;
  breakevenMonth: number;
}

export interface LotDevProformaResults {
  sourcesUses: LotDevSourcesUses;
  returns: LotDevReturns;
  absorption: LotDevAbsorption;
}

export function calculateLotDevProforma(inputs: LotDevProformaInputs): LotDevProformaResults {
  const p = inputs;

  // Sources & Uses
  const horizontalDev = p.total_lots * p.horizontal_dev_per_lot;
  const carryCosts = p.total_lots * p.carry_costs_per_lot;
  const subtotalHard = p.land_acquisition_cost + horizontalDev + p.entitlement_costs + p.amenity_costs + carryCosts;
  const contingency = subtotalHard * p.contingency_pct;
  const totalHardPlusContingency = subtotalHard + contingency;
  const cmFee = p.total_lots * p.cm_fee_per_lot;
  const developerFee = p.total_lots * p.developer_fee_per_lot;
  const interestReserve = totalHardPlusContingency * p.bank_interest_rate * 0.5;
  const totalUses = totalHardPlusContingency + cmFee + developerFee + interestReserve;

  const seniorDebt = totalUses * p.bank_ltc;
  const lpEquity = totalUses - seniorDebt;

  // Returns
  const totalRevenue = p.total_lots * p.lot_sales_price;
  const grossProfit = totalRevenue - totalUses;
  const profitMargin = totalRevenue > 0 ? grossProfit / totalRevenue : 0;
  const equityMultiple = lpEquity > 0 ? (lpEquity + grossProfit) / lpEquity : 0;

  // Absorption schedule
  const absorptionMonths = p.absorption_lots_per_month > 0 ? Math.ceil(p.total_lots / p.absorption_lots_per_month) : 0;
  const breakevenLots = totalUses > 0 && p.lot_sales_price > 0 ? Math.ceil(totalUses / p.lot_sales_price) : 0;
  const breakevenMonth = p.absorption_lots_per_month > 0 ? Math.ceil(breakevenLots / p.absorption_lots_per_month) : 0;

  return {
    sourcesUses: {
      horizontalDev,
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
    },
    returns: {
      totalRevenue,
      grossProfit,
      profitMargin,
      equityMultiple,
    },
    absorption: {
      absorptionMonths,
      breakevenLots,
      breakevenMonth,
    },
  };
}

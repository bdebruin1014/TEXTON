/**
 * SL Deal Engine — Scattered Lot Deal Analyzer
 *
 * Pure computation engine for single scattered lot deals:
 * one lot, one house, one sale.
 *
 * Does NOT handle community developments, lot developments,
 * lot purchase agreements, or subdivision entitlement.
 *
 * Cost vintage: DM Budget September 2025
 */

import type {
  SLDealInputs,
  SLDealResults,
  SensitivityScenario,
  SensitivityResults,
  NPMRating,
  LandCostRating,
} from '../types/sl-deal.types';
import { SL_FIXED_COSTS, SL_CONTRACT_DEFAULTS } from '../data/sl-constants';

// ---------------------------------------------------------------------------
// Rating helpers
// ---------------------------------------------------------------------------

export function rateNPM(npm: number): NPMRating {
  if (npm >= 0.10) return 'STRONG';
  if (npm >= 0.07) return 'GOOD';
  if (npm >= 0.05) return 'MARGINAL';
  return 'NO_GO';
}

export function rateLandCost(ratio: number): LandCostRating {
  if (ratio < 0.20) return 'STRONG';
  if (ratio < 0.25) return 'ACCEPTABLE';
  if (ratio < 0.30) return 'CAUTION';
  return 'OVERPAYING';
}

// ---------------------------------------------------------------------------
// Core calculation
// ---------------------------------------------------------------------------

export function calculateSLDeal(inputs: SLDealInputs): SLDealResults {
  // ---- 1. Total Lot Basis ----
  const totalLotBasis =
    inputs.lot_purchase_price +
    (inputs.closing_costs ?? 0) +
    (inputs.acquisition_commission ?? 0) +
    (inputs.due_diligence_costs ?? 0) +
    (inputs.other_lot_costs ?? 0);

  // ---- 2. Contract Cost ----
  const sticksBricks = inputs.sticks_bricks;
  const siteSpecific = inputs.site_specific ?? SL_CONTRACT_DEFAULTS.SITE_SPECIFIC;
  const softCosts = inputs.soft_costs ?? SL_CONTRACT_DEFAULTS.SOFT_COSTS;
  const builderFee = SL_CONTRACT_DEFAULTS.BUILDER_FEE;
  const totalContractCost = sticksBricks + siteSpecific + softCosts + builderFee;

  // ---- 3. Upgrades ----
  const exteriorUpgrades = inputs.exterior_upgrades ?? 0;
  const interiorPackage = inputs.interior_package ?? 0;
  const miscOptions = inputs.misc_options ?? 0;
  const totalUpgradeCost = exteriorUpgrades + interiorPackage + miscOptions;

  // ---- 4. Municipality Soft Costs ----
  const totalMunicipalitySoftCosts = inputs.municipality_soft_costs ?? 0;

  // ---- 5. Additional Site Work ----
  const totalAdditionalSiteWork = inputs.additional_site_work ?? 0;

  // ---- 6. Fixed Per-House Costs (RCH) ----
  const durationDays = inputs.project_duration_days ?? 120;
  const utilityCharges = Math.ceil(durationDays / 30) * SL_FIXED_COSTS.UTILITY_RATE_PER_MONTH;

  const fixedPerHouse = {
    builder_warranty: SL_FIXED_COSTS.BUILDER_WARRANTY,
    builders_risk: SL_FIXED_COSTS.BUILDERS_RISK,
    po_fee: SL_FIXED_COSTS.PO_FEE,
    pm_fee: SL_FIXED_COSTS.PM_FEE,
    am_fee: SL_FIXED_COSTS.AM_FEE,
    utility_charges: utilityCharges,
    contingency: SL_FIXED_COSTS.CONTINGENCY,
  };
  const totalFixedPerHouse =
    fixedPerHouse.builder_warranty +
    fixedPerHouse.builders_risk +
    fixedPerHouse.po_fee +
    fixedPerHouse.pm_fee +
    fixedPerHouse.am_fee +
    fixedPerHouse.utility_charges +
    fixedPerHouse.contingency;

  // ---- 7. Total Project Cost ----
  const totalProjectCost =
    totalLotBasis +
    totalContractCost +
    totalUpgradeCost +
    totalMunicipalitySoftCosts +
    totalAdditionalSiteWork +
    totalFixedPerHouse;

  // ---- 8. Financing ----
  const ltcRatio = inputs.ltc_ratio ?? 0.85;
  const interestRate = inputs.interest_rate ?? 0.10;
  const costOfCapitalRate = inputs.cost_of_capital_rate ?? 0.16;

  const loanAmount = totalProjectCost * ltcRatio;
  const equityRequired = totalProjectCost - loanAmount;
  const interest = loanAmount * (interestRate / 360) * durationDays;
  const costOfCapital = equityRequired * (costOfCapitalRate / 360) * durationDays;
  const totalCarry = interest + costOfCapital;

  // ---- 9. Results ----
  const asp = inputs.asset_sales_price;
  const sellingCostRate = inputs.selling_cost_rate ?? 0.085;
  const sellingConcessions = inputs.selling_concessions ?? 0;
  const sellingCosts = asp * sellingCostRate;
  const netSalesProceeds = asp - sellingCosts - sellingConcessions;

  const totalAllInCost = totalProjectCost + totalCarry;
  const netProfit = netSalesProceeds - totalAllInCost;
  const netProfitMargin = asp > 0 ? netProfit / asp : 0;
  const landCostRatio = asp > 0 ? totalLotBasis / asp : 0;

  // ---- 10. Breakeven calculations ----
  const breakevenASP = totalAllInCost / (1 - sellingCostRate);
  const minimumASP5pct = totalAllInCost / (1 - sellingCostRate - 0.05);

  return {
    // Lot
    totalLotBasis,

    // Contract
    sticksBricks,
    siteSpecific,
    softCosts,
    builderFee,
    totalContractCost,

    // Upgrades
    exteriorUpgrades,
    interiorPackage,
    miscOptions,
    totalUpgradeCost,

    // Municipality
    totalMunicipalitySoftCosts,

    // Additional site
    totalAdditionalSiteWork,

    // Fixed per-house
    fixedPerHouse,
    totalFixedPerHouse,

    // Totals
    totalProjectCost,

    // Financing
    loanAmount,
    equityRequired,
    interest,
    costOfCapital,
    totalCarry,

    // Revenue
    asp,
    sellingCosts,
    sellingConcessions,
    netSalesProceeds,

    // Bottom line
    totalAllInCost,
    netProfit,
    netProfitMargin,
    npmRating: rateNPM(netProfitMargin),
    landCostRatio,
    landCostRating: rateLandCost(landCostRatio),

    // Breakeven
    breakevenASP,
    minimumASP5pct,

    // Meta
    durationDays,
    ltcRatio,
    interestRate,
    costOfCapitalRate,
    sellingCostRate,
  };
}

// ---------------------------------------------------------------------------
// Sensitivity analysis
// ---------------------------------------------------------------------------

function runScenario(
  base: SLDealInputs,
  costMultiplier: number,
  aspMultiplier: number,
  extraDays: number,
): SensitivityScenario {
  const adjusted: SLDealInputs = {
    ...base,
    sticks_bricks: base.sticks_bricks * costMultiplier,
    asset_sales_price: base.asset_sales_price * aspMultiplier,
    project_duration_days: (base.project_duration_days ?? 120) + extraDays,
  };
  const results = calculateSLDeal(adjusted);
  return {
    netProfit: results.netProfit,
    netProfitMargin: results.netProfitMargin,
    npmRating: results.npmRating,
    totalAllInCost: results.totalAllInCost,
    asp: results.asp,
  };
}

export function runSensitivityAnalysis(inputs: SLDealInputs): SensitivityResults {
  const base = runScenario(inputs, 1.0, 1.0, 0);

  return {
    base,
    bestCase: runScenario(inputs, 0.95, 1.05, 0),
    worstCase: runScenario(inputs, 1.10, 0.90, 30),
    costOverrun10: runScenario(inputs, 1.10, 1.0, 0),
    aspDecline10: runScenario(inputs, 1.0, 0.90, 0),
    delay30Days: runScenario(inputs, 1.0, 1.0, 30),
  };
}

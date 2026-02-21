/**
 * SL Deal Analyzer — Type Definitions
 *
 * Scattered Lot only: one lot, one house, one sale.
 */

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface SLDealInputs {
  // Property
  address: string;
  city: string;
  state: string;
  zip: string;
  municipality: string;
  lot_dimensions?: string;
  zoning?: string;
  notes?: string;

  // Lot Basis
  lot_purchase_price: number;
  closing_costs?: number;
  acquisition_commission?: number;
  due_diligence_costs?: number;
  other_lot_costs?: number;
  closing_date?: string; // ISO date

  // Floor Plan (from build cost database)
  floor_plan_id?: string; // FK to floor_plans table
  floor_plan_name: string; // e.g. "HOLLY"
  heated_sqft: number;
  bedrooms: number;
  bathrooms: number;
  stories: number;
  garage?: string;

  // Construction costs (from build cost database)
  sticks_bricks: number; // S&B from DM Budget
  site_specific?: number; // default $10,875
  soft_costs?: number; // default $2,650

  // Upgrades
  exterior_upgrades?: number;
  interior_package?: number;
  misc_options?: number;

  // Municipality soft costs (from fee schedule)
  municipality_soft_costs?: number;

  // Additional site work beyond contract
  additional_site_work?: number;

  // Financing
  project_duration_days?: number; // default 120
  interest_rate?: number; // annual, default 0.10
  cost_of_capital_rate?: number; // annual, default 0.16
  ltc_ratio?: number; // default 0.85

  // Sales
  asset_sales_price: number;
  selling_cost_rate?: number; // default 0.085 (8.5%)
  selling_concessions?: number;
}

// ---------------------------------------------------------------------------
// Fixed Per-House breakdown
// ---------------------------------------------------------------------------

export interface FixedPerHouseCosts {
  builder_warranty: number;
  builders_risk: number;
  po_fee: number;
  pm_fee: number;
  am_fee: number;
  utility_charges: number;
  contingency: number;
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export interface SLDealResults {
  // Lot
  totalLotBasis: number;

  // Contract
  sticksBricks: number;
  siteSpecific: number;
  softCosts: number;
  builderFee: number;
  totalContractCost: number;

  // Upgrades
  exteriorUpgrades: number;
  interiorPackage: number;
  miscOptions: number;
  totalUpgradeCost: number;

  // Municipality
  totalMunicipalitySoftCosts: number;

  // Additional site
  totalAdditionalSiteWork: number;

  // Fixed per-house
  fixedPerHouse: FixedPerHouseCosts;
  totalFixedPerHouse: number;

  // Totals
  totalProjectCost: number;

  // Financing
  loanAmount: number;
  equityRequired: number;
  interest: number;
  costOfCapital: number;
  totalCarry: number;

  // Revenue
  asp: number;
  sellingCosts: number;
  sellingConcessions: number;
  netSalesProceeds: number;

  // Bottom line
  totalAllInCost: number;
  netProfit: number;
  netProfitMargin: number;
  npmRating: NPMRating;
  landCostRatio: number;
  landCostRating: LandCostRating;

  // Breakeven
  breakevenASP: number;
  minimumASP5pct: number;

  // Meta
  durationDays: number;
  ltcRatio: number;
  interestRate: number;
  costOfCapitalRate: number;
  sellingCostRate: number;
}

// ---------------------------------------------------------------------------
// Ratings
// ---------------------------------------------------------------------------

export type NPMRating = "STRONG" | "GOOD" | "MARGINAL" | "NO_GO";
export type LandCostRating = "STRONG" | "ACCEPTABLE" | "CAUTION" | "OVERPAYING";

// ---------------------------------------------------------------------------
// Sensitivity
// ---------------------------------------------------------------------------

export interface SensitivityScenario {
  netProfit: number;
  netProfitMargin: number;
  npmRating: NPMRating;
  totalAllInCost: number;
  asp: number;
}

export interface SensitivityResults {
  base: SensitivityScenario;
  bestCase: SensitivityScenario;
  worstCase: SensitivityScenario;
  costOverrun10: SensitivityScenario;
  aspDecline10: SensitivityScenario;
  delay30Days: SensitivityScenario;
}

// ---------------------------------------------------------------------------
// Floor Plan (matches floor_plans table in Supabase)
// ---------------------------------------------------------------------------

export type FloorPlanType = "SFH" | "TH";

export interface FloorPlan {
  id: string;
  name: string;
  type: FloorPlanType;
  heated_sqft: number;
  total_sqft?: number;
  bedrooms: number;
  bathrooms: number;
  stories: number;
  garage_bays: number;
  lot_width_ft?: number;
  lot_depth_ft?: number;
  sb_contract?: number; // S&B from RC Pricing Guide
  sb_dm_budget?: number; // S&B from DM Budget Sept 2025
  total_dm_budget?: number; // Total from DM Budget
  base_construction_cost: number;
  base_sale_price?: number;
  is_active: boolean;
}

// ---------------------------------------------------------------------------
// Municipality Fee Schedule (matches municipalities table)
// ---------------------------------------------------------------------------

export interface MunicipalityFees {
  id: string;
  name: string;
  county: string;
  state: "SC" | "NC";
  water_tap: number;
  water_capacity: number;
  sewer_tap: number;
  sewer_capacity: number;
  building_permit: number;
  trade_permits: number;
  impact_fees: number;
  other_fees: number;
  total_estimated: number;
  notes?: string;
  last_verified?: string;
}

// ---------------------------------------------------------------------------
// Upgrade Options
// ---------------------------------------------------------------------------

export type InteriorTier = "CLASSIC" | "ELEGANCE";
export type InteriorStyle = "FOXCROFT" | "MIDWOOD" | "MADISON" | "UPTOWN";
export type PackageShorthand = "A" | "B" | "C" | "D" | "NONE";

export interface InteriorPackageOption {
  tier: InteriorTier;
  style: InteriorStyle;
  price: number;
}

// ---------------------------------------------------------------------------
// Database row (deal_sheets table)
// ---------------------------------------------------------------------------

export interface DealSheetRow {
  id: string;
  opportunity_id?: string;
  project_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;

  // Inputs (JSON blob or flattened columns)
  inputs: SLDealInputs;

  // Computed results snapshot
  results: SLDealResults;
  sensitivity: SensitivityResults;

  // Status
  status: "draft" | "submitted" | "approved" | "rejected";
  recommendation?: "GO" | "NO_GO" | "CONDITIONAL";
  notes?: string;
}

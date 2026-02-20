/**
 * SL Deal Analyzer — Constants
 *
 * Fixed Per-House Costs (RCH internal) and Contract Defaults.
 * These are the current org defaults for scattered lot deals.
 *
 * Cost vintage: September 2025 DM Budget
 */

// ---------------------------------------------------------------------------
// Fixed Per-House Costs (Section G / Step 3 block)
// ---------------------------------------------------------------------------

export const SL_FIXED_COSTS = {
  BUILDER_WARRANTY: 5_000,
  BUILDERS_RISK: 1_500,
  PO_FEE: 3_000,
  PM_FEE: 3_500,
  AM_FEE: 5_000,
  CONTINGENCY: 11_000,             // flat, never percentage
  UTILITY_RATE_PER_MONTH: 350,     // Duration/30 × $350
} as const;

// ---------------------------------------------------------------------------
// Contract Defaults (from DM Budget standard cost structure)
// ---------------------------------------------------------------------------

export const SL_CONTRACT_DEFAULTS = {
  SITE_SPECIFIC: 10_875,           // survey $1,700 + grading $1,700 + silt $2,000 + temp drive $500 + landscape $2,500 + flatwork $2,475
  SOFT_COSTS: 2_650,               // building permits $2,050 + engineering $600
  BUILDER_FEE: 15_000,             // fixed per house
} as const;

// ---------------------------------------------------------------------------
// Contract Minimums (RC Pricing Guide)
// ---------------------------------------------------------------------------

export const SL_CONTRACT_MINIMUMS = {
  LOT_PREP_MINIMUM: 15_000,
  SOFT_COSTS_MINIMUM: 15_000,
  BUILDER_FEE: 15_000,
  BUILDING_PERMITS: 2_050,         // included in S&B
} as const;

// ---------------------------------------------------------------------------
// Financing Defaults
// ---------------------------------------------------------------------------

export const SL_FINANCING_DEFAULTS = {
  LTC_RATIO: 0.85,
  INTEREST_RATE: 0.10,
  COST_OF_CAPITAL_RATE: 0.16,
  PROJECT_DURATION_DAYS: 120,
  DAY_COUNT_BASIS: 360,            // actual/360
} as const;

// ---------------------------------------------------------------------------
// Sales Defaults
// ---------------------------------------------------------------------------

export const SL_SALES_DEFAULTS = {
  SELLING_COST_RATE: 0.085,        // 8.5% of ASP
} as const;

// ---------------------------------------------------------------------------
// NPM Thresholds
// ---------------------------------------------------------------------------

export const NPM_THRESHOLDS = {
  STRONG: 0.10,
  GOOD: 0.07,
  MARGINAL: 0.05,
} as const;

// ---------------------------------------------------------------------------
// Land Cost Ratio Thresholds
// ---------------------------------------------------------------------------

export const LAND_COST_THRESHOLDS = {
  STRONG: 0.20,
  ACCEPTABLE: 0.25,
  CAUTION: 0.30,
} as const;

// ---------------------------------------------------------------------------
// Upgrade Pricing
// ---------------------------------------------------------------------------

export const EXTERIOR_UPGRADES = {
  HARDIE_COLOR_PLUS: { min: 3_500, max: 4_000 },
  ELEVATION_LEVEL_1: { min: 3_000, max: 4_000 },
  ELEVATION_LEVEL_2: { min: 3_000, max: 4_000 },
} as const;

export const INTERIOR_PACKAGES = {
  CLASSIC: {
    FOXCROFT: 4_059,
    MIDWOOD: 3_792,
    MADISON: 3_852,
    UPTOWN: 3_984,
  },
  ELEGANCE: {
    FOXCROFT: 6_181,
    MIDWOOD: 6_468,
    MADISON: 8_197,
    UPTOWN: 8_623,
  },
} as const;

/** Package shorthand: cost per heated SF */
export const PACKAGE_SHORTHAND = {
  A: 8,
  B: 6,
  C: 4.5,
  D: 3,
  NONE: 0,
} as const;

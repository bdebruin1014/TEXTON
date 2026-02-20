/**
 * Red Cedar Homes — Floor Plan Library
 *
 * Source: DM Budget (September 2025) and RC Pricing Guide.
 * DM Budget is the more current reference where both exist.
 *
 * S&B = Sticks & Bricks only
 * Total (DM) = S&B + Site Specific ($10,875) + Soft Costs ($2,650)
 */

import type { FloorPlanType } from '../types/sl-deal.types';

export interface FloorPlanData {
  name: string;
  type: FloorPlanType;
  heated_sqft: number;
  bedrooms: number;
  bathrooms: number;
  garage: string;
  lot_width_ft: number | null;
  lot_depth_ft: number | null;
  stories: number;
  sb_contract: number | null;     // RC Pricing Guide S&B
  sb_dm_budget: number | null;    // DM Budget S&B (preferred)
  total_dm_budget: number | null; // DM Budget Total
  notes?: string;
}

// ---------------------------------------------------------------------------
// Single Family Homes
// ---------------------------------------------------------------------------

export const SFH_PLANS: FloorPlanData[] = [
  { name: 'TULIP',         type: 'SFH', heated_sqft: 1170, bedrooms: 3, bathrooms: 2,   garage: '1-Car', lot_width_ft: 30, lot_depth_ft: 50, stories: 1,   sb_contract: 96_076,  sb_dm_budget: 105_821, total_dm_budget: 119_346 },
  { name: 'ASH',           type: 'SFH', heated_sqft: 1188, bedrooms: 3, bathrooms: 2,   garage: '2-Car', lot_width_ft: 29, lot_depth_ft: 36, stories: 1,   sb_contract: 97_831,  sb_dm_budget: 140_760, total_dm_budget: 172_562, notes: 'DM Budget uses different site/soft cost assumptions ($19,289 soft / $12,513 site)' },
  { name: 'LILAC',         type: 'SFH', heated_sqft: 1383, bedrooms: 3, bathrooms: 3,   garage: '1-Car', lot_width_ft: 30, lot_depth_ft: 46, stories: 1.5, sb_contract: 113_798, sb_dm_budget: 122_530, total_dm_budget: 136_055 },
  { name: 'BANYAN',        type: 'SFH', heated_sqft: 1400, bedrooms: 3, bathrooms: 3,   garage: '2-Car', lot_width_ft: 28, lot_depth_ft: 24, stories: 3,   sb_contract: 115_510, sb_dm_budget: 134_058, total_dm_budget: 147_583 },
  { name: 'DOGWOOD',       type: 'SFH', heated_sqft: 1541, bedrooms: 3, bathrooms: 2.5, garage: '2-Car', lot_width_ft: 29, lot_depth_ft: 36, stories: 2,   sb_contract: 123_967, sb_dm_budget: 124_031, total_dm_budget: 137_556 },
  { name: 'SPRUCE',        type: 'SFH', heated_sqft: 1545, bedrooms: 3, bathrooms: 2,   garage: '2-Car', lot_width_ft: 39, lot_depth_ft: 54, stories: 1,   sb_contract: 122_622, sb_dm_budget: 129_518, total_dm_budget: 143_043 },
  { name: 'ATLAS',         type: 'SFH', heated_sqft: 1554, bedrooms: 3, bathrooms: 2.5, garage: 'None',  lot_width_ft: 24, lot_depth_ft: 33, stories: 2,   sb_contract: 125_978, sb_dm_budget: 113_777, total_dm_budget: 127_302, notes: 'SF differs slightly between sources' },
  { name: 'ELM',           type: 'SFH', heated_sqft: 1712, bedrooms: 4, bathrooms: 2.5, garage: '2-Car', lot_width_ft: 28, lot_depth_ft: 35, stories: 2,   sb_contract: 136_009, sb_dm_budget: 134_540, total_dm_budget: 148_065 },
  { name: 'HAZEL',         type: 'SFH', heated_sqft: 1713, bedrooms: 4, bathrooms: 2.5, garage: '2-Car', lot_width_ft: 30, lot_depth_ft: 43, stories: 2,   sb_contract: 136_078, sb_dm_budget: 134_200, total_dm_budget: 147_725 },
  { name: 'ASPEN 2-Story', type: 'SFH', heated_sqft: 1788, bedrooms: 3, bathrooms: 2.5, garage: '2-Car', lot_width_ft: 30, lot_depth_ft: 43, stories: 2,   sb_contract: 141_355, sb_dm_budget: 139_412, total_dm_budget: 152_937 },
  { name: 'WILLOW',        type: 'SFH', heated_sqft: 1857, bedrooms: 4, bathrooms: 2.5, garage: '1-Car', lot_width_ft: 30, lot_depth_ft: 40, stories: 2,   sb_contract: 145_710, sb_dm_budget: 133_891, total_dm_budget: 147_416 },
  { name: 'HOLLY',         type: 'SFH', heated_sqft: 2000, bedrooms: 4, bathrooms: 2.5, garage: '2-Car', lot_width_ft: 29, lot_depth_ft: 48, stories: 2,   sb_contract: 156_262, sb_dm_budget: 144_355, total_dm_budget: 157_880 },
  { name: 'WHITE OAK',     type: 'SFH', heated_sqft: 2005, bedrooms: 4, bathrooms: 2.5, garage: '2-Car', lot_width_ft: 38, lot_depth_ft: 35, stories: 2,   sb_contract: 156_615, sb_dm_budget: 143_853, total_dm_budget: 157_378 },
  { name: 'SPINDLE',       type: 'SFH', heated_sqft: 2001, bedrooms: 3, bathrooms: 2,   garage: 'None',  lot_width_ft: null, lot_depth_ft: null, stories: 2, sb_contract: null,    sb_dm_budget: 147_508, total_dm_budget: 161_033 },
  { name: 'LILY',          type: 'SFH', heated_sqft: 2293, bedrooms: 4, bathrooms: 3.5, garage: 'None',  lot_width_ft: null, lot_depth_ft: null, stories: 2.5, sb_contract: null,  sb_dm_budget: 157_945, total_dm_budget: 171_470 },
  { name: 'ACACIA',        type: 'SFH', heated_sqft: 2236, bedrooms: 4, bathrooms: 3,   garage: '2-Car', lot_width_ft: null, lot_depth_ft: null, stories: 1.5, sb_contract: null,  sb_dm_budget: 165_012, total_dm_budget: 178_537 },
  { name: 'ASPEN 3-Story', type: 'SFH', heated_sqft: 2157, bedrooms: 4, bathrooms: 3.5, garage: '2-Car', lot_width_ft: 30, lot_depth_ft: 43, stories: 3,   sb_contract: 171_846, sb_dm_budget: 160_412, total_dm_budget: 173_937 },
  { name: 'CHERRY',        type: 'SFH', heated_sqft: 2214, bedrooms: 4, bathrooms: 3,   garage: '2-Car', lot_width_ft: 38, lot_depth_ft: 38, stories: 2,   sb_contract: 173_637, sb_dm_budget: 156_913, total_dm_budget: 170_438 },
  { name: 'RED OAK',       type: 'SFH', heated_sqft: 2217, bedrooms: 4, bathrooms: 3,   garage: '2-Car', lot_width_ft: 38, lot_depth_ft: 40, stories: 2,   sb_contract: 173_846, sb_dm_budget: 157_989, total_dm_budget: 171_514 },
  { name: 'MAGNOLIA',      type: 'SFH', heated_sqft: 2771, bedrooms: 4, bathrooms: 3,   garage: '2-Car', lot_width_ft: 38, lot_depth_ft: 40, stories: 2,   sb_contract: 213_313, sb_dm_budget: 178_184, total_dm_budget: 191_709 },
];

// ---------------------------------------------------------------------------
// Townhomes
// ---------------------------------------------------------------------------

export const TH_PLANS: FloorPlanData[] = [
  { name: 'PALMETTO',     type: 'TH', heated_sqft: 1304, bedrooms: 3, bathrooms: 2.5, garage: 'None', lot_width_ft: 20, lot_depth_ft: 42, stories: 2,  sb_contract: null, sb_dm_budget: 110_043, total_dm_budget: 123_568 },
  { name: 'PALMETTO II',  type: 'TH', heated_sqft: 1424, bedrooms: 3, bathrooms: 2.5, garage: 'None', lot_width_ft: null, lot_depth_ft: null, stories: 2, sb_contract: null, sb_dm_budget: 111_055, total_dm_budget: 124_580 },
  { name: 'JASMINE',      type: 'TH', heated_sqft: 1500, bedrooms: 3, bathrooms: 2.5, garage: '1-Car', lot_width_ft: 20, lot_depth_ft: 49, stories: 2,  sb_contract: null, sb_dm_budget: 127_142, total_dm_budget: 140_667 },
  { name: 'BAYBERRY',     type: 'TH', heated_sqft: 1500, bedrooms: 3, bathrooms: 2.5, garage: '1F',   lot_width_ft: null, lot_depth_ft: null, stories: 2, sb_contract: null, sb_dm_budget: 125_252, total_dm_budget: 138_777 },
  { name: 'LOCUST',       type: 'TH', heated_sqft: 1669, bedrooms: 3, bathrooms: 2.5, garage: '1F',   lot_width_ft: null, lot_depth_ft: null, stories: 2, sb_contract: null, sb_dm_budget: 133_947, total_dm_budget: 147_472 },
  { name: 'PALM II',      type: 'TH', heated_sqft: 1689, bedrooms: 3, bathrooms: 2.5, garage: '1F',   lot_width_ft: null, lot_depth_ft: null, stories: 2, sb_contract: null, sb_dm_budget: 132_402, total_dm_budget: 145_927 },
  { name: 'FRASER',       type: 'TH', heated_sqft: 1689, bedrooms: 3, bathrooms: 2.5, garage: '2R',   lot_width_ft: null, lot_depth_ft: null, stories: 2, sb_contract: null, sb_dm_budget: 133_563, total_dm_budget: 147_088 },
  { name: 'ALDER',        type: 'TH', heated_sqft: 1700, bedrooms: 3, bathrooms: 2.5, garage: '1R',   lot_width_ft: null, lot_depth_ft: null, stories: 2, sb_contract: null, sb_dm_budget: 130_196, total_dm_budget: 143_721 },
  { name: 'PALM',         type: 'TH', heated_sqft: 1700, bedrooms: 3, bathrooms: 2.5, garage: '1F',   lot_width_ft: null, lot_depth_ft: null, stories: 2, sb_contract: null, sb_dm_budget: 134_067, total_dm_budget: 147_592 },
  { name: 'COTTONWOOD',   type: 'TH', heated_sqft: 1729, bedrooms: 3, bathrooms: 2.5, garage: '1F',   lot_width_ft: null, lot_depth_ft: null, stories: 3, sb_contract: null, sb_dm_budget: 142_078, total_dm_budget: 155_603 },
  { name: 'PINYON',       type: 'TH', heated_sqft: 1748, bedrooms: 3, bathrooms: 3.5, garage: '2',    lot_width_ft: null, lot_depth_ft: null, stories: 2, sb_contract: null, sb_dm_budget: 151_644, total_dm_budget: 165_169 },
  { name: 'BOXELDER',     type: 'TH', heated_sqft: 1796, bedrooms: 4, bathrooms: 2.5, garage: '2',    lot_width_ft: null, lot_depth_ft: null, stories: 2, sb_contract: null, sb_dm_budget: 141_492, total_dm_budget: 155_017 },
  { name: 'FIG',          type: 'TH', heated_sqft: 1798, bedrooms: 3, bathrooms: 3.5, garage: '1R',   lot_width_ft: 18, lot_depth_ft: 40, stories: 3,  sb_contract: null, sb_dm_budget: 150_175, total_dm_budget: 163_700 },
  { name: 'CONIFER',      type: 'TH', heated_sqft: 1892, bedrooms: 0, bathrooms: 0,   garage: '2',    lot_width_ft: null, lot_depth_ft: null, stories: 2, sb_contract: null, sb_dm_budget: 163_028, total_dm_budget: 176_553 },
  { name: 'POPLAR',       type: 'TH', heated_sqft: 1483, bedrooms: 3, bathrooms: 2.5, garage: '2R',   lot_width_ft: null, lot_depth_ft: null, stories: 2, sb_contract: null, sb_dm_budget: 130_814, total_dm_budget: 144_339 },
  { name: 'SYCAMORE',     type: 'TH', heated_sqft: 1993, bedrooms: 3, bathrooms: 2.5, garage: '2R',   lot_width_ft: null, lot_depth_ft: null, stories: 2, sb_contract: null, sb_dm_budget: 146_861, total_dm_budget: 160_386 },
  { name: 'BUR OAK',      type: 'TH', heated_sqft: 1548, bedrooms: 3, bathrooms: 2.5, garage: '1',    lot_width_ft: null, lot_depth_ft: null, stories: 2, sb_contract: null, sb_dm_budget: 124_886, total_dm_budget: 138_411 },
  { name: 'FIR',          type: 'TH', heated_sqft: 2072, bedrooms: 4, bathrooms: 3.5, garage: '2-Car', lot_width_ft: 24, lot_depth_ft: 37, stories: 3,  sb_contract: null, sb_dm_budget: null,    total_dm_budget: null },
  { name: 'LINVILLE',     type: 'TH', heated_sqft: 2188, bedrooms: 4, bathrooms: 2.5, garage: '2F',   lot_width_ft: null, lot_depth_ft: null, stories: 2, sb_contract: null, sb_dm_budget: 160_613, total_dm_budget: 174_138 },
];

// ---------------------------------------------------------------------------
// Combined lookup
// ---------------------------------------------------------------------------

export const ALL_PLANS: FloorPlanData[] = [...SFH_PLANS, ...TH_PLANS];

/** Look up a plan by name (case-insensitive) */
export function findPlan(name: string): FloorPlanData | undefined {
  return ALL_PLANS.find(p => p.name.toLowerCase() === name.toLowerCase());
}

/** Get the preferred S&B cost for a plan (DM Budget preferred, fallback to Contract) */
export function getPreferredSB(plan: FloorPlanData): number | null {
  return plan.sb_dm_budget ?? plan.sb_contract ?? null;
}

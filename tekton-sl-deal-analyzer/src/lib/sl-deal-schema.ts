/**
 * SL Deal Sheet — Zod Validation Schemas
 *
 * Used by React Hook Form for form validation
 * and by Edge Functions for API validation.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const slDealInputSchema = z.object({
  // Property
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.enum(['SC', 'NC']),
  zip: z.string().regex(/^\d{5}$/, 'Must be 5-digit ZIP'),
  municipality: z.string().min(1, 'Municipality is required'),
  lot_dimensions: z.string().optional(),
  zoning: z.string().optional(),
  notes: z.string().optional(),

  // Lot Basis
  lot_purchase_price: z.number().min(1, 'Lot price is required'),
  closing_costs: z.number().min(0).default(0),
  acquisition_commission: z.number().min(0).default(0),
  due_diligence_costs: z.number().min(0).default(0),
  other_lot_costs: z.number().min(0).default(0),
  closing_date: z.string().optional(),

  // Floor Plan
  floor_plan_id: z.string().uuid().optional(),
  floor_plan_name: z.string().min(1, 'Floor plan is required'),
  heated_sqft: z.number().min(500).max(5000),
  bedrooms: z.number().min(1).max(8),
  bathrooms: z.number().min(1).max(6),
  stories: z.number().min(1).max(4),
  garage: z.string().optional(),

  // Construction
  sticks_bricks: z.number().min(1, 'S&B cost is required'),
  site_specific: z.number().min(0).default(10_875),
  soft_costs: z.number().min(0).default(2_650),

  // Upgrades
  exterior_upgrades: z.number().min(0).default(0),
  interior_package: z.number().min(0).default(0),
  misc_options: z.number().min(0).default(0),

  // Municipality
  municipality_soft_costs: z.number().min(0).default(0),

  // Additional site work
  additional_site_work: z.number().min(0).default(0),

  // Financing
  project_duration_days: z.number().min(30).max(730).default(120),
  interest_rate: z.number().min(0).max(0.25).default(0.10),
  cost_of_capital_rate: z.number().min(0).max(0.30).default(0.16),
  ltc_ratio: z.number().min(0).max(1).default(0.85),

  // Sales
  asset_sales_price: z.number().min(1, 'ASP is required'),
  selling_cost_rate: z.number().min(0).max(0.20).default(0.085),
  selling_concessions: z.number().min(0).default(0),
});

export type SLDealInputFormValues = z.infer<typeof slDealInputSchema>;

// ---------------------------------------------------------------------------
// Deal sheet record schema (for DB persistence)
// ---------------------------------------------------------------------------

export const dealSheetStatusSchema = z.enum(['draft', 'submitted', 'approved', 'rejected']);
export const dealSheetRecommendationSchema = z.enum(['GO', 'NO_GO', 'CONDITIONAL']);

export const dealSheetRowSchema = z.object({
  id: z.string().uuid(),
  opportunity_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  created_by: z.string().uuid(),
  status: dealSheetStatusSchema.default('draft'),
  recommendation: dealSheetRecommendationSchema.optional(),
  inputs: slDealInputSchema,
  notes: z.string().optional(),
});

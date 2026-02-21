import { z } from "zod";
import {
  DISPOSITION_STATUSES,
  ENTITY_TYPES,
  JOB_STATUSES,
  LOT_STATUSES,
  OPPORTUNITY_STATUSES,
  PO_STATUSES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
} from "@/lib/constants";

// ── Helpers ─────────────────────────────────────────────

const nonEmpty = z.string().min(1, "Required");
const optionalText = z.string().optional().or(z.literal(""));
const currency = z.number().min(0, "Must be positive").or(z.literal(0));
const percentage = z.number().min(0).max(1);
const optionalCurrency = currency.optional().nullable();
const uuid = z.string().uuid();
const optionalUuid = uuid.optional().nullable();

// ── Auth ────────────────────────────────────────────────

export const signUpSchema = z
  .object({
    fullName: nonEmpty.max(100, "Name too long"),
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const signInSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Required"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ── Pipeline ────────────────────────────────────────────

export const opportunitySchema = z.object({
  opportunity_name: nonEmpty.max(200),
  status: z.enum(OPPORTUNITY_STATUSES),
  project_type: z.enum(PROJECT_TYPES).optional().nullable(),
  source: optionalText,
  assigned_to: optionalText,
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional().nullable(),
  address_street: optionalText,
  address_city: optionalText,
  address_state: optionalText.default("SC"),
  address_zip: optionalText,
  county: optionalText,
  zoning: optionalText,
  acreage: z.number().positive().optional().nullable(),
  lot_price: optionalCurrency,
  estimated_value: optionalCurrency,
  entity_id: optionalUuid,
});

// ── Projects ────────────────────────────────────────────

export const projectSchema = z.object({
  project_name: nonEmpty.max(200),
  status: z.enum(PROJECT_STATUSES),
  project_type: z.enum(PROJECT_TYPES).optional().nullable(),
  address_street: optionalText,
  address_city: optionalText,
  address_state: optionalText.default("SC"),
  address_zip: optionalText,
  entity_id: optionalUuid,
  lot_count: z.number().int().min(0).optional().nullable(),
  total_budget: optionalCurrency,
  total_revenue: optionalCurrency,
  start_date: optionalText,
  target_completion: optionalText,
});

// ── Construction ────────────────────────────────────────

export const jobSchema = z.object({
  lot_number: optionalText,
  floor_plan_name: optionalText,
  status: z.enum(JOB_STATUSES),
  project_name: optionalText,
  project_id: optionalUuid,
  lot_id: optionalUuid,
  floor_plan_id: optionalUuid,
  start_date: optionalText,
  target_completion: optionalText,
  superintendent: optionalText,
});

// ── Lots ────────────────────────────────────────────────

export const lotSchema = z.object({
  lot_number: nonEmpty,
  status: z.enum(LOT_STATUSES),
  address: optionalText,
  lot_premium: optionalCurrency,
  lot_cost: optionalCurrency,
  floor_plan_id: optionalUuid,
  job_id: optionalUuid,
});

// ── Disposition ─────────────────────────────────────────

export const dispositionSchema = z.object({
  status: z.enum(DISPOSITION_STATUSES),
  buyer_name: optionalText,
  buyer_email: z.string().email().optional().or(z.literal("")),
  buyer_phone: optionalText,
  base_price: optionalCurrency,
  contract_price: optionalCurrency,
  earnest_money: optionalCurrency,
  closing_date: optionalText,
  lot_number: optionalText,
  project_name: optionalText,
});

// ── Contacts ────────────────────────────────────────────

export const companySchema = z.object({
  name: nonEmpty.max(200),
  company_type: nonEmpty,
  phone: optionalText,
  email: z.string().email().optional().or(z.literal("")),
  address: optionalText,
  city: optionalText,
  state: optionalText,
  zip: optionalText,
  website: z.string().url().optional().or(z.literal("")),
  tax_id: optionalText,
  notes: optionalText,
});

export const contactSchema = z.object({
  first_name: nonEmpty.max(100),
  last_name: nonEmpty.max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: optionalText,
  title: optionalText,
  role: optionalText,
});

// ── Entities ────────────────────────────────────────────

export const entitySchema = z.object({
  name: nonEmpty.max(200),
  entity_type: z.enum(ENTITY_TYPES).optional().nullable(),
  status: z.enum(["Active", "Inactive"]),
});

// ── Accounting ──────────────────────────────────────────

export const journalEntryLineSchema = z.object({
  account_id: uuid,
  description: optionalText,
  debit: currency.default(0),
  credit: currency.default(0),
});

export const journalEntrySchema = z.object({
  reference: optionalText,
  description: optionalText,
  transaction_date: nonEmpty,
  entity_id: optionalUuid,
  lines: z.array(journalEntryLineSchema).min(2, "Minimum 2 lines"),
});

// ── Purchase Orders ─────────────────────────────────────

export const purchaseOrderSchema = z.object({
  vendor_id: uuid,
  job_id: optionalUuid,
  description: optionalText,
  amount: currency,
  status: z.enum(PO_STATUSES),
  cost_code_id: optionalUuid,
});

// ── Deal Sheet ──────────────────────────────────────────

export const dealSheetInputSchema = z.object({
  lot_purchase_price: currency,
  closing_costs: currency.default(0),
  acquisition_commission: currency.default(0),
  sticks_bricks: currency,
  upgrades: currency.default(0),
  soft_costs: currency.default(0),
  land_prep: currency.default(0),
  site_work_total: currency,
  asset_sales_price: currency,
  selling_cost_rate: percentage.default(0.085),
  selling_concessions: currency.default(0),
  ltc_ratio: percentage.default(0.85),
  interest_rate: percentage.default(0.1),
  cost_of_capital: percentage.default(0.16),
  project_duration_days: z.number().int().min(1).default(120),
  is_rch_related_owner: z.boolean().default(true),
});

// ── Upload Request ──────────────────────────────────────

export const uploadRequestSchema = z.object({
  recipient_name: nonEmpty,
  recipient_email: z.string().email("Invalid email"),
  subject: nonEmpty.max(200),
  message: optionalText,
  due_date: optionalText,
  items: z
    .array(
      z.object({
        name: nonEmpty,
        description: optionalText,
        is_required: z.boolean().default(true),
      }),
    )
    .min(1, "At least one item required"),
});

// ── Share ────────────────────────────────────────────────

export const shareSchema = z.object({
  recipient_name: optionalText,
  message: optionalText,
  allow_download: z.boolean().default(true),
  password: optionalText,
  expires_days: z.number().int().min(1).max(365).default(30),
});

// ── Field-level validator ───────────────────────────────

/** Validate a single field value against a schema field. Returns error string or null. */
export function validateField<T extends z.ZodType>(schema: T, value: unknown): string | null {
  const result = schema.safeParse(value);
  if (result.success) return null;
  return result.error.issues[0]?.message ?? "Invalid value";
}

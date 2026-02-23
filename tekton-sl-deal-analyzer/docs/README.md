# SL Deal Analyzer — KOVA Integration Package

Scattered Lot Deal Analyzer for Red Cedar Homes. One lot, one house, one sale.

This package contains everything needed to add the SL Deal Analyzer to the KOVA codebase. It is NOT a standalone app — it is a set of files designed to be placed directly into the `kova/` repository.

## File Placement

Copy each file into the corresponding location in your KOVA repo:

```
kova/
├── src/
│   ├── lib/
│   │   ├── sl-deal-engine.ts          ← Pure computation engine
│   │   ├── sl-deal-schema.ts          ← Zod validation schemas
│   │   └── sl-deal-format.ts          ← Currency/percent/color formatting
│   ├── types/
│   │   └── sl-deal.types.ts           ← TypeScript interfaces
│   └── data/
│       ├── sl-constants.ts            ← Fixed costs, contract defaults, upgrade pricing
│       ├── floor-plans.ts             ← 39 floor plans (20 SFH + 19 TH) with DM Budget costs
│       └── municipality-fees.ts       ← 12 jurisdictions across SC and NC
├── supabase/
│   └── migrations/
│       └── 20260220_create_deal_sheets.sql  ← DB migration
└── docs/
    └── sl-deal-analyzer-spec.md       ← Full SKILL.md spec for Claude reference
```

## What Each File Does

### Core Engine (`src/lib/sl-deal-engine.ts`)

Pure TypeScript — no React, no Supabase, no side effects. Takes `SLDealInputs`, returns `SLDealResults`. Also exports `runSensitivityAnalysis()` for the 6-scenario sensitivity table.

This is the single source of truth for all deal math. The UI, API, and memo generator all call this function.

### Types (`src/types/sl-deal.types.ts`)

Every interface the engine uses: `SLDealInputs`, `SLDealResults`, `FixedPerHouseCosts`, `SensitivityResults`, `FloorPlan`, `MunicipalityFees`, `DealSheetRow`, rating types, upgrade types.

### Constants (`src/data/sl-constants.ts`)

All fixed values in one place:

(1) Fixed Per-House Costs (RCH): Warranty $5K, Builder's Risk $1.5K, PO Fee $3K, PM Fee $3.5K, AM Fee $5K, Contingency $11K flat, Utility $350/month.

(2) Contract Defaults: Site Specific $10,875, Soft Costs $2,650, Builder Fee $15,000.

(3) Financing Defaults: 85% LTC, 10% interest, 16% cost of capital, 120-day duration, actual/360.

(4) Sales: 8.5% selling cost rate.

(5) Upgrade pricing: exterior, interior (Classic/Elegance × 4 styles), package shorthand.

### Floor Plans (`src/data/floor-plans.ts`)

All 39 plans from the September 2025 DM Budget: 20 SFH (TULIP through MAGNOLIA) and 19 TH (PALMETTO through LINVILLE). Each has S&B costs from both the RC Pricing Guide and DM Budget, plus dimensions, bed/bath, garage, stories.

Includes `findPlan()` and `getPreferredSB()` helper functions.

### Municipality Fees (`src/data/municipality-fees.ts`)

Fee schedules for 12 jurisdictions across SC and NC, plus the NC county quick-reference table from the DM Budget. Each municipality has water, sewer, permit, and trade permit ranges with low/high estimates and a `must_verify` flag.

### Validation (`src/lib/sl-deal-schema.ts`)

Zod schemas for React Hook Form integration. Validates all inputs with sensible defaults (120-day duration, 85% LTC, 8.5% selling costs, etc.).

### Formatting (`src/lib/sl-deal-format.ts`)

Currency formatting, percentage formatting, NPM/Land Cost Ratio color-coded badge classes (Tailwind), and the cost vintage disclaimer string.

### Database Migration (`supabase/migrations/`)

Creates two tables:
(a) `deal_sheets` — stores inputs as JSONB, computed results as JSONB, plus status/recommendation. Linked to opportunities and projects via FK. RLS enabled.
(b) `municipality_fee_schedules` — admin-configurable fee schedules with a computed `total_estimated` column. RLS enabled.

Both have `updated_at` triggers and audit triggers.

## Integration Points

### Pipeline Deal Sheet Page

The deal sheet form at `src/routes/_authenticated/pipeline/$opportunityId/deal-sheet.tsx` should:
(1) Use `slDealInputSchema` with React Hook Form for validation.
(2) On any field change, call `calculateSLDeal(inputs)` and display results live.
(3) Auto-save the inputs + results to the `deal_sheets` table via `useAutoSave`.
(4) Show the sensitivity table from `runSensitivityAnalysis(inputs)`.

### Project Deal Sheet Page

Same form at `src/routes/_authenticated/projects/$projectId/deal-sheet.tsx`, pre-connected to the project.

### Admin Fee Schedule Page

`src/routes/_authenticated/admin/municipalities.tsx` — CRUD for the `municipality_fee_schedules` table.

### Admin Deal Analyzer Config

`src/routes/_authenticated/admin/fee-schedule.tsx` — display the 8-line fixed cost breakdown and contract defaults from `sl-constants.ts`.

## Key Business Rules

(1) Contingency is a flat $11,000 per house. Never calculate as a percentage.
(2) Builder Fee is $15,000 fixed per house (RCH contract).
(3) Interest uses actual/360 day count.
(4) Cost of capital rate is 16%/360.
(5) DM Budget costs are September 2025 vintage. Always note in memo.
(6) Municipality soft costs MUST be verified. Flag in every deal sheet.
(7) $15K lot prep and $15K soft cost are contract minimums, not estimates.

## Cost Vintage

All construction costs are from the September 2025 DM Budget. The floor plan library and line-item costs should be updated when new vendor pricing is received. The `sl-constants.ts` and `floor-plans.ts` files are the only files that need updating when costs change.

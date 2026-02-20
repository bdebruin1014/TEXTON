# Tekton — Proforma Tools & Deal Analyzer Buildout Specification

## Scope

This specification covers the complete buildout of two interconnected Tekton capabilities: (1) the Deal Analyzer engine (scattered lot underwriting tool embedded in Pipeline), and (2) the Proforma Tools module (standalone tools page for community development, lot development, and lot purchase proformas). Both systems draw from a shared reference data layer — floor plan costs, municipality fee schedules, upgrade packages, site work items, and the fixed per-house fee schedule — all managed through Admin.

## Branding

All user-facing labels, headers, document titles, and UI copy must use **Red Cedar Homes** (or **RCH**) — never "VanRock." Some source Excel files in the repo carry legacy "VanRock" filenames from when the deal sheet was branded under the holding company. Those filenames are fine as-is in the repo, but every Tekton screen, exported document, and proforma output should reference Red Cedar Homes.

## Reference Data Sources (GitHub Repo)

The following files in the TEK-TON repo provide the authoritative data to seed and validate every calculation:

1. `RC_Pricing_Guide_Contract_Format (2).xlsx` — 22 floor plans with full 53-line-item sticks & bricks breakdown, 7-category contract cost structure, upgrade menu, and floor plan specifications
2. `VanRock_SL_Deal_Sheet (1) (1).xlsx` — Working scattered lot deal analyzer (source file uses legacy "VanRock" branding; all Tekton UI and outputs must use "Red Cedar Homes" or "RCH") with Floor Plans tab, Municipalities tab, Site Work Itemization tab, Comps tab, Upgrades tab, and Jenny's Checklist
3. `Ramsey_RedCedar_ProForma (1).xlsx` — Community development JV proforma (Phase 1 horizontal + Phase 2 vertical, LP buyout waterfall, scattered lot fund waterfall)
4. `24-017 Rutland-Aiken Land Development Model 12.1.24(1).xlsm` — Lot development proforma model
5. `Floorplan Deck with Renderings and Specs 1 (1) (1).pdf` — Floor plan renderings, specs, and elevation drawings for all plans

Additionally, the skill file at `/mnt/skills/user/sl-deal-analyzer/references/build-cost-database.md` contains the DM Budget (September 2025) vendor-level costs for 40+ plans, and `/mnt/skills/user/sl-deal-analyzer/references/municipality-soft-costs.md` contains jurisdiction-specific fee schedules across SC and NC.

---

## PART 1: SHARED REFERENCE DATA LAYER

### 1A. Floor Plan Library (`floor_plans` + `sticks_bricks_items`)

The existing `floor_plans` table and `sticks_bricks_items` table already exist in the schema (migration 00003 + 00014). Seed data must be loaded from the RC Pricing Guide for all 22 contract plans AND from the DM Budget for the additional ~18 townhome/newer plans.

**Floor Plan Fields** (current schema is sufficient):
- `name`, `elevation`, `heated_sqft`, `total_sqft`, `bed_count`, `bath_count`, `stories`, `garage_bays`
- `base_construction_cost` = Sticks & Bricks total (from RC Pricing Guide column)
- `base_sale_price` = optional target ASP
- `status` = Active/Inactive

**New columns needed on `floor_plans`**:
- `plan_type` text CHECK ('SFH','Townhome') — distinguishes single family from townhome
- `width_ft` numeric(5,1) — footprint width
- `depth_ft` numeric(5,1) — footprint depth
- `garage_type` text — 'None','1-Car','2-Car','1F','2F','1R','2R' (F=front, R=rear)
- `dm_budget_snb` numeric(15,2) — DM Budget sticks & bricks cost (September 2025)
- `dm_budget_total` numeric(15,2) — DM Budget total (S&B + standard site + standard soft)
- `contract_snb` numeric(15,2) — RC Pricing Guide sticks & bricks total
- `contract_total` numeric(15,2) — RC Pricing Guide total contract cost (7 sections)
- `cost_per_sf` numeric(8,2) — computed S&B / heated_sqft
- `rendering_url` text — Supabase Storage path to rendering image
- `floorplan_url` text — Supabase Storage path to floor plan drawing

**Sticks & Bricks Items** (53 line items per plan): The existing `sticks_bricks_items` table stores line-item costs per floor plan. Seed from the RC Pricing Guide "Sticks & Bricks Detail" tab — all 53 categories × 22 plans = 1,166 rows.

### 1B. Municipality Fee Schedules (`municipalities`)

The existing `municipalities` table (migration 00014) already has the correct structure. Seed from both the RCH Deal Sheet "Municipalities" tab and the skill file `municipality-soft-costs.md`. Load the following jurisdictions:

SC: Greenville County (unincorporated), City of Greenville, Travelers Rest, City of Easley, Simpsonville, Mauldin, Greer, Fountain Inn, Spartanburg County, City of Spartanburg, Duncan, Lyman, Wellford, Inman, Landrum

NC: Mecklenburg/Charlotte, Henderson County/Hendersonville, plus all NC counties from the DM Budget quick reference table (Union, Iredell, Lincoln, Gaston, York SC, Catawba, Cabarrus, Forsyth, Rowan, Lancaster SC, Stanly, Guilford, Davidson, Alexander)

### 1C. Upgrade Packages (`upgrade_packages`)

Existing table (migration 00014). Seed from RC Pricing Guide "Upgrades Menu" tab:

Exterior: Hardie Color-Plus Siding ($3,500–$4,000), Elevation Level 1 ($3,000–$4,000), Elevation Level 2 ($3,000–$4,000)

Interior Classic: Foxcroft ($4,059), Midwood ($3,792), Madison ($3,852), Uptown ($3,984)

Interior Elegance: Foxcroft ($6,181), Midwood ($6,468), Madison ($8,197), Uptown ($8,623)

Package Shorthand: A = $8/SF, B = $6/SF, C = $4.50/SF, D = $3/SF, None = $0

### 1D. Site Work Items (`site_work_items`)

Existing table (migration 00014). Seed the 18-line standard itemization from the RCH Deal Sheet "Site Work Itemization" tab. DM Budget standard totals: survey $1,700, grading $1,700, silt fence $2,000, temp drive $500, landscaping $2,500, flatwork $2,475 = $10,875 total.

### 1E. Fixed Per-House Fee Schedule

Already defined in `src/lib/constants.ts` as `FIXED_PER_HOUSE_FEES` and configurable via Admin > Fee Schedule (`fee_schedule` table). Current correct values per Bryan's latest update:

| Fee | Amount |
|-----|--------|
| Builder Fee | $15,000 |
| Warranty | $5,000 |
| Builder's Risk Insurance | $1,500 |
| Bookkeeping | $1,500 |
| PM Fee | $3,500 |
| PO Fee | $3,000 |
| Utility Charges | $1,400 |

Update `constants.ts` to reflect these exact values (rename `accounting_fee` to `bookkeeping` for consistency with Bryan's terminology). The AM Fee ($5,000) applies only to RCH-related entity owners and is paid at sale.

### 1F. Contract Fee Formulas

**Builder Fee (Section 6)**: GREATER of $25,000 or 10% of Sections 1–5
**Contingency (Section 7)**: Lower of $10,000 or 5% of Sections 1–5 (note: the skill file says GREATER but the RC Pricing Guide formula is `=MIN(10000, 0.05*SUM(E:I))` which caps at $10K — use MIN/cap)

**CRITICAL**: The corrective schema `00014` and the current `constants.ts` both use GREATER (Math.max) for contingency. The actual RC Pricing Guide formula is `=MIN(10000, 0.05*SUM())` — contingency should be CAPPED at $10K, not floored. The RCH Deal Sheet instructions confirm "Contingency: Lower of $10,000 or 5% of costs." Fix `computeContingency` to use `Math.min(10_000, sections1to5 * 0.05)`.

---

## PART 2: SCATTERED LOT DEAL ANALYZER (Pipeline Module)

### Current State

The existing `deal-sheet.tsx` page at `/pipeline/$opportunityId/deal-sheet` provides a basic deal analyzer with manual inputs for purchase price, site work, base build cost, upgrade package, ASP, concessions, duration, interest rate, and LTC. It calls `calculateDealSheet()` from `deal-engine.ts` and displays verdicts.

The existing `deal_sheets` table (migration 00014) is more comprehensive than what the UI currently uses — it already has fields for municipality_id, floor_plan_id, address, itemized cost sections, and computed result columns.

### What Needs to Change

The deal sheet page must be rebuilt to match the RCH SL Deal Sheet Excel workflow — select a floor plan (auto-populates costs), select a municipality (auto-populates soft costs), enter site-specific adjustments, and see instant proforma results. The page should use the `deal_sheets` table instead of the older `deal_analyses` table.

### Deal Sheet Page Layout (Pipeline > Opportunity > Deal Sheet)

**Header Row**: Deal Sheet title, version selector dropdown (if multiple versions), "+ New Analysis" button

**Section 1 — Property & Plan** (2-column card):
- Left: Street Address, City, State, Zip (auto-saved to `deal_sheets.address`)
- Right: Floor Plan selector (dropdown from `floor_plans` where status='Active'), auto-populates: SF, Beds, Baths, Garage, Stories, Type, Width × Depth, Sticks & Bricks cost, Total Contract Cost

**Section 2 — Acquisition** (2-column card):
- Lot Purchase Price, Closing Costs (default 5% of purchase), Acquisition Commission, Acquisition Bonus/Bird Dog, Other Lot Costs
- Closing/Purchase Date, Project Duration (days, default 120)

**Section 3 — Municipality Soft Costs** (2-column card):
- Municipality selector (dropdown from `municipalities`), auto-populates: Water Tap, Sewer Tap, Gas Tap, Permitting, Impact, Architect, Engineering, Survey
- Each field is editable (auto-save override), Total Municipality Soft Costs shown

**Section 4 — Upgrades** (compact card):
- Upgrade Package selector (A/B/C/D/None), auto-calculates $/SF × plan SF
- Individual upgrade line items (Hardie, Elevation, Interior Package) with amounts
- Total Upgrade Cost

**Section 5 — Site Work** (toggle between Lump Sum and Itemized):
- Lump Sum mode: single "Site Work / Grading" input + "Other Site Costs" input
- Itemized mode: 18-line itemization from `site_work_items` with per-line amounts
- Total Site-Specific Costs

**Section 6 — Fixed Per-House Costs** (read-only reference card):
- Display all 8 fees from `FIXED_PER_HOUSE_FEES` with RCH-related toggle
- Show total

**Section 7 — Sales** (compact card):
- Asset Sales Price (ASP), Selling Cost Rate (default 8.5%), Selling Concessions

**Section 8 — Financing** (compact card):
- LTC Ratio (default 85%), Interest Rate (default 10%), Cost of Capital (default 16%)

**RIGHT COLUMN — Results** (sticky on scroll):

**Verdict Cards** (2-up): Net Profit Margin with color-coded verdict, Land Cost Ratio with color-coded verdict

**Cost Summary card**: Total Lot Basis, Sections 1-5, Builder Fee (S6), Contingency (S7), Total Contract Cost, Upgrades, Municipality Soft Costs, Site-Specific Costs, Fixed Per-House, Total Project Cost

**Financing card**: Loan Amount, Equity Required, Interest Cost, Cost of Capital, Total All-In

**Returns card**: Selling Costs, Net Proceeds, Net Profit, Net Profit Margin, Land Cost Ratio

**Sensitivity Analysis card** (collapsible): Base Case, Best Case (5% cost reduction + 5% ASP increase), Worst Case (10% cost overrun + 10% ASP decline + 30-day delay). Show NPM and profit for each. Flag scenarios below 5% NPM.

### Deal Engine Updates (`deal-engine.ts`)

1. Fix `computeContingency` to use `Math.min(10_000, sections1to5 * 0.05)` — this is a bug
2. Add floor plan auto-population: when `floor_plan_id` is set, pull `contract_snb` (or `dm_budget_snb` if contract not available) and set as `sticks_bricks`
3. Add municipality auto-population: when `municipality_id` is set, sum all fee fields into `soft_costs`
4. Add upgrade auto-calculation: package shorthand × SF
5. Add sensitivity analysis function
6. Use actual/360 day count for interest (currently uses /365 — fix to /360 per skill file)

### Comps Tab

The existing `deal_sheet_comps` table supports this. Add a "Comps" section below the deal sheet (or as a tab) where the user enters comparable sales: address, sale price, sale date, SF, $/SF, beds, baths, notes. Calculate average, median, and average $/SF. This is reference data to support the ASP assumption.

---

## PART 3: PROFORMA TOOLS MODULE

### Route Structure

```
/tools/                      — Tools index (grid of available tools)
/tools/deal-analyzer         — Standalone SL deal analyzer (same as pipeline version but detached from opportunity)
/tools/community-proforma    — Community Development proforma
/tools/lot-dev-proforma      — Lot Development proforma  
/tools/lot-purchase-proforma — Lot Purchase proforma
```

### 3A. Standalone Deal Analyzer (`/tools/deal-analyzer`)

Identical to the Pipeline deal sheet but not linked to an opportunity. Creates `deal_sheets` records with `opportunity_id = null`. Useful for quick back-of-napkin analysis before creating a pipeline opportunity.

### 3B. Community Development Proforma (`/tools/community-proforma`)

Modeled after the Ramsey proforma. Two-phase structure:

**Phase 1 — Horizontal Development (Land → Finished Lots)**

Assumptions panel (auto-save):
- Total Lots, Land Value per Lot, Horizontal Dev Cost per Lot, A&E per Lot
- Amenity Package (lump sum), Monument Sign (lump sum)
- Carry Costs per Lot, Contingency %
- Construction Management Fee per Lot (with cap)
- Developer Fee per Lot
- Lot Sales Price (internal transfer price to Phase 2 or external sale price)
- Bank LTC %, Bank Interest Rate %
- LP Pref Return %, LP Buyout IRR %

Sources & Uses (computed):
- Uses: Land Acquisition, Horizontal Development, A&E, Amenity, Monument, Carry Costs → Subtotal Hard Costs → Contingency → Total Hard + Contingency → Const Mgmt Fee → Developer Fee → Interest Reserve → Total Uses
- Sources: Senior Debt (LTC × Total Uses), LP Equity (Total Uses - Debt)
- Lot Sales Proceeds, Gross Margin

LP Buyout Waterfall (computed table):
- Tranches based on lot sales pace (configurable: lots per period, period months)
- LP Principal per tranche, IRR Factor = (1 + IRR)^(months/12), Buyout Amount
- Lot Proceeds per tranche, GP Equity per tranche
- Summary: Total LP Investment, Total LP Buyout, LP Profit, LP Multiple
- GP Rolled Equity to Phase 2

**Phase 2 — Vertical Construction (Finished Lots → Home Sales)**

Per-Home Economics panel:
- Home Sales Price, Selling Costs %, Seller Concession
- Lot Cost (from Phase 1 lot sales price)
- Vertical Construction Cost (from floor plan library — pick plan or use weighted average)
- Construction Interest (cost × 50% avg balance × rate × months/12)
- Per-Home Profit, Per-Home Margin

Project Totals (computed):
- Total Revenue, Total Costs, Total Profit (all × total lots)

Capital Structure:
- GP Rolled Equity from Phase 1
- Total Lot Cost (lots × lot price)
- Scattered Lot Fund LP Capital (lot cost - GP equity)

LP Return Calculation:
- LP Capital, Accruing Return Rate, Investment Period
- Accrued Return, Total LP Payout

Waterfall Distribution:
- Gross Profit from Home Sales
- Less: LP Accrued Return
- Remaining to GPs
- GP Split (configurable %, default 50/50)

### 3C. Lot Development Proforma (`/tools/lot-dev-proforma`)

Modeled after the Rutland-Aiken Land Development Model. Horizontal-only (no vertical construction).

Assumptions:
- Total Lots, Phases, Lots per Phase
- Land Acquisition Cost (total or per-lot)
- Horizontal Development Cost per Lot (infrastructure, roads, utilities, stormwater)
- Entitlement Costs (engineering, surveying, legal, zoning, environmental)
- Amenity/Common Area costs
- Carry Costs, Contingency %
- Developer Fee, Construction Management Fee
- Lot Sales Price per lot (may vary by phase)
- Bank LTC, Interest Rate, LP terms

Sources & Uses (same structure as Community Dev Phase 1)

Absorption Schedule:
- Lots sold per month/quarter by phase
- Revenue by period
- Cumulative revenue vs cumulative cost → breakeven timing

Returns:
- Project-level IRR, equity multiple, profit margin
- LP waterfall if applicable

### 3D. Lot Purchase Proforma (`/tools/lot-purchase-proforma`)

For when RCH is buying finished lots from a developer via a Lot Purchase Agreement (LPA).

Assumptions:
- Total Lots in LPA, Takedown Tranches (number, lots per tranche, timing)
- Lot Cost per lot (or per tranche if varying)
- Vertical Construction Cost (from floor plan library)
- Upgrades, Municipality Soft Costs
- Fixed Per-House Fees
- ASP per home (or by plan type)
- Selling Costs, Concessions
- Construction Financing terms
- Absorption pace (homes started per month)

Takedown Schedule Table:
- Tranche #, Lot Count, Price/Lot, Total Cost, Takedown Date, Deposit

Per-Home Economics (same as SL deal analyzer but applied across all lots)

Project-Level Summary:
- Total Equity Deployed, Total Revenue, Total Profit
- Project-level ROI, IRR, Equity Multiple
- Monthly cash flow projection

---

## PART 4: ADMIN CONFIGURATION

### Admin Pages That Support These Tools

1. **Admin > Floor Plans** (existing, enhance): Add columns for `plan_type`, `width_ft`, `depth_ft`, `garage_type`, `dm_budget_snb`, `contract_snb`, `rendering_url`. Add click-to-expand for sticks & bricks line items. Add bulk import from Excel.

2. **Admin > Municipalities** (existing, enhance): Pre-seeded with all SC/NC jurisdictions. Add "Verify Date" and "Verified By" fields per the skill file's emphasis on verification.

3. **Admin > Fee Schedule** (existing, correct): Update `FIXED_PER_HOUSE_FEES` in constants.ts to match Bryan's latest: Builder Fee $15K, Warranty $5K, Builder's Risk $1,500, Bookkeeping $1,500, PM $3,500, PO $3,000, Utilities $1,400. Rename `accounting_fee` → `bookkeeping`.

4. **Admin > Upgrade Packages** (existing): Seed from RC Pricing Guide.

5. **Admin > Site Work Items** (existing): Seed standard 18-line itemization.

6. **Admin > Pricing Defaults** (existing): Contract minimums (Lot Prep $15K, Soft Costs $15K), Builder Fee formula, Contingency formula.

---

## PART 5: DATABASE SEED MIGRATION

Create a new migration (`00015_seed_reference_data.sql`) that:

1. Inserts all 22 RC Pricing Guide floor plans into `floor_plans` with specs and costs
2. Inserts all ~18 additional DM Budget townhome plans into `floor_plans`
3. Inserts 53 × 22 = 1,166 sticks & bricks line items into `sticks_bricks_items`
4. Inserts ~30 municipalities into `municipalities` with fee schedules
5. Inserts 11 upgrade packages into `upgrade_packages`
6. Inserts 18 site work items into `site_work_items`
7. Inserts 1 row into `fee_schedule` with current defaults

All amounts should come from the Excel files and reference docs, not from approximation.

---

## PART 6: CONSTANTS.TS CORRECTIONS

```typescript
export const FIXED_PER_HOUSE_FEES = {
  builder_fee: 15_000,
  am_fee: 5_000,        // RCH-related entities only
  builder_warranty: 5_000,
  builders_risk: 1_500,
  po_fee: 3_000,        // was "purchaser_fee"
  bookkeeping: 1_500,   // was "accounting_fee"
  pm_fee: 3_500,        // was 3_000, now 3_500
  utilities: 1_400,
} as const;

// Contingency: CAPPED at lower of $10K or 5% — NOT the greater
export const computeContingency = (sections1to5: number) =>
  Math.min(10_000, sections1to5 * 0.05);

// Builder Fee: GREATER of $25K or 10%
export const computeBuilderFee = (sections1to5: number) =>
  Math.max(25_000, sections1to5 * 0.1);
```

Also fix `deal-engine.ts` to use actual/360 day count:
```typescript
const interest_cost = loan_amount * inputs.interest_rate * (inputs.project_duration_days / 360);
const cost_of_capital_amount = equity_required * inputs.cost_of_capital * (inputs.project_duration_days / 360);
```

---

## PART 7: IMPLEMENTATION SEQUENCE

1. **Database**: New migration with floor plan seed data, municipality data, reference data
2. **Constants**: Fix `FIXED_PER_HOUSE_FEES`, `computeContingency`, day count
3. **Deal Engine**: Update `calculateDealSheet()` with floor plan/municipality auto-population, sensitivity analysis, actual/360
4. **Deal Sheet UI**: Rebuild `/pipeline/$opportunityId/deal-sheet` to use `deal_sheets` table, floor plan selector, municipality selector, upgrade package selector, site work toggle, comps section, sensitivity analysis
5. **Tools Index**: Update `/tools/index` with four active tool cards
6. **Standalone Deal Analyzer**: `/tools/deal-analyzer` — detached version of pipeline deal sheet
7. **Community Dev Proforma**: `/tools/community-proforma` — Phase 1 + Phase 2 + waterfalls
8. **Lot Dev Proforma**: `/tools/lot-dev-proforma` — horizontal-only model
9. **Lot Purchase Proforma**: `/tools/lot-purchase-proforma` — takedown + vertical model
10. **Admin Enhancements**: Floor plan detail view with sticks & bricks, municipality verification fields, upgrade package management

---

## PART 8: KEY BUSINESS RULES

1. Interest calculations use actual/360 day count, not actual/365
2. Cost of capital is 16% annualized using actual/360
3. Contingency is CAPPED at lower of $10K or 5% (MIN, not MAX)
4. Builder Fee is GREATER of $25K or 10% (MAX)
5. Lot Prep minimum is $15,000 per contract
6. Soft Costs minimum is $15,000 per contract
7. Selling costs default to 8.5% of ASP
8. LTC default is 85%
9. AM Fee ($5K) only applies to RCH-related entity owners
10. DM Budget costs are September 2025 vintage — always note in memos
11. Municipality fees must be verified before closing — flag in every analysis
12. The floor plan rendering PDF contains images for all plans — these should be extracted and stored in Supabase Storage for display in the floor plan selector

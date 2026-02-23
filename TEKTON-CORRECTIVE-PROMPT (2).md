# KOVA — Corrective Prompt for Claude Code

## Context

You are working on the KOVA codebase — a real estate development platform built with React 19, TypeScript, Vite 6, TanStack Router + Query, Zustand, shadcn/ui, Tailwind CSS v4, and Supabase. The codebase was built from Phases 1-10 of the original prompt set. However, the original prompts contained errors and omissions that need correction. The Supabase database has been corrected (all 3 migrations run), but the frontend code still reflects the old incorrect prompts.

**Before making ANY changes, read these files in the repo root:**
- TEKTON-BUILDOUT-PLAN.md (file name unchanged, content references KOVA)
- TEKTON-PAGE-INTERACTIONS.md (file name unchanged, content references KOVA)
- tekton-master-prompt.md (file name unchanged, content references KOVA)
- TEKTON-SUPPLEMENTAL-UPDATES-FINAL.md (file name unchanged, content references KOVA)
- TEKTON-PROMPTS-UPDATED.md (file name unchanged, content references KOVA)

Then audit the existing codebase to understand what has already been built. Only then apply the corrections below.

---

## 1. REGENERATE TYPES

The database schema has changed. Run:

```bash
npx supabase gen types typescript --linked > src/types/database.ts
```

Verify the generated types include ALL new tables: municipalities, site_work_items, sticks_bricks_items, upgrade_packages, pricing_defaults, pricing_exclusions, handoff_checklist_items, job_handoffs, job_handoff_items, project_components, deal_sheets, deal_sheet_site_work, deal_sheet_comps, deal_sheet_upgrades, deal_sheet_checklist, esign_templates, esign_documents, esign_signers, rch_contracts, rch_contract_units, rch_contract_draws, project_plan_catalog, project_elevation_options, project_upgrade_catalog.

Also verify floor_plans now has: heated_sqft, total_sqft, garage_bays, base_construction_cost (NOT sqft, garage_type, base_cost). And opportunities now has buy_box fields, land_committee fields, municipality_id.

---

## 2. FIX CONSTANTS — Builder Fee Schedule

Find `src/lib/constants.ts` (or wherever fee defaults are defined). The old code likely has a flat $15K builder fee as the only per-house cost. Replace with the corrected 8-line fee breakdown:

```typescript
export const FIXED_PER_HOUSE_FEES = {
  builder_fee: 15_000,        // Flat builder fee
  am_fee: 5_000,              // Asset Management — ONLY for RCH-related entity owners, paid at sale
  builder_warranty: 5_000,    // Warranty reserve
  builders_risk: 1_500,       // Builders risk insurance
  purchaser_fee: 3_000,       // Purchaser fee (was "PO Fee")
  accounting_fee: 1_500,      // Accounting fee
  pm_fee: 3_000,              // Project management fee
  utilities: 1_400,           // Utility charges during construction
} as const;

// Total per-house: $35,400 (RCH-related) or $30,400 (third-party, no AM fee)
export const totalFixedPerHouse = (isRchRelated: boolean) =>
  Object.entries(FIXED_PER_HOUSE_FEES).reduce(
    (sum, [key, val]) => sum + (key === 'am_fee' && !isRchRelated ? 0 : val),
    0
  );

// Builder Fee formula (Section 6 of contract budget): GREATER of $25K or 10% of Sections 1-5
export const computeBuilderFee = (sections1to5: number) =>
  Math.max(25_000, sections1to5 * 0.10);

// Contingency formula (Section 7): GREATER of $10K or 5% of Sections 1-5
export const computeContingency = (sections1to5: number) =>
  Math.max(10_000, sections1to5 * 0.05);
```

Remove the old `default_builder_fee: 15000`, `default_warranty_reserve: 5000`, `default_builders_risk: 1500`, `default_po_fee: 3000`, `default_pm_fee: 3500`, `default_utility_charges: 1400`, `default_contingency_cap: 10000` pattern if it exists.

---

## 3. FIX CONSTANTS — Entity Structure

Remove ANY references to "NewShire Property Management" or "WG Maintenance" entities. These do not exist.

Update entity type enum to include: 'holding', 'builder', 'operating', 'spe', 'fund', 'nonprofit', 'investor', 'management'. Remove 'pm' and 'maintenance' if present.

The correct entities are:
- VanRock Holdings LLC (holding) — third-party, NOT RCH-related
- Red Cedar Homes LLC (builder) — RCH-related
- Red Cedar Homes SC, LLC (operating) — RCH-related
- Scattered Lot Fund II, LLC (fund) — RCH-related (third-party BUT related)
- Carolina Affordable Housing Project Inc. (nonprofit) — RCH-related
- 153 Oakwood Ave LLC (spe) — Oslo Project, RCH-related
- DCL Holdings (investor) — third-party
- TCMP (investor) — third-party
- SCR Management, LLC (management) — third-party

---

## 4. FIX CONSTANTS — Project Types

Remove 'btr' (Build-to-Rent) if present anywhere. Only 4 project types exist:
- scattered_lot
- community_dev (in DB) / community (in UI)
- lot_dev (in DB) / lot_development (in UI)
- lot_purchase

---

## 5. FIX FLOOR PLAN REFERENCES

The floor_plans table columns are: `heated_sqft`, `total_sqft`, `garage_bays`, `base_construction_cost`, `base_sale_price`. NOT `sqft`, `garage_type`, `base_cost`.

Find all components, queries, and types referencing the old column names and update them. Key files to check:
- Any FloorPlanSelect component
- Any floor plan display/table
- Deal sheet/deal analyzer forms
- Job detail forms
- Plan catalog pages

The floor plans are named after trees: TULIP, ASH, PALMETTO, LILAC, BANYAN, JASMINE, DOGWOOD, SPRUCE, ATLAS, PALM, ELM, HAZEL, ASPEN 2-Story, FIG, WILLOW, HOLLY, WHITE OAK, FIR, ASPEN 3-Story, CHERRY, RED OAK, MAGNOLIA. 22 total. If the code still references "The Ashford", "The Meridian", "The Summit" — those are the old seed data and should no longer appear.

---

## 6. FIX / CREATE DEAL ENGINE — src/lib/deal-engine.ts

If a deal analyzer / deal engine exists, rewrite it to match this spec. If it doesn't exist, create it.

```typescript
interface DealSheetInputs {
  // Lot acquisition
  lot_purchase_price: number;
  closing_costs: number;
  acquisition_commission?: number;
  acquisition_bonus?: number;
  other_lot_costs?: number;

  // Construction (from floor plan + municipality + overrides)
  sticks_bricks: number;
  upgrades: number;
  soft_costs: number;
  land_prep: number;
  site_specific: number;

  // Site work
  site_work_total: number;
  other_site_costs?: number;

  // Fixed per-house
  is_rch_related_owner: boolean;

  // Sales
  asset_sales_price: number;
  selling_cost_rate: number;  // default 0.085
  selling_concessions?: number;

  // Financing
  ltc_ratio: number;          // default 0.85
  interest_rate: number;      // default 0.10
  cost_of_capital: number;    // default 0.16
  project_duration_days: number; // default 120
}

interface DealSheetResults {
  // Lot basis
  total_lot_basis: number;

  // Contract sections
  sections_1_to_5: number;
  builder_fee: number;       // Section 6: GREATER($25K, 10% of S1-5)
  contingency: number;       // Section 7: GREATER($10K, 5% of S1-5)
  total_contract_cost: number;

  // Fixed per-house
  total_fixed_per_house: number;

  // Total project cost
  total_project_cost: number;

  // Financing
  loan_amount: number;
  equity_required: number;
  interest_cost: number;
  cost_of_capital_amount: number;
  total_all_in: number;

  // Sales
  selling_costs: number;
  net_proceeds: number;

  // Results
  net_profit: number;
  net_profit_margin: number;
  land_cost_ratio: number;
  profit_verdict: 'STRONG' | 'GOOD' | 'MARGINAL' | 'NO GO';
  land_verdict: 'STRONG' | 'ACCEPTABLE' | 'CAUTION' | 'OVERPAYING';
}
```

Key formulas:
- total_lot_basis = lot_purchase_price + closing_costs + acquisition_commission + acquisition_bonus + other_lot_costs
- sections_1_to_5 = sticks_bricks + upgrades + soft_costs + land_prep + site_specific
- builder_fee = Math.max(25000, sections_1_to_5 * 0.10)
- contingency = Math.max(10000, sections_1_to_5 * 0.05)
- total_contract_cost = sections_1_to_5 + builder_fee + contingency
- total_fixed_per_house = sum of 8 fees (exclude am_fee if !is_rch_related_owner)
- total_project_cost = total_lot_basis + total_contract_cost + total_fixed_per_house + site_work_total + other_site_costs
- loan = total_project_cost * ltc_ratio
- equity = total_project_cost - loan
- interest = loan * interest_rate * (project_duration_days / 365)
- cost_of_capital_amount = equity * cost_of_capital * (project_duration_days / 365)
- total_all_in = total_project_cost + interest + cost_of_capital_amount
- selling_costs = asset_sales_price * selling_cost_rate
- net_proceeds = asset_sales_price - selling_costs - selling_concessions
- net_profit = net_proceeds - total_all_in
- net_profit_margin = net_profit / asset_sales_price
- land_cost_ratio = (total_lot_basis + site_work_total + other_site_costs) / asset_sales_price

Scoring:
- Profit: >10% STRONG, 7-10% GOOD, 5-7% MARGINAL, <5% NO GO
- Land: <20% STRONG, 20-25% ACCEPTABLE, 25-30% CAUTION, >30% OVERPAYING

---

## 7. ADD TOPNAV "OPERATIONS" DROPDOWN

The TopNav currently has 8 module links. Add a 9th: "Operations" as a DROPDOWN (not a simple link). The dropdown has 3 items:
1. Deal Sheets → /operations/deal-sheets
2. E-Sign Documents → /operations/esign
3. RCH Contracts → /operations/rch-contracts

Use the existing shadcn DropdownMenu component. Style the dropdown trigger to match other nav items. Active state: if ANY operations route is active, the Operations trigger shows active styling.

---

## 8. ADD OPERATIONS > DEAL SHEETS PAGES

Create the global Deal Sheets dashboard and detail pages:

**Index:** `src/routes/_authenticated/operations/deal-sheets/index.tsx`
- IndexSidebar: All / SL Deal Sheets / Community / Lot Dev / Lot Purchase / Approved / Declined / Archived with count badges
- DataTable: Sheet #, Name, Type badge, Status badge, Connected To (link), Address, ASP, Net Profit Margin (color-coded), Land Cost Ratio (color-coded), Created By, Date
- "+ New Deal Sheet" → dialog: select type, connect to opp/project/new, creates deal_sheets record

**Detail:** `src/routes/_authenticated/operations/deal-sheets/$dealSheetId.tsx`
- Full deal sheet form using deal-engine.ts
- Municipality dropdown auto-populates soft costs
- Floor plan dropdown auto-populates sticks & bricks from base_construction_cost
- Site work section: lump sum or expandable 18-line itemization (from site_work_items table)
- Upgrades section: 3 exterior + 8 interior packages (from upgrade_packages table) + custom
- Comps sub-table (from deal_sheet_comps)
- Jenny's checklist (collapsible, from deal_sheet_checklist)
- Two verdict badges: Net Profit Margin + Land Cost Ratio
- Buy-box screening at top for scattered lot type
- Connection badge showing linked opportunity/project
- All fields auto-save

---

## 9. ADD OPERATIONS > E-SIGN DOCUMENTS PAGES

**Index:** `src/routes/_authenticated/operations/esign/index.tsx`
- Sidebar: All / Draft / Sent / Viewed / Partially Signed / Completed / Declined / Voided / Expired
- DataTable: Name, Template badge, Status badge, Connected Record (link), Signers, Sent Date, Completed Date
- "+ New E-Sign" → wizard (upload/template → assign record → add signers → send)

**Detail:** `src/routes/_authenticated/operations/esign/$esignId.tsx`
- Document preview, signer status list, timeline, connected record link, Void/Resend actions

---

## 10. ADD OPERATIONS > RCH CONTRACT MANAGEMENT PAGES

This is the most complex new module. Process-driven contract generation.

**Index:** `src/routes/_authenticated/operations/rch-contracts/index.tsx`
- Sidebar: All / Intake / Plan Selection / Sterling Pricing / Lot Condition Review / Budget Assembly / Contract Generation / Sent for Signature / Active / Complete / Cancelled
- DataTable: Contract #, Type badge, Status badge, Owner/Client, Units, Contract Amount, Project Link

**Detail:** `src/routes/_authenticated/operations/rch-contracts/$contractId/`
Sub-pages (process-driven sidebar):
1. overview.tsx — Contract info, client, project link, type, dates
2. units.tsx — Table of rch_contract_units: lot, plan, elevation, phase. "+ Add Unit" / "Import from Plan Catalog"
3. upgrades.tsx — Per-unit upgrade selections
4. sterling.tsx — Per-unit Sterling PO tracking (request/received/amount/status)
5. lot-conditions.tsx — Per-unit lot condition reports (assigned CM, date, notes, site-specific cost)
6. budget.tsx — Auto-assembled 7-section budget per unit + fixed per-house + summary
7. contract-preview.tsx — Assembled contract with Exhibits A-D
8. signatures.tsx — E-sign status, client/RCH signed dates
9. create-jobs.tsx — "Create Jobs" action (single: 1 job, multi: N jobs, community: N jobs across phases)
10. files.tsx

---

## 11. FIX PIPELINE > DEAL SHEET PAGE

If the pipeline detail has a "deal-analyzer" page, rename it to "deal-sheet". Update the sidebar label from "Deal Analyzer" to "Deal Sheet". The form should use the same deal-engine.ts as the Operations > Deal Sheets page. It creates/updates a deal_sheets record connected to the opportunity.

---

## 12. ADD PROJECT > PLAN CATALOG PAGE

Add `src/routes/_authenticated/projects/$projectId/plan-catalog.tsx`

For community projects: program floor plans per project, assign to lots, configure elevation options and upgrade packages. Uses project_plan_catalog + project_elevation_options + project_upgrade_catalog tables. This feeds into RCH Contract Management and Disposition.

---

## 13. ADD PROJECT > DEAL SHEET PAGE

Add `src/routes/_authenticated/projects/$projectId/deal-sheet.tsx`

Embedded deal sheet for this project. Same form as Operations deal sheet but pre-connected to this project. Type auto-set from project type.

---

## 14. FIX CONSTRUCTION > HANDOFF PAGE

Add or fix `src/routes/_authenticated/construction/$jobId/handoff.tsx`

22-item checklist from handoff_checklist_items table. Monday handoff rule. Physical + digital package tracking. Uses job_handoffs + job_handoff_items tables.

---

## 15. ADD ADMIN PAGES

Add these admin pages if missing:
- `municipalities.tsx` — CRUD for 24 jurisdictions with 8 fee categories each
- `esign-templates.tsx` — DocuSeal template management
- Update `fee-schedule.tsx` to show the corrected 8-line fee breakdown with builder fee formula + contingency formula

---

## 16. ADD MUNICIPALITY SELECT COMPONENT

Create `src/components/forms/MunicipalitySelect.tsx`

Dropdown of municipalities from the municipalities table. When selected, auto-populates 8 fee fields (water_tap, sewer_tap, gas_tap, permitting, impact, architect, engineering, survey) into the parent form. Used in Pipeline detail, Deal Sheet forms, and Project detail.

---

## 17. UPDATE ROUTES

Ensure all TanStack Router file-based routes exist for:
- /operations/deal-sheets (index + $dealSheetId)
- /operations/esign (index + $esignId)
- /operations/rch-contracts (index + $contractId with sub-routes)
- /projects/$projectId/plan-catalog
- /projects/$projectId/deal-sheet
- /construction/$jobId/handoff
- /admin/municipalities
- /admin/esign-templates

---

## 18. VERIFY BUILD

After all changes:
```bash
npm run build
```

Fix any TypeScript errors. The most common will be:
- Old column names (sqft vs heated_sqft, garage_type vs garage_bays, base_cost vs base_construction_cost)
- Missing imports for new tables/types
- Old entity references (NewShire, WG Maintenance)
- Old fee constants

Commit and push when clean.

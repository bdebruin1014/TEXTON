# TEKTON — Page Interaction Patterns

## Supplemental to TEKTON-BUILDOUT-PLAN.md

This document defines the data entry pattern for every page in Tekton. There are three patterns:

1. **Inline Form (Auto-Save)** — Fields render directly on the page. User types, selects, toggles. 800ms debounce saves automatically. No buttons needed.

2. **Table + Add Button** — Page shows a data table of records. A `+ Add [Record]` button opens a form (slide-over sheet or inline row) to create a new record. Rows may be editable inline or click-to-edit.

3. **Read-Only + Action Button** — Page shows computed data, rollup tables, or read-only summaries. Action buttons trigger navigation or workflows (not data entry).

Every page below is annotated with its pattern and the exact button(s) required.

---

## Module 1: Pipeline

### Index Page — `/pipeline`

| Element | Pattern |
|---------|---------|
| Opportunity list table | Table |
| **`+ New Opportunity`** button | Top-right, primary. Opens new opportunity form (slide-over or dedicated creation page). |

### Detail Pages — `/pipeline/$opportunityId/...`

| Page | Pattern | Buttons |
|------|---------|---------|
| Basic Info | Inline Form (Auto-Save) | None needed |
| Property Details | Inline Form (Auto-Save) | None needed |
| Parcels | Table + Add | **`+ Add Parcel`** — top-right of table. Opens inline row or slide-over for new parcel. |
| Contacts | Table + Add | **`+ Link Contact`** — top-right. Opens contact picker or new contact form. |
| Deal Analyzer | Inline Form (Auto-Save) inputs + computed outputs | **`+ New Analysis`** — creates a new version. **`Save as PDF`** — exports. |
| Comps | Table + Add | **`+ Add Comp`** — top-right. Opens form for comparable sale entry. |
| Due Diligence | Table + checklist with inline status | **`+ Add Item`** — adds a custom DD item beyond the standard 20. |
| Underwriting | Inline Form (Auto-Save) | None needed |
| Offer & Contract | Inline Form (Auto-Save) + nested counter-offers table | **`+ Add Counter Offer`** — inside the counter-offers sub-table. |
| Documents | Table + Upload | **`+ Upload Document`** — opens file picker (Supabase Storage). |
| Convert to Project | Action | **`Convert to Project ▶`** — bottom of sidebar or bottom of page. Triggers the full conversion workflow. |

---

## Module 2: Projects

### Index Page — `/projects`

| Element | Pattern |
|---------|---------|
| Project card grid | Read-only cards with click-through |
| **`+ New Project`** button | Top-right, primary. Opens project creation form. |

### Detail Pages — `/projects/$projectId/...`

| Page | Pattern | Buttons |
|------|---------|---------|
| Basic Info | Inline Form (Auto-Save) + Summary Financials Card (read-only) | None needed |
| Property Details | Inline Form (Auto-Save) | None needed |
| Contacts | Table + Add | **`+ Link Contact`** |
| Timeline | Inline Form (Auto-Save) dates + visual milestone display | **`+ Add Milestone`** — for custom milestones beyond the standard set. |
| Parcels & Land | Table + Add | **`+ Add Parcel`** — for raw land parcels. **`+ Add Takedown Tranche`** — for lot purchase projects (inside Lot Takedown sub-table). |
| Due Diligence | Table + checklist | **`+ Add Item`** |
| Entitlements | Inline Form (Auto-Save) | None needed |
| Horizontal | Inline Form (Auto-Save) + line items table | **`+ Add Line Item`** — inside the horizontal development scope table. |
| Lot Inventory | Table + Add | **`+ Add Lot`** — top-right. Opens lot creation form. **`Assign to Job`** — row action button on lots with status = Available/Reserved. **`Bulk Import Lots`** — secondary button for batch creation. |
| Home Plans & Pricing | Table + Add | **`+ Add Plan`** — adds a floor plan to the project's plan mix. **`Edit Pricing`** — opens pricing matrix editor. |
| Budget & Financials | Inline Form (Auto-Save) category rows + computed totals | **`+ Add Budget Line`** — adds a new line item to a budget category. **`+ Add Expense`** — inside the expense tracking sub-table. |
| Draw Management | Table + Add | **`+ New Draw Request`** — creates a new draw request. |
| Loan Tracking | Inline Form (Auto-Save) | None needed |
| Investor / Entity | Inline Form (Auto-Save) + read-only capital stack display | **`+ Link Investor`** — adds an investor/fund relationship. |
| Jobs Summary | Read-Only rollup table | None needed (click row → navigates to CM job). |
| Dispo Summary | Read-Only rollup table | None needed (click row → navigates to Disposition). |
| Closeout | Checklist (inline toggles) | None needed |
| Files | Table + Upload | **`+ Upload Document`** |
| Insurance | Table + Add | **`+ Add Insurance Certificate`** |

---

## Module 3: Construction Management

### Index Page — `/construction`

| Element | Pattern |
|---------|---------|
| Jobs list table | Table |
| **`+ New Job`** button | Top-right, primary. Opens job creation form (requires selecting Project + Lot). |

### Detail Pages — `/construction/$jobId/...`

| Page | Pattern | Buttons |
|------|---------|---------|
| Job Info | Inline Form (Auto-Save) | None needed |
| Budget | Table with inline edit (cost code rows) | **`+ Add Budget Line`** — adds a cost code row. **`Import from Template`** — populates from budget template. |
| Schedule | Milestone display with action buttons per milestone | **`Start`** / **`Complete`** / **`Block`** — per milestone row (inline action buttons). **`+ Add Milestone`** — for custom milestones. |
| Purchase Orders | Table + Add | **`+ New PO`** — top-right. Opens PO creation form. |
| Subcontracts | Table + Add | **`+ New Subcontract`** — top-right. Opens subcontract creation form. |
| Change Orders | Table + Add | **`+ New Change Order`** — top-right. Opens CO creation form. |
| Inspections | Table + Add | **`+ Schedule Inspection`** — top-right. Opens inspection scheduling form. |
| Selections | Table + Add | **`+ Add Selection`** — top-right. Opens option selection form. |
| Photos | Gallery + Upload | **`+ Upload Photos`** — opens multi-file picker. |
| Daily Logs | Table + Add | **`+ New Daily Log`** — top-right. Opens daily log entry form. |
| Punch List | Table + Add | **`+ Add Punch Item`** — top-right. Opens punch list item form. |
| Warranty | Table + Add | **`+ New Claim`** — top-right. Opens warranty claim form. |
| Files | Table + Upload | **`+ Upload Document`** |
| Permits | Table + Add | **`+ Add Permit`** — top-right. Opens permit record form. |

---

## Module 4: Disposition

### Index Page — `/disposition`

| Element | Pattern |
|---------|---------|
| Dispositions list table | Table |
| **`+ New Disposition`** button | Top-right, primary. Opens disposition creation form (requires selecting Project + Lot). |

### Detail Pages — `/disposition/$dispositionId/...`

| Page | Pattern | Buttons |
|------|---------|---------|
| Overview | Inline Form (Auto-Save) | None needed |
| Marketing | Inline Form (Auto-Save) + photo gallery | **`+ Upload Photos`** — for listing photos. |
| Showings | Table + Add | **`+ Add Showing`** — top-right. Opens showing record form. |
| Offers | Table + Add | **`+ Add Offer`** — top-right. Opens offer entry form. Per-offer: **`Accept`** / **`Counter`** / **`Reject`** action buttons. |
| Buyer Information | Inline Form (Auto-Save) | None needed |
| Pricing & Contract | Inline Form (Auto-Save) + computed totals | None needed |
| Option Selections | Table + Add | **`+ Add Option`** — top-right. Opens selection form. |
| Lender & Financing | Inline Form (Auto-Save) | None needed |
| Closing Coordination | Inline Form (Auto-Save) + 12-step milestone timeline with inline status toggles | None needed (milestones are toggled inline). |
| Settlement & Proceeds | Inline Form (Auto-Save) + computed net proceeds | **`Upload Settlement Statement`** — file upload for HUD/ALTA. **`Upload Wire Confirmation`** — file upload. |
| Post-Closing | Inline Form (Auto-Save) | None needed |
| Warranty | Table + Add | **`+ New Claim`** — shared warranty claim component. |
| Files | Table + Upload | **`+ Upload Document`** |

---

## Module 5: Accounting

### Sidebar Pages — `/accounting/...`

| Page | Pattern | Buttons |
|------|---------|---------|
| Register | Table (read-only transaction list) | Rows click to edit/view journal entry detail. |
| Banking | Table + Add | **`+ Add Bank Account`** — for setting up new accounts. **`Import Transactions`** — for bank feed import. |
| Reconciliation Dashboard | Read-only status grid | None needed (click into month to start/view). |
| Start Reconciliation | Wizard/Action | **`Start Reconciliation`** — primary action button. **`Undo Previous`** — secondary. |
| Rec. History | Read-only table | None needed (click row to view completed reconciliation). |
| Aggregate Payments | Table + Add | **`+ New Batch Payment`** — creates aggregate payment batch. |
| Reports | Read-only card grid + generated views | **`Generate Report`** — per report type. **`Export PDF`** / **`Export Excel`**. |
| Invoices | Table + Add | **`+ New Invoice`** — top-right. Opens invoice creation form. Per-invoice: **`Approve`** / **`Pay`** / **`Void`** action buttons. |
| Chart of Accounts | Table + Add | **`+ Add Account`** — top-right. Opens account creation form. |
| Journal Entries | Table + Add | **`+ New Journal Entry`** — top-right. Opens JE form with balanced debit/credit lines. Per-JE: **`Post`** / **`Void`** action buttons. **`+ Add Line`** — inside the JE detail to add debit/credit lines. |
| AP | Table + filters | **`+ New Bill`** — top-right. **`Approve Selected`** — bulk action. **`Pay Selected`** — bulk action. |
| AR | Table + filters | **`+ New Draw Request`** / **`+ New Invoice`** — top-right. |
| Job Costing | Read-only rollup tables | None needed (data flows from CM POs/invoices). |
| Period Close | Checklist with inline toggles | **`Close Period`** — primary action when all 12 steps complete. **`Reopen Period`** — secondary (requires admin). |

---

## Module 6: Purchasing

| Page | Pattern | Buttons |
|------|---------|---------|
| Estimates | Table + Add | **`+ New Estimate`** — opens estimate builder by cost code. **`Convert to Budget`** — per estimate action. |
| Purchase Orders | Table (cross-job view) | **`+ New PO`** — top-right (selecting job first). **`Approve`** — per-PO action. |
| Subcontracts | Table (cross-job view) | **`+ New Subcontract`** — top-right. |
| Vendors | Table + Add | **`+ Add Vendor`** — top-right. Opens company creation form. |

---

## Module 7: Contacts

### Index Page — `/contacts`

| Page | Pattern | Buttons |
|------|---------|---------|
| Companies list | Table | **`+ Add Company`** — top-right, primary. |
| Company Detail | Inline Form (Auto-Save) + contacts sub-table | **`+ Add Contact`** — inside the people sub-table for this company. |
| Employees | Table + Add | **`+ Add Employee`** |
| Customers | Table + Add | **`+ Add Customer`** |

---

## Module 8: Investors

| Page | Pattern | Buttons |
|------|---------|---------|
| Funds list | Table | **`+ New Fund`** — top-right, primary. |
| Fund Detail | Inline Form (Auto-Save) + investors sub-table | **`+ Add Investor`** — inside the investors sub-table. |
| Capital Calls | Table + Add | **`+ New Capital Call`** — top-right. Opens call form with investor allocation breakdown. **`Issue Notice`** — per-call action (generates PDF). |
| Distributions | Table + Add | **`+ New Distribution`** — top-right. Opens distribution form with waterfall calculation. **`Issue Notice`** — per-distribution action (generates PDF). |

---

## Module 9: Calendar

| Page | Pattern | Buttons |
|------|---------|---------|
| Calendar view | FullCalendar display | **`+ New Event`** — top-right or click-on-date. Opens event creation form. |

---

## Module 10: Workflows

| Page | Pattern | Buttons |
|------|---------|---------|
| Core Workflows list | Table | **`+ New Workflow`** — top-right, primary. |
| Workflow Detail | Table of milestones + tasks (editable) | **`+ Add Milestone`** — adds a new milestone section. **`Save Changes`** — explicit save (one of the few pages with a save button per master prompt rules). |
| Transaction Types | Table + Add | **`+ Add Transaction Type`** |
| Smart Actions | Table + Add | **`+ New Smart Action`** — opens rule builder form. |
| Assignment Groups | Table + Add | **`+ New Assignment Group`** |
| Templates | Table + Add | **`+ New Template`** |

---

## Module 11: Admin

| Page | Pattern | Buttons |
|------|---------|---------|
| Overview | Read-only card grid | None needed (cards navigate to sub-pages). |
| Users | Table + Add | **`+ Add User`** — top-right. Opens user creation/invitation form. |
| Permission Groups | Tab bar + table | **`+ Add Permission Group`** — top-right. **`+ Add User`** — inside group detail to assign users. |
| Entities | Table + Add | **`+ Add Entity`** — top-right. Opens entity creation form. |
| Bank Accounts | Table + Add | **`+ Add Bank Account`** — top-right. |
| Documents | Gallery + Add | **`+ Create Document`** — opens template creation (From Existing / Blank / Template). |
| Floor Plans | Table + Add | **`+ Add Floor Plan`** — top-right. Opens plan entry form. |
| Cost Codes | Table + Add | **`+ Add Cost Code`** — top-right. **`Import Cost Codes`** — secondary, for CSV import. |
| Fee Schedule | Inline Form (Auto-Save) | None needed (org default fields: builder fee, warranty, etc.) |
| Integrations | Card grid + configuration forms | **`Connect`** — per integration card (Microsoft 365, DocuSeal, Bank Feeds). |
| Audit Log | Read-only table with filters | None needed (search/filter only). |

---

## Tools (Placeholder)

| Page | Pattern | Buttons |
|------|---------|---------|
| Tools index | Placeholder card grid | None needed (all cards show "Coming Soon" state). |

---

## Button Design Rules

1. **Primary action buttons** (`+ New [Record]`) use `background: #1B3022, color: #fff, border-radius: 8px, padding: 10px 20px, font-weight: 600, font-size: 13px`.

2. **Secondary action buttons** (Export, Import, Bulk actions) use `background: transparent, color: #1B3022, border: 1px solid #E2E8F0`.

3. **Inline action buttons** (Start, Complete, Approve, per-row actions) use `background: transparent, color: #1B3022, font-size: 12px, font-weight: 500, padding: 4px 12px`.

4. **Destructive actions** (Void, Delete, Cancel) use `color: #B84040` and require a confirmation dialog.

5. **Primary action buttons always go top-right** of the page header, aligned with the page title.

6. **Table action buttons go top-right** of the card containing the table.

7. **Inline row actions** appear on hover or in a dropdown menu (three-dot icon) on the row's right edge.

8. **The `+ Upload Document` button** opens the Supabase Storage file picker component and accepts drag-and-drop.

9. **The `Convert to Project ▶` button** is the only button that appears at the bottom of a sidebar rather than in the main content area.

10. **Workflow Detail is the exception**: `Save Changes` is an explicit save button (per master prompt: "No save buttons except workflow templates and bulk actions").

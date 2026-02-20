---
name: sl-deal-analyzer
description: "Use this skill whenever the user wants to underwrite a single scattered lot deal where Red Cedar Homes buys one lot, builds one house, and sells it. Triggers include: 'review this property', 'review these properties', 'scattered lot fund', 'RCH scattered lot', 'scattered lot', 'underwrite this deal', 'run the numbers', 'underwriting memo', 'is this deal feasible', or any mention of scattered lot analysis, proforma, or deal screening. This skill explicitly excludes lot development deals, community development deals, lot purchase agreements, and subdivision entitlement. Strictly one lot, one house, one sale."
---

# SL Deal Analyzer — Individual Lot Build-to-Sell

## Purpose

This skill underwrites individual scattered lot deals where Red Cedar Homes purchases a single lot, builds one home, and sells it. It produces an institutional-quality underwriting memo as a formatted Word document (.docx). The skill identifies the right floor plan, pulls costs from the Red Cedar build cost database, applies municipality-specific soft costs, auto-searches comparable sales, calculates Net Profit Margin and Land Cost Ratio, runs sensitivity analysis, and produces a go/no-go recommendation.

This is a single-lot tool. It does not handle community developments, lot developments, or lot purchase agreements.

Read `references/build-cost-database.md` for the complete floor plan library and line-item construction costs (September 2025 DM Budget pricing). Read `references/municipality-soft-costs.md` for jurisdiction-specific fee schedules across SC and NC.

## Step 1: Gather Project Inputs

Collect inputs in logical groupings. If the user provides incomplete information, ask for missing items grouped together rather than one at a time.

### A. Property Info

Street address, city, state, zip, municipality/jurisdiction (determines soft costs), lot dimensions, zoning, notable characteristics.

### B. Total Lot Basis

All acquisition costs:
- Lot purchase price
- Lot closing costs (title, recording, attorney, transfer taxes)
- Acquisition commission/bonus (bird dog fee, deal sourcing)
- Due diligence costs (survey if pre-close, environmental, soil test)
- Other acquisition costs (back taxes, liens, HOA transfer)
- **Total Lot Basis** = sum of all above

Also: closing/purchase date, project duration (days, default 120), interest rate (annual %), cost of capital rate (default 16%).

### C. Floor Plan Selection

Select from the Red Cedar library in `references/build-cost-database.md`. When recommending a plan, consider lot width/depth, zoning, target price point, and neighborhood character. The database contains actual bid-level line-item costs (DM Budget September 2025) for 40+ plans across SFH and townhome types.

### D. Upgrades and Options

Three independent categories:

**Exterior Upgrades**: Hardie Color-Plus Siding ($3,500–$4,000), Elevation Level 1 ($3,000–$4,000), Elevation Level 2 ($3,000–$4,000).

**Interior Packages** (one tier/style): Classic tier (Foxcroft $4,059, Midwood $3,792, Madison $3,852, Uptown $3,984) or Elegance tier (Foxcroft $6,181, Midwood $6,468, Madison $8,197, Uptown $8,623). Harmony tier for BTR only on select plans.

**Package Shorthand**: A=$8/SF, B=$6/SF, C=$4.50/SF, D=$3/SF, None=$0.

**Miscellaneous Options**: Itemized one-off costs (back windows, brick water table, HOA ARB, custom work). **Total Upgrade Cost** = Exterior + Interior + Misc.

### E. Municipality Soft Costs

Select jurisdiction from `references/municipality-soft-costs.md`. Categories: water tap/meter, sewer tap/connection, building permit, impact fees, zoning fees, other local charges. **Total Municipality Soft Costs** = sum of all.

### F. Site-Specific Costs

The builder contract includes $10,875 standard site work (survey, grading, silt fence, temp drive, landscaping, flatwork) plus $2,650 standard soft costs (permits, engineering). Enter ADDITIONAL site costs beyond contract: clearing, tree removal, extra grading, fill import, retaining walls, rock removal, stepped foundation, etc.

### G. Fixed Per-House Costs (RCH internal)

Builder Warranty $5,000, Builder's Risk Insurance $1,500, PO Fee $3,000, PM Fee $3,500, RCH AM Fee $5,000, Utility Charges (Duration/30 × $350), Contingency $11,000 (flat).

### H. Sales Info

ASP, Selling Costs (8.5% of ASP), Selling Concessions ($).

## Step 2: Auto-Search Comparable Sales

After gathering address and plan specs, search for comps within 0.25 miles, sold within 6 months, matching SF/bed/bath/type. Score on 0–100 scale (SF match 30pts, bedroom 20pts, bathroom 15pts, year built 20pts, property type 15pts). Select top 5–8. If fewer than 3, note thin coverage and proceed. Allow manual override/additions.

## Step 3: Build the Financial Model

### Cost Assembly

```
FROM BUILD COST DATABASE (references/build-cost-database.md):
  Sticks & Bricks (actual bid-level line items) ........... varies by plan
  Site Specific (survey, grading, silt, temp drive, landscape, flatwork) = $10,875 standard
  Soft Costs (building permits $2,050 + engineering $600) .............. = $2,650 standard

FIXED:
  Builder Fee (RCH contract) = $15,000

TOTAL CONTRACT COST = S&B + Site Specific + Soft Costs + Builder Fee
```

### Fixed Per-House Costs (RCH)

```
Builder Warranty .............. $5,000
Builder's Risk Insurance ...... $1,500
PO Fee ........................ $3,000
PM Fee ........................ $3,500
RCH AM Fee .................... $5,000
Utility Charges ............... Duration/30 × $350
Contingency ................... $11,000 (flat)

TOTAL FIXED PER-HOUSE = sum of all above
```

### Total Project Cost

```
Total Lot Basis + Total Contract Cost + Total Upgrade Cost
+ Total Municipality Soft Costs + Total Additional Site Work
+ Total Fixed Per-House (RCH) = TOTAL PROJECT COST
```

### Financing

```
Loan (LTC 85%) = 85% × Total Project Cost
Equity Required = Total Project Cost - Loan
Interest = Loan × (Rate / 360) × Days
Cost of Capital = Equity × (16% / 360) × Days
Total Carry = Interest + Cost of Capital
```

### Results

```
Total All-In Cost = Total Project Cost + Total Carry
Net Sales Proceeds = ASP - (ASP × 8.5%) - Concessions
NET PROFIT = Net Sales Proceeds - Total All-In Cost
NET PROFIT MARGIN = Net Profit / ASP
LAND COST RATIO = Total Lot Basis / ASP
```

### Color Codes

NPM: >10% STRONG, 7–10% GOOD, 5–7% MARGINAL, <5% NO GO.
Land Cost Ratio: <20% STRONG, 20–25% ACCEPTABLE, 25–30% CAUTION, >30% OVERPAYING.

## Step 4: Sensitivity Analysis

Base Case (as input), Best Case (5% cost reduction + 5% ASP increase), Worst Case (10% cost overrun + 10% ASP decline + 30-day delay combined). Individual stress tests: (1) 10% cost overrun, (2) 10% ASP decline, (3) 30-day delay. Show NPM and profit under each. Flag scenarios below 5% NPM. Calculate Breakeven ASP and Minimum ASP for 5% margin.

## Step 5: Generate Underwriting Memo

Produce .docx file. Read `/mnt/skills/public/docx/SKILL.md` first.

**Formatting**: Times New Roman 12pt black RGB(0,0,0). No bullet points or dashes. Prose and numbered lists only. Hierarchy: ARTICLE > Section > (a) > (A) > (1)/(i). Header: "RED CEDAR HOMES — CONFIDENTIAL UNDERWRITING MEMO". Page numbers in footer.

**Structure**: Cover Page, ARTICLE I (Deal Summary), ARTICLE II (Property and Plan), ARTICLE III (Cost Analysis with 7 sections), ARTICLE IV (Revenue and Returns with comps), ARTICLE V (Sensitivity Analysis), ARTICLE VI (Risk Factors), ARTICLE VII (Recommendation), EXHIBIT A (Cost Breakdown), EXHIBIT B (Sensitivity Detail), EXHIBIT C (Comps).

## Important Notes

- Never fabricate market data. Label all assumptions.
- Interest: actual/360. Cost of capital: 16%/360.
- DM Budget costs are September 2025. Note vintage in memo.
- Municipality soft costs MUST be verified. Flag in every memo.
- $15K lot prep and soft cost minimums are contract minimums, not estimates.
- Contingency is a flat $11,000 per house. Do not calculate as a percentage.

# TEKTON — Complete Buildout Plan

## For: Claude Code + GitHub + Supabase + Vercel

**Owner:** Bryan De Bruin · Red Cedar Homes / VanRock Holdings
**Stack:** Vite 6 · React 19 · TypeScript 5.9 strict · TanStack Router · Supabase · Vercel

---

## Architecture Overview

```
GitHub Repo (vanrock-holdings/tekton)
  │
  ├── Push to main ──→ Vercel (auto-deploy production)
  ├── Push to dev  ──→ Vercel (preview deployments)
  │
  └── supabase/ directory
       ├── migrations/ ──→ supabase db push (schema changes)
       ├── functions/  ──→ supabase functions deploy (edge functions)
       └── config.toml
```

```
Browser ──→ Vite SPA (Vercel CDN)
              │
              ├── TanStack Router (file-based, type-safe)
              ├── TanStack Query v5 (server state, cache)
              ├── Zustand (UI state only)
              │
              └──→ Supabase
                    ├── PostgreSQL (data)
                    ├── Auth (PKCE)
                    ├── Storage (documents, photos)
                    ├── Realtime (live updates)
                    └── Edge Functions (AI, integrations)
```

---

## Phase 0: Repository + Infrastructure Setup

This is what you do before writing any application code. Claude Code handles all of it.

### 0.1 — Create the Vite Project

```bash
npm create vite@latest tekton -- --template react-ts
cd tekton
```

### 0.2 — Install the Full Stack

**Core Framework:**
```bash
npm install react@19 react-dom@19
npm install @tanstack/react-router @tanstack/react-router-devtools
npm install @tanstack/react-router-vite-plugin
npm install @tanstack/react-query @tanstack/react-query-devtools
npm install @tanstack/react-table
npm install zustand
npm install react-hook-form @hookform/resolvers zod
```

**Supabase:**
```bash
npm install @supabase/supabase-js @supabase/ssr
```

**UI Layer:**
```bash
npm install tailwindcss @tailwindcss/vite
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react
npm install cmdk
npm install recharts
npm install @fullcalendar/core @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction
```

**Dev Tools:**
```bash
npm install -D @biomejs/biome
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @sentry/react @sentry/vite-plugin
npm install -D supabase
```

### 0.3 — Initialize Supporting Tools

```bash
npx supabase init          # Creates supabase/ directory
npx @biomejs/biome init    # Creates biome.json
npx shadcn@latest init     # Initializes shadcn/ui with Tailwind v4
```

### 0.4 — Project Configuration Files

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/react-router-vite-plugin'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    TanStackRouterVite({ routesDirectory: './src/routes', generatedRouteTree: './src/routeTree.gen.ts' }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: { sourcemap: true },
})
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": false,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] },
    "outDir": "dist",
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

**biome.json:**
```json
{
  "organizeImports": { "enabled": true },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 120 }
}
```

### 0.5 — GitHub Setup

```bash
git init
git remote add origin https://github.com/vanrock-holdings/tekton.git
git checkout -b main
git add .
git commit -m "chore: initial Vite + React 19 + TypeScript scaffold"
git push -u origin main
git checkout -b dev
git push -u origin dev
```

### 0.6 — Vercel Setup

1. Go to vercel.com/new, import `vanrock-holdings/tekton`
2. Framework preset: **Vite**
3. Environment variables:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your anon key |
| `VITE_SENTRY_DSN` | Your Sentry DSN |

4. Production branch: `main`
5. Preview branches: `dev`, `feat/*`

### 0.7 — Supabase Setup

1. Create project at supabase.com (or link existing)
2. Link locally: `npx supabase link --project-ref YOUR_PROJECT_REF`
3. Run the migration (Phase 1 below)
4. Generate types: `npx supabase gen types typescript --linked > src/types/database.ts`
5. Configure Auth: enable email/password, set redirect URLs to your Vercel domain
6. Configure Storage: create buckets for `documents`, `photos`, `avatars`

---

## File Structure (Final Target)

```
tekton/
├── src/
│   ├── main.tsx                          # Entry point
│   ├── App.tsx                           # Router provider + QueryClient
│   ├── routeTree.gen.ts                  # Auto-generated by TanStack Router
│   │
│   ├── routes/                           # TanStack Router file-based routes
│   │   ├── __root.tsx                    # Root layout: TopNav (10 modules) + Sidebar + RightPanel
│   │   ├── index.tsx                     # Redirect to /dashboard
│   │   ├── login.tsx                     # Auth page
│   │   │
│   │   ├── _authenticated.tsx            # Auth guard layout
│   │   ├── _authenticated/
│   │   │   ├── dashboard.tsx
│   │   │   │
│   │   │   ├── pipeline/
│   │   │   │   ├── index.tsx             # Opportunities list
│   │   │   │   └── $opportunityId/
│   │   │   │       ├── index.tsx         # Redirect to basic-info
│   │   │   │       ├── basic-info.tsx
│   │   │   │       ├── property-details.tsx
│   │   │   │       ├── parcels.tsx
│   │   │   │       ├── contacts.tsx
│   │   │   │       ├── deal-analyzer.tsx
│   │   │   │       ├── comps.tsx
│   │   │   │       ├── due-diligence.tsx
│   │   │   │       ├── underwriting.tsx
│   │   │   │       ├── offer-contract.tsx
│   │   │   │       └── documents.tsx
│   │   │   │
│   │   │   ├── projects/
│   │   │   │   ├── index.tsx             # Projects list (card grid)
│   │   │   │   └── $projectId/
│   │   │   │       ├── index.tsx         # Redirect to basic-info
│   │   │   │       ├── basic-info.tsx
│   │   │   │       ├── property-details.tsx
│   │   │   │       ├── contacts.tsx
│   │   │   │       ├── timeline.tsx
│   │   │   │       ├── parcels.tsx
│   │   │   │       ├── due-diligence.tsx
│   │   │   │       ├── entitlements.tsx
│   │   │   │       ├── horizontal.tsx
│   │   │   │       ├── lot-inventory.tsx
│   │   │   │       ├── plans-pricing.tsx
│   │   │   │       ├── budget.tsx
│   │   │   │       ├── draws.tsx
│   │   │   │       ├── loans.tsx
│   │   │   │       ├── investors.tsx
│   │   │   │       ├── jobs-summary.tsx
│   │   │   │       ├── dispo-summary.tsx
│   │   │   │       ├── closeout.tsx
│   │   │   │       ├── files.tsx
│   │   │   │       └── insurance.tsx
│   │   │   │
│   │   │   ├── construction/
│   │   │   │   ├── index.tsx             # Jobs list
│   │   │   │   └── $jobId/
│   │   │   │       ├── index.tsx
│   │   │   │       ├── job-info.tsx
│   │   │   │       ├── budget.tsx
│   │   │   │       ├── schedule.tsx
│   │   │   │       ├── purchase-orders.tsx
│   │   │   │       ├── subcontracts.tsx
│   │   │   │       ├── change-orders.tsx
│   │   │   │       ├── inspections.tsx
│   │   │   │       ├── selections.tsx
│   │   │   │       ├── photos.tsx
│   │   │   │       ├── daily-logs.tsx
│   │   │   │       ├── punch-list.tsx
│   │   │   │       ├── warranty.tsx
│   │   │   │       ├── files.tsx
│   │   │   │       └── permits.tsx
│   │   │   │
│   │   │   ├── disposition/
│   │   │   │   ├── index.tsx             # Dispositions list
│   │   │   │   └── $dispositionId/
│   │   │   │       ├── index.tsx
│   │   │   │       ├── overview.tsx
│   │   │   │       ├── marketing.tsx
│   │   │   │       ├── showings.tsx
│   │   │   │       ├── offers.tsx
│   │   │   │       ├── buyer-info.tsx
│   │   │   │       ├── pricing-contract.tsx
│   │   │   │       ├── option-selections.tsx
│   │   │   │       ├── lender-financing.tsx
│   │   │   │       ├── closing-coordination.tsx
│   │   │   │       ├── settlement.tsx
│   │   │   │       ├── post-closing.tsx
│   │   │   │       ├── warranty.tsx
│   │   │   │       └── files.tsx
│   │   │   │
│   │   │   ├── accounting/
│   │   │   │   ├── index.tsx             # Register (default)
│   │   │   │   ├── register.tsx
│   │   │   │   ├── banking.tsx
│   │   │   │   ├── reconciliations/
│   │   │   │   │   ├── index.tsx         # Dashboard
│   │   │   │   │   ├── start.tsx
│   │   │   │   │   └── history.tsx
│   │   │   │   ├── aggregate-payments.tsx
│   │   │   │   ├── reports.tsx
│   │   │   │   ├── invoices.tsx
│   │   │   │   ├── chart-of-accounts.tsx
│   │   │   │   ├── journal-entries.tsx
│   │   │   │   ├── ap.tsx
│   │   │   │   ├── ar.tsx
│   │   │   │   ├── job-costing.tsx
│   │   │   │   └── period-close.tsx
│   │   │   │
│   │   │   ├── purchasing/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── estimates.tsx
│   │   │   │   ├── purchase-orders.tsx
│   │   │   │   ├── subcontracts.tsx
│   │   │   │   └── vendors.tsx
│   │   │   │
│   │   │   ├── contacts/
│   │   │   │   ├── index.tsx             # Companies list
│   │   │   │   ├── $companyId.tsx
│   │   │   │   ├── employees.tsx
│   │   │   │   └── customers.tsx
│   │   │   │
│   │   │   ├── investors/
│   │   │   │   ├── index.tsx             # Funds list
│   │   │   │   ├── $fundId.tsx
│   │   │   │   ├── capital-calls.tsx
│   │   │   │   └── distributions.tsx
│   │   │   │
│   │   │   ├── calendar/
│   │   │   │   └── index.tsx
│   │   │   │
│   │   │   ├── workflows/
│   │   │   │   ├── index.tsx             # Workflow templates list
│   │   │   │   ├── $workflowId.tsx       # Workflow detail: milestones + tasks
│   │   │   │   ├── transaction-types.tsx  # Transaction type configuration
│   │   │   │   ├── smart-actions.tsx      # Smart action rules
│   │   │   │   ├── assignment-groups.tsx  # Assignment group management
│   │   │   │   └── templates.tsx          # Order/project templates
│   │   │   │
│   │   │   ├── tools/
│   │   │   │   └── index.tsx             # Placeholder: "Coming Soon" page
│   │   │   │
│   │   │   └── admin/
│   │   │       ├── index.tsx             # Overview cards
│   │   │       ├── users.tsx
│   │   │       ├── permissions.tsx
│   │   │       ├── entities.tsx
│   │   │       ├── bank-accounts.tsx
│   │   │       ├── documents.tsx
│   │   │       ├── floor-plans.tsx
│   │   │       ├── cost-codes.tsx
│   │   │       ├── fee-schedule.tsx
│   │   │       ├── integrations.tsx
│   │   │       └── audit-log.tsx
│   │
│   ├── components/
│   │   ├── ui/                           # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── tooltip.tsx
│   │   │   └── command.tsx               # cmdk wrapper
│   │   │
│   │   ├── layout/
│   │   │   ├── TopNav.tsx                # #112233 nav bar with 10 module links
│   │   │   │                             # Pipeline | Projects | Construction | Disposition | Accounting
│   │   │   │                             # Contacts | Workflows | Calendar | Tools | Admin
│   │   │   ├── AppShell.tsx              # TopNav + Sidebar + Main + RightPanel
│   │   │   ├── IndexSidebar.tsx          # Status filters + count badges + metrics
│   │   │   ├── DetailSidebar.tsx         # Back link + identity + section nav
│   │   │   ├── RightPanel.tsx            # Tasks / Notes / Activity tabs
│   │   │   ├── PageContainer.tsx         # Breadcrumb + title + save indicator + content
│   │   │   └── CommandPalette.tsx        # ⌘K global search
│   │   │
│   │   ├── forms/
│   │   │   ├── AutoSaveField.tsx         # Core wrapper: input + 800ms debounce + status
│   │   │   ├── AutoSaveForm.tsx          # RHF form with auto-save on each field
│   │   │   ├── CurrencyInput.tsx         # Dollar formatting
│   │   │   ├── PercentageInput.tsx       # Percentage formatting
│   │   │   ├── DateInput.tsx             # Date picker
│   │   │   ├── PhoneInput.tsx            # Phone formatting
│   │   │   ├── AddressInput.tsx          # Street/City/State/Zip group
│   │   │   ├── EntitySelect.tsx          # Entity picker dropdown
│   │   │   ├── ProjectSelect.tsx         # Project picker
│   │   │   ├── JobSelect.tsx             # Job picker
│   │   │   ├── LotSelect.tsx             # Lot picker
│   │   │   ├── FloorPlanSelect.tsx       # Floor plan picker
│   │   │   ├── ContactSelect.tsx         # Contact/company picker
│   │   │   ├── StatusSelect.tsx          # Status dropdown with colored badges
│   │   │   ├── FileUpload.tsx            # Supabase Storage upload
│   │   │   └── RichTextEditor.tsx        # Basic rich text (descriptions)
│   │   │
│   │   ├── tables/
│   │   │   ├── DataTable.tsx             # TanStack Table v8 wrapper
│   │   │   ├── DataTablePagination.tsx
│   │   │   ├── DataTableColumnHeader.tsx # Sortable headers
│   │   │   ├── DataTableToolbar.tsx      # Search + filters + view toggle
│   │   │   └── DataTableRowActions.tsx   # Row action menu
│   │   │
│   │   ├── charts/
│   │   │   ├── BudgetChart.tsx           # Budget vs actual bar chart
│   │   │   ├── PipelineChart.tsx         # Pipeline funnel
│   │   │   ├── ScheduleChart.tsx         # Gantt-style milestone view
│   │   │   └── KpiCard.tsx              # Metric card with label/value/sub
│   │   │
│   │   └── shared/
│   │       ├── StatusBadge.tsx           # Color-coded status badges
│   │       ├── SaveIndicator.tsx         # Saving.../Saved/Error dot
│   │       ├── EmptyState.tsx            # Empty table/section placeholder
│   │       ├── LoadingState.tsx          # Skeleton loaders
│   │       ├── ConfirmDialog.tsx         # Destructive action confirmation
│   │       └── Breadcrumb.tsx
│   │
│   ├── hooks/
│   │   ├── useAutoSave.ts               # 800ms debounce save with status
│   │   ├── useSupabaseQuery.ts           # TanStack Query + Supabase helper
│   │   ├── useSupabaseMutation.ts        # Mutation + optimistic update helper
│   │   ├── useAuth.ts                    # Auth state + session
│   │   ├── useRealtime.ts               # Supabase realtime subscription
│   │   ├── useSidebarConfig.ts           # Returns sidebar config for current route
│   │   ├── useEntityContext.ts           # Active entity from store
│   │   ├── useDebounce.ts               # Generic debounce
│   │   └── usePrefetch.ts               # Prefetch on hover for links
│   │
│   ├── stores/
│   │   ├── authStore.ts                  # User session, profile
│   │   ├── uiStore.ts                    # Right panel open, sidebar collapsed
│   │   ├── entityStore.ts                # Active entity for accounting scope
│   │   ├── filterStore.ts                # Active sidebar filter per module
│   │   └── sidebarStore.ts              # Sidebar navigation state
│   │
│   ├── lib/
│   │   ├── supabase.ts                   # Supabase client singleton
│   │   ├── queryClient.ts                # TanStack Query client config
│   │   ├── utils.ts                      # cn(), formatCurrency(), formatDate()
│   │   ├── constants.ts                  # Status enums, fee defaults, cost codes
│   │   ├── deal-engine.ts                # Deal analyzer calculation engine
│   │   └── validators.ts                 # Shared Zod schemas
│   │
│   ├── types/
│   │   ├── database.ts                   # Auto-generated: npx supabase gen types
│   │   ├── forms.ts                      # Form value types (subset of DB types)
│   │   └── enums.ts                      # Status enums, type unions
│   │
│   └── styles/
│       ├── globals.css                   # Tailwind base + design tokens
│       └── tokens.css                    # CSS custom properties
│
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 00001_entities_users.sql
│   │   ├── 00002_opportunities_parcels.sql
│   │   ├── 00003_projects_lots.sql
│   │   ├── 00004_jobs_construction.sql
│   │   ├── 00005_dispositions_sales.sql
│   │   ├── 00006_accounting.sql
│   │   ├── 00007_contacts_documents.sql
│   │   ├── 00008_tasks_notes_audit.sql
│   │   ├── 00009_funds_investors.sql
│   │   ├── 00010_workflows.sql
│   │   ├── 00011_rls_policies.sql
│   │   ├── 00012_triggers.sql
│   │   └── 00013_seed_data.sql
│   │
│   └── functions/
│       ├── deal-analyze/index.ts         # AI-powered deal analysis
│       └── generate-memo/index.ts        # Underwriting memo generation
│
├── public/
│   └── tekton-logo.svg
│
├── .env.example
├── .gitignore
├── biome.json
├── vercel.json
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Build Phases: The Sprint Plan

### PHASE 1 — Foundation (Sprint 1)
**Goal:** Working shell deployed to Vercel with auth, navigation, and design system.

**Database migrations to run:**
```
00001_entities_users.sql
00013_seed_data.sql (entities + floor_plans + test user)
```

**Files to build:**

1. `src/lib/supabase.ts` — Supabase client with PKCE auth
2. `src/lib/queryClient.ts` — TanStack Query client with defaults (staleTime: 30s, gcTime: 5min)
3. `src/lib/utils.ts` — `cn()`, `formatCurrency()`, `formatDate()`, `formatPercent()`
4. `src/lib/constants.ts` — All status enums, fee defaults, color tokens
5. `src/stores/authStore.ts` — Zustand: user, session, isLoading
6. `src/stores/uiStore.ts` — Zustand: rightPanelOpen, sidebarCollapsed, activeModule
7. `src/stores/entityStore.ts` — Zustand: activeEntity, setActiveEntity
8. `src/styles/globals.css` — Tailwind imports + CSS custom properties (the full color system)
9. `src/routes/__root.tsx` — Root layout: TopNav + content area
10. `src/routes/login.tsx` — Auth page (email/password)
11. `src/routes/_authenticated.tsx` — Auth guard layout (redirects to /login if no session)
12. `src/components/layout/TopNav.tsx` — #112233 nav bar, 10 module links (Pipeline, Projects, Construction, Disposition, Accounting, Contacts, Workflows, Calendar, Tools, Admin), search trigger, notifications, avatar. Tools is a placeholder (disabled/coming soon state) to be built out later.
13. `src/components/layout/AppShell.tsx` — The 3-column layout: sidebar + main + right panel
14. `src/components/layout/IndexSidebar.tsx` — Generic: title, filter items with counts, metrics footer
15. `src/components/layout/DetailSidebar.tsx` — Generic: back link, identity block, section groups
16. `src/components/layout/RightPanel.tsx` — Tasks/Notes/Activity tabs, collapsible
17. `src/components/layout/PageContainer.tsx` — Breadcrumb + title + save indicator + scroll area
18. `src/components/layout/CommandPalette.tsx` — cmdk wrapper, searches all record types
19. `src/components/shared/StatusBadge.tsx` — Color-coded by status string
20. `src/components/shared/SaveIndicator.tsx` — Dot + "Saving..." / "Saved" / "Error"
21. `src/components/shared/KpiCard.tsx` — Label/value/sub with optional accent border
22. `src/components/shared/EmptyState.tsx` — Icon + message + action button
23. `src/components/shared/LoadingState.tsx` — Skeleton loaders
24. `src/hooks/useAutoSave.ts` — 800ms debounce, returns status
25. `src/hooks/useDebounce.ts` — Generic debounce hook
26. `src/hooks/useAuth.ts` — Supabase auth session hook
27. `src/hooks/usePrefetch.ts` — Prefetch query on mouse enter

**shadcn components to add:**
```bash
npx shadcn@latest add button input select badge card dialog dropdown-menu popover separator sheet skeleton tabs tooltip command scroll-area
```

**Acceptance:** App loads at Vercel URL, shows login page, authenticates via Supabase, shows TopNav with all 10 modules (Pipeline, Projects, Construction, Disposition, Accounting, Contacts, Workflows, Calendar, Tools, Admin), shows empty dashboard with correct color system. Tools link shows a "Coming Soon" placeholder page.

---

### PHASE 2 — Dashboard + Pipeline (Sprint 2)
**Goal:** Dashboard with live KPIs, Pipeline module with full CRUD.

**Database migrations:**
```
00002_opportunities_parcels.sql
00008_tasks_notes_audit.sql
```

**Files to build:**

1. `src/routes/_authenticated/dashboard.tsx` — 4 KPI cards + 4 data tables (Projects, Jobs, Pipeline, Closings)
2. `src/routes/_authenticated/pipeline/index.tsx` — Opportunities list with IndexSidebar filters
3. `src/routes/_authenticated/pipeline/$opportunityId/` — All 10 sub-pages:
   - `basic-info.tsx` — Auto-save form: name, type, status, source, assigned, priority, probability
   - `property-details.tsx` — Address, acreage, zoning, utilities, scattered-lot fields, community-dev fields
   - `parcels.tsx` — DataTable: multi-parcel assemblage with inline add/edit
   - `contacts.tsx` — Linked contacts table
   - `deal-analyzer.tsx` — **The calculation engine**: inputs → fixed costs → computed outputs → verdict
   - `comps.tsx` — Comparable sales table
   - `due-diligence.tsx` — 20-item checklist with status, vendor, dates, cost, document
   - `underwriting.tsx` — Deal structure, returns, risk assessment
   - `offer-contract.tsx` — Offer details, counter-offers nested table, multi-parcel contracts
   - `documents.tsx` — File upload + document list
4. `src/lib/deal-engine.ts` — The full deal analyzer calculation:
   - Inputs: purchase_price, site_work, floor_plan (base cost from DB), upgrade_package, ASP, concessions, duration, rate
   - Fixed costs: builder_fee ($15K), warranty ($5K), builders_risk ($1.5K), PO_fee ($3K), PM_fee ($3.5K), utility ($1.4K), contingency (capped $10K)
   - Outputs: total_project_cost, loan_amount, equity, interest, gross/net revenue, profit, margins, ROI, annualized_ROI, verdict
5. `src/components/forms/AutoSaveField.tsx` — The core auto-save input wrapper
6. `src/components/forms/AutoSaveForm.tsx` — RHF form that auto-saves each field independently
7. `src/components/forms/CurrencyInput.tsx` — Dollar formatting with auto-save
8. `src/components/forms/StatusSelect.tsx` — Dropdown with colored badge preview
9. `src/components/tables/DataTable.tsx` — TanStack Table v8 wrapper with sort, filter, pagination
10. `src/components/tables/DataTablePagination.tsx`
11. `src/components/tables/DataTableColumnHeader.tsx`
12. `src/components/tables/DataTableToolbar.tsx`
13. `src/hooks/useSupabaseQuery.ts` — `useQuery` wrapper that takes a Supabase query builder
14. `src/hooks/useSupabaseMutation.ts` — `useMutation` wrapper with optimistic updates + cache invalidation

**Acceptance:** Dashboard shows live data from Supabase. Pipeline index shows all opportunities with working sidebar filters and count badges. Can create a new opportunity, fill out all fields with auto-save, run the deal analyzer, manage due diligence checklist, and convert to project.

---

### PHASE 3 — Projects (Sprint 3)
**Goal:** The Hub. Projects module with all sub-pages, connected to Pipeline.

**Database migrations:**
```
00003_projects_lots.sql (projects, lots, lot_takedowns, floor_plans)
```

**Files to build:**

1. `src/routes/_authenticated/projects/index.tsx` — Card grid with IndexSidebar filters
2. `src/routes/_authenticated/projects/$projectId/` — All 18 sub-pages:
   - `basic-info.tsx` — Identity form + Summary Financials Card (always visible)
   - `property-details.tsx` — Address, zoning, setbacks, utility statuses, conditional fields by type
   - `contacts.tsx` — Linked contacts
   - `timeline.tsx` — Editable milestones + horizontal visual timeline
   - `parcels.tsx` — Parcels table (raw land) + Lot Takedowns sub-table (lot purchase)
   - `due-diligence.tsx` — Shared checklist component (same as pipeline)
   - `entitlements.tsx` — Zoning, plat status, permits, approvals
   - `horizontal.tsx` — Horizontal development scope, line items, draw tracking
   - `lot-inventory.tsx` — Lots table with status workflow, assign floor plan, link to job
   - `plans-pricing.tsx` — Floor plan mix, pricing matrix, options catalog
   - `budget.tsx` — Owner-level budget breakdown with categories, progress bars, variance
   - `draws.tsx` — Draw request table: request #, amount, status, bank, date
   - `loans.tsx` — Loan details: lender, amount, rate, maturity, balance, draw schedule
   - `investors.tsx` — Entity/fund link, capital stack, waterfall, distributions
   - `jobs-summary.tsx` — Read-only rollup of all CM jobs (click → navigate to CM)
   - `dispo-summary.tsx` — Read-only rollup of all dispositions (click → navigate to Dispo)
   - `closeout.tsx` — Project closeout checklist
   - `files.tsx` — Documents + Insurance sub-tabs
3. `src/components/forms/EntitySelect.tsx`
4. `src/components/forms/ProjectSelect.tsx`
5. `src/components/forms/LotSelect.tsx`
6. `src/components/forms/FloorPlanSelect.tsx`
7. `src/components/charts/BudgetChart.tsx` — Recharts budget vs actual bars
8. `src/hooks/useRealtime.ts` — Supabase realtime subscription for live updates

**Key business logic:**
- "Convert to Project" action from Pipeline creates project, migrates parcels, applies workflow template
- Lot status workflow: Future → Available → Reserved → Assigned → Under_Construction → Completed → Listed → Under_Contract → Closed
- Project summary financials denormalized from Jobs and Dispositions (updated via triggers or query-time aggregation)
- Multi-parcel support: community devs have multiple parcels from multiple sellers
- Lot takedowns: schedules with tranches, auto-create lots on tranche close

**Acceptance:** Can navigate from Dashboard → Projects, see card grid with live financials, drill into any project, see all 18 sub-pages with correct data from Supabase, auto-save works on all fields, lot inventory reflects correct statuses, budget breakdown shows variance.

---

### PHASE 4 — Construction Management (Sprint 4)
**Goal:** Builder perspective. Jobs with full lifecycle from Pre-Con to Warranty.

**Database migrations:**
```
00004_jobs_construction.sql (jobs, purchase_orders, change_orders, inspections, punch_list_items, warranty_claims, daily_logs, selections, permits)
```

**Files to build:**

1. `src/routes/_authenticated/construction/index.tsx` — Jobs list with status groups
2. `src/routes/_authenticated/construction/$jobId/` — All 14 sub-pages:
   - `job-info.tsx` — Job identity, project/lot links, fee structure, status, dates
   - `budget.tsx` — Job-level budget by cost code: budgeted, committed (POs+subs), actual, variance
   - `schedule.tsx` — 10 milestones / 45-65 tasks: Pre-Con → Permitting → Foundation → Framing → Rough-Ins → Insulation & Drywall → Interior Finishes → Exterior → Final Inspections & CO → Warranty. Start/Complete/Block actions.
   - `purchase-orders.tsx` — PO table with CRUD, approval workflow, lien waiver tracking
   - `subcontracts.tsx` — Subcontract table, scope, amounts, compliance docs
   - `change-orders.tsx` — CO table: reason category, cost/schedule impact, approval
   - `inspections.tsx` — Inspection table: type, result (pass/fail/conditional), re-inspection
   - `selections.tsx` — Option selections by category: standard vs upgrade, price impact
   - `photos.tsx` — Photo gallery with Supabase Storage, date/category tags
   - `daily-logs.tsx` — Daily log entries: date, weather, crew, work performed, notes
   - `punch-list.tsx` — Punch items: location, description, trade, assigned vendor, status
   - `warranty.tsx` — Warranty claims: category, urgency, vendor, cost responsibility
   - `files.tsx` — Documents
   - `permits.tsx` — Permit records: type, number, dates, status

**Key business logic:**
- Every Job MUST have project_id + lot_id (enforced at DB and UI level)
- Job status → CO triggers: lot.status = 'Completed', prompt to create Disposition
- PO approval workflow: Draft → Submitted → Approved → In_Progress → Complete → Invoiced → Paid
- Budget tracking: budget = estimate, committed = sum(POs + subs), actual = sum(invoiced/paid), variance = budget - actual
- Cost codes: standardized taxonomy across all jobs for ML-ready data
- Schedule: each milestone has planned/actual dates, overdue flagging

**Acceptance:** Can create a job from a project's lot inventory, fill out all fields, manage the 10-milestone schedule, create POs and change orders, track inspections, manage punch list, status change to CO auto-updates lot.

---

### PHASE 5 — Disposition (Sprint 5)
**Goal:** Sales perspective. Full lifecycle from Lead to Closed with settlement.

**Database migrations:**
```
00005_dispositions_sales.sql (dispositions, disposition_options, showings, offers, listing_contracts, listing_settlements, listing_costs)
```

**Files to build:**

1. `src/routes/_authenticated/disposition/index.tsx` — Dispositions list with pipeline sidebar
2. `src/routes/_authenticated/disposition/$dispositionId/` — All 13 sub-pages:
   - `overview.tsx` — Identity, status, links to project/lot/job
   - `marketing.tsx` — Description, photos, virtual tour, syndication
   - `showings.tsx` — Showing records: date, agent, feedback, rating
   - `offers.tsx` — Offer table: amount, financing, concessions, net-to-seller (computed), status
   - `buyer-info.tsx` — Buyer details, agent, pre-approval
   - `pricing-contract.tsx` — Base price + lot premium + options + incentives = contract price, EMD, dates
   - `option-selections.tsx` — Category/option/standard/upgrade/price, rollup to pricing
   - `lender-financing.tsx` — Loan details, appraisal tracking, clear-to-close
   - `closing-coordination.tsx` — 12-step Qualia-style closing timeline + checklist
   - `settlement.tsx` — Full settlement statement: gross - credits - concessions - commissions - costs - payoff = net proceeds
   - `post-closing.tsx` — Warranty dates, 30-day walk, 11-month walk, satisfaction
   - `warranty.tsx` — Warranty claims (shared component with CM)
   - `files.tsx` — Documents

**Key business logic:**
- Every Disposition MUST have project_id + lot_id. job_id is optional (lot sales have no job).
- Net proceeds flows back to Project financials and investor waterfall
- Closing timeline: 12 steps matching Qualia pattern
- Settlement statement: computed fields for commissions (buyer agent rate × price), total closing costs, net proceeds
- Status workflow: Lead → Reserved → Under_Contract → Option_Selections → Builder_Walk → Closing_Scheduled → Closed
- When status = Closed: record revenue in accounting, update project financials, activate warranty

**Acceptance:** Can create disposition from CM (post-CO prompt), manage the full sales pipeline, track showings and offers, compute settlement statement, close and see net proceeds flow to project summary.

---

### PHASE 6 — Accounting (Sprint 6)
**Goal:** Real double-entry accounting with bank reconciliation. The hardest module.

**Database migrations:**
```
00006_accounting.sql (chart_of_accounts, journal_entries, journal_entry_lines, bank_accounts, bank_transactions, invoices, invoice_line_items)
```

**Files to build:**

1. `src/routes/_authenticated/accounting/` — All sub-pages:
   - `register.tsx` — Transaction register (Qualia-style): date, ref, description, debit, credit, balance
   - `banking.tsx` — Bank accounts list, import transactions
   - `reconciliations/index.tsx` — Reconciliation dashboard: monthly status grid
   - `reconciliations/start.tsx` — Start new reconciliation wizard
   - `reconciliations/history.tsx` — Monthly table: status, dates, statement balance
   - `aggregate-payments.tsx` — Batch payment management
   - `reports.tsx` — Report gallery: Trial Balance, Aged AR/AP, P&L, Balance Sheet, Cash Flow
   - `invoices.tsx` — Invoice management: create, approve, pay
   - `chart-of-accounts.tsx` — COA management: builder COA (1000-6000)
   - `journal-entries.tsx` — JE creation with balanced debit/credit validation
   - `ap.tsx` — AP workflow: bills, approval queue, payments, vendor aging, 1099
   - `ar.tsx` — AR: draws, invoices, collections, aging
   - `job-costing.tsx` — Cost codes, budget vs actual, WIP, cost to complete, percent complete
   - `period-close.tsx` — Month-end/year-end checklists

2. `src/components/forms/EntitySelect.tsx` — Entity picker at top of accounting sidebar (determines scope)

**Key business logic:**
- Entity-scoped: every transaction belongs to an entity. Entity picker in sidebar determines what's visible.
- Double-entry: every journal entry must balance (sum(debits) = sum(credits))
- Bank reconciliation: Qualia-style wizard (statement balance + outstanding = book balance)
- Job costing: every expense coded to project + job + cost code
- Intercompany: builder fees from RCH to SPE, management fees, overhead allocation
- Period close: month-end checklist (12 steps from master prompt SOP 5)
- AP workflow: invoice → approval → payment → 1099 tracking
- AR: draw requests from SPE to lender, invoices from RCH to SPE

**Acceptance:** Can switch entities, see correct ledger per entity, create journal entries that balance, reconcile bank account (Qualia-style), run Trial Balance and P&L reports, track AP/AR aging.

---

### PHASE 7 — Purchasing + Contacts (Sprint 7)
**Goal:** Centralized purchasing and contact management.

**Database migrations:**
```
00007_contacts_documents.sql (companies, contacts, contact_assignments)
```

**Files to build:**

1. `src/routes/_authenticated/purchasing/` — All sub-pages:
   - `estimates.tsx` — Project/job estimates by cost code
   - `purchase-orders.tsx` — Cross-job PO view with approval queue
   - `subcontracts.tsx` — Cross-job subcontract view
   - `vendors.tsx` — Vendor directory with compliance tracking

2. `src/routes/_authenticated/contacts/` — Qualia-pattern:
   - `index.tsx` — Companies organized by type with expandable categories
   - `$companyId.tsx` — Company detail: info, contacts, W-9, insurance, projects linked
   - `employees.tsx` — Internal employee directory
   - `customers.tsx` — Buyer/customer directory

**Acceptance:** Can manage vendors with insurance/W-9 tracking, view POs across all jobs, manage company contacts with Qualia-style category navigation.

---

### PHASE 8 — Investors + Calendar (Sprint 8)
**Goal:** Fund management and calendar integration.

**Database migrations:**
```
00009_funds_investors.sql (funds, investments, capital_calls, capital_call_allocations, distributions, distribution_allocations)
```

**Files to build:**

1. `src/routes/_authenticated/investors/` — All sub-pages:
   - `index.tsx` — Funds list with summary metrics
   - `$fundId.tsx` — Fund detail: entity, type, vintage, committed/called/deployed, pref return, promote
   - `capital-calls.tsx` — Capital call management: call #, fund, amount, investor allocations
   - `distributions.tsx` — Distribution management: type, waterfall calculation, allocations

2. `src/routes/_authenticated/calendar/index.tsx` — FullCalendar integration:
   - Views: month, week, day
   - Event sources: project milestones, inspections, closings, construction schedule, capital calls
   - Color coding by category
   - Future: Microsoft Graph API two-way sync

**Acceptance:** Can create funds, track investors with commitments/calls/distributions, see waterfall calculations. Calendar shows all events across modules.

---

### PHASE 9 — Workflows + Admin + Tools Placeholder (Sprint 9)
**Goal:** Workflows as a top-level module (Qualia-style), admin panel, and Tools placeholder.

**Database migrations:**
```
00010_workflows.sql (workflow_templates, workflow_milestones, workflow_tasks, smart_actions, assignment_groups)
```

**Files to build:**

1. `src/routes/_authenticated/workflows/` — Top-level Workflows module (promoted from Admin):
   - `index.tsx` — Core Workflows list table: name, used_for (type badges), task_count, projects_using, last_modified. Filters by transaction type. Follows Qualia's workflow listing pattern.
   - `$workflowId.tsx` — Workflow detail: milestone sections (Order Opening, Title, Pre-Closing, Post-Closing) with task rows: task_name, assigned_when, assigned_to (role), completes_when, due_days, from_reference. Add Milestone + Save Changes buttons. This is one of the few pages with an explicit save button (per master prompt rules for workflow templates).
   - `transaction-types.tsx` — Transaction type configuration (maps to project types: Scattered Lot, Community Dev, Lot Dev, Lot Purchase)
   - `smart-actions.tsx` — Rule-based smart actions: trigger conditions → automated tasks
   - `assignment-groups.tsx` — Assignment group management: define role groups for task assignment
   - `templates.tsx` — Order/project templates: pre-configured workflow + field defaults

2. `src/routes/_authenticated/tools/index.tsx` — Placeholder page:
   - Shows "Tools — Coming Soon" with the Tekton design system
   - Card layout with placeholder items (future tools TBD)
   - Disabled state in TopNav (visible but grayed, navigable to the placeholder)

3. `src/routes/_authenticated/admin/` — All 11 sub-pages:
3. `src/routes/_authenticated/admin/` — All 10 sub-pages:
   - `index.tsx` — "Good Evening, Bryan" card grid
   - `users.tsx` — User management with role assignment
   - `permissions.tsx` — Permission groups (Qualia-style tab bar)
   - `entities.tsx` — Entity management: create SPEs, set parent entities
   - `bank-accounts.tsx` — Bank account setup per entity
   - `documents.tsx` — Document template management
   - `floor-plans.tsx` — Floor plan catalog: name, elevation, sqft, beds, baths, costs
   - `cost-codes.tsx` — Standardized cost code taxonomy
   - `fee-schedule.tsx` — Fixed per-house costs (builder fee, warranty, etc.)
   - `integrations.tsx` — Microsoft 365, DocuSeal, Bank Feeds config
   - `audit-log.tsx` — System-wide audit log viewer

**Acceptance:** Workflows module is fully functional as a top-level nav item — can create workflow templates with milestones and tasks (Qualia-style), configure transaction types and smart actions. Tools page shows a polished "Coming Soon" placeholder. Full admin panel functional. Can manage entities, users, permissions. Floor plans and cost codes are configurable.

---

### PHASE 10 — Polish + Integrations (Sprint 10)
**Goal:** Performance, integrations, and production readiness.

**Work items:**

1. **Performance:** Prefetch on hover for all links, virtual scrolling for tables >50 rows, lazy route loading, image optimization
2. **Realtime:** Supabase realtime subscriptions for live updates on dashboards and shared records
3. **Sentry:** Error boundary + performance monitoring
4. **Microsoft 365 (future-ready):** Edge function stubs for Graph API (calendar sync, email logging, SharePoint folders)
5. **DocuSeal (future-ready):** Edge function stubs for e-sign (POs, subcontracts, sales contracts)
6. **Bank feeds (future-ready):** Edge function stub for Plaid integration
7. **PWA:** Service worker for offline indicator + fast reload
8. **Testing:** Vitest unit tests for deal-engine, accounting validation, status workflows
9. **Documentation:** README, API patterns doc, onboarding guide
10. **Type generation:** CI step to regenerate `database.ts` on migration changes

---

## Claude Code Workflow

This is how to work with Claude Code on each phase.

### Starting a Phase

Give Claude Code this context at the start of each phase:

```
Read the file BUILDOUT-PLAN.md in the project root.
I'm working on Phase [N]. Build all the files listed for this phase.

Key rules:
1. Use TanStack Router file-based routing (routes/ directory)
2. All forms auto-save with 800ms debounce — no save buttons
3. Every Supabase query goes through TanStack Query (useQuery/useMutation)
4. UI state only in Zustand (rightPanel, sidebar, activeEntity)
5. All components use shadcn/ui + Tailwind
6. Follow the Qualia sidebar pattern exactly
7. Color system: primary #1B3022, navBg #112233, background #F1F5F9
8. Run `npx supabase gen types typescript --linked > src/types/database.ts` after any migration
```

### Migration Pattern

For each migration, Claude Code should:

```bash
# Create the migration file
npx supabase migration new descriptive_name

# Edit the generated file in supabase/migrations/

# Push to Supabase
npx supabase db push

# Regenerate types
npx supabase gen types typescript --linked > src/types/database.ts
```

### Component Pattern

Every page route should follow this pattern:

```typescript
// src/routes/_authenticated/pipeline/$opportunityId/basic-info.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PageContainer } from '@/components/layout/PageContainer'
import { AutoSaveField } from '@/components/forms/AutoSaveField'

export const Route = createFileRoute('/_authenticated/pipeline/$opportunityId/basic-info')({
  component: BasicInfo,
})

function BasicInfo() {
  const { opportunityId } = Route.useParams()
  const queryClient = useQueryClient()

  const { data: opp, isLoading } = useQuery({
    queryKey: ['opportunity', opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', opportunityId)
        .single()
      if (error) throw error
      return data
    },
  })

  const mutation = useMutation({
    mutationFn: async (updates: Partial<typeof opp>) => {
      const { error } = await supabase
        .from('opportunities')
        .update(updates)
        .eq('id', opportunityId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity', opportunityId] })
    },
  })

  if (isLoading) return <LoadingState />

  return (
    <PageContainer title="Basic Info" breadcrumb={['Pipeline', opp.opportunity_name, 'Basic Info']}>
      <Card title="Opportunity Identity">
        <AutoSaveField
          label="Opportunity Name"
          value={opp.opportunity_name}
          onSave={(value) => mutation.mutateAsync({ opportunity_name: value })}
        />
        {/* ... more fields */}
      </Card>
    </PageContainer>
  )
}
```

### Git Workflow for Each Phase

```bash
git checkout dev
git checkout -b feat/phase-N-description
# ... build all files for the phase ...
git add .
git commit -m "feat: Phase N — description"
git push origin feat/phase-N-description
# Verify Vercel preview deployment works
git checkout dev
git merge feat/phase-N-description
git push origin dev
# When stable:
git checkout main
git merge dev
git push origin main  # Auto-deploys to production
```

---

## Design System Tokens (CSS Custom Properties)

```css
/* src/styles/tokens.css */
:root {
  /* Primary - Deep forest green */
  --color-primary: #1B3022;
  --color-primary-hover: #264733;
  --color-primary-accent: #6B9E7A;
  --color-primary-100: #DDE6DF;
  --color-primary-50: #F1F5F4;

  /* Navigation */
  --color-nav-bg: #112233;
  --color-nav-muted: #94A3B8;
  --color-nav-active: #48BB78;

  /* Surfaces */
  --color-background: #F1F5F9;
  --color-card: #ffffff;
  --color-sidebar: #ffffff;

  /* Text */
  --color-foreground: #112233;
  --color-muted: #64748B;

  /* Borders */
  --color-border: #E2E8F0;

  /* Status */
  --color-success: #4A7A5B;
  --color-success-bg: #DDE6DF;
  --color-warning: #C4841D;
  --color-warning-bg: #F3E8D0;
  --color-info: #3B6FA0;
  --color-info-bg: #DBEAFE;
  --color-destructive: #B84040;
  --color-destructive-bg: #F0D4D4;

  /* Sidebar */
  --sidebar-width: 240px;
  --sidebar-active-border: #1B3022;
  --sidebar-active-bg: #F1F5F4;
  --sidebar-active-text: #1B3022;
  --sidebar-hover-bg: #F0FDF4;

  /* Right Panel */
  --right-panel-width: 260px;

  /* Layout */
  --topnav-height: 52px;
}
```

---

## Key Patterns Reference

### Auto-Save Hook

```typescript
// src/hooks/useAutoSave.ts
import { useState, useEffect, useRef } from 'react'
import { useDebounce } from './useDebounce'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useAutoSave<T>(
  value: T,
  saveFn: (value: T) => Promise<void>,
  delay = 800
) {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const debouncedValue = useDebounce(value, delay)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (debouncedValue === undefined) return

    setStatus('saving')
    saveFn(debouncedValue)
      .then(() => {
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 2000)
      })
      .catch(() => setStatus('error'))
  }, [debouncedValue, saveFn])

  return status
}
```

### Supabase Query Helper

```typescript
// src/hooks/useSupabaseQuery.ts
import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { PostgrestFilterBuilder } from '@supabase/postgrest-js'

export function useSupabaseQuery<T>(
  queryKey: string[],
  queryFn: () => PostgrestFilterBuilder<any, any, T[]>,
  options?: Omit<UseQueryOptions<T[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await queryFn()
      if (error) throw error
      return data as T[]
    },
    ...options,
  })
}
```

### Entity Store

```typescript
// src/stores/entityStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface EntityState {
  activeEntityId: string | null
  setActiveEntity: (id: string) => void
}

export const useEntityStore = create<EntityState>()(
  persist(
    (set) => ({
      activeEntityId: null,
      setActiveEntity: (id) => set({ activeEntityId: id }),
    }),
    { name: 'tekton-entity' }
  )
)
```

---

## Database Migration Order

Run these in sequence. Each depends on the previous.

| # | File | Tables | Phase |
|---|------|--------|-------|
| 1 | `00001_entities_users.sql` | entities, users | 1 |
| 2 | `00002_opportunities_parcels.sql` | opportunities, parcels, deal_analyses, due_diligence_items, comparable_sales | 2 |
| 3 | `00003_projects_lots.sql` | projects, lots, lot_takedowns, floor_plans | 3 |
| 4 | `00004_jobs_construction.sql` | jobs, purchase_orders, change_orders, inspections, selections, daily_logs, punch_list_items, warranty_claims, permits | 4 |
| 5 | `00005_dispositions_sales.sql` | dispositions, disposition_options, showings, offers, listing_contracts, listing_settlements, listing_costs | 5 |
| 6 | `00006_accounting.sql` | chart_of_accounts, journal_entries, journal_entry_lines, bank_accounts, bank_transactions, invoices, invoice_line_items | 6 |
| 7 | `00007_contacts_documents.sql` | companies, contacts, contact_assignments, documents | 7 |
| 8 | `00008_tasks_notes_audit.sql` | tasks, notes, audit_log | 2 |
| 9 | `00009_funds_investors.sql` | funds, investments, capital_calls, capital_call_allocations, distributions, distribution_allocations | 8 |
| 10 | `00010_workflows.sql` | workflow_templates, workflow_milestones, workflow_tasks, smart_actions, assignment_groups | 9 |
| 11 | `00011_rls_policies.sql` | RLS policies for all tables | 1 |
| 12 | `00012_triggers.sql` | updated_at triggers, code generation, CO→lot trigger, takedown→lots trigger | 1 |
| 13 | `00013_seed_data.sql` | Entities, floor plans, cost codes, chart of accounts, test data | 1 |

---

## Total Estimated Timeline

| Phase | Sprint |
|-------|--------|
| 0. Infrastructure | Sprint 0 |
| 1. Foundation | Sprint 1 |
| 2. Dashboard + Pipeline | Sprint 2 |
| 3. Projects (Hub) | Sprint 3 |
| 4. Construction Mgmt | Sprint 4 |
| 5. Disposition | Sprint 5 |
| 6. Accounting | Sprint 6 |
| 7. Purchasing + Contacts | Sprint 7 |
| 8. Investors + Calendar | Sprint 8 |
| 9. Workflows + Admin + Tools | Sprint 9 |
| 10. Polish + Integrations | Sprint 10 |

11 sprints with Claude Code as the primary builder. Move as fast as each phase is stable before starting the next.

With Claude Code running full speed and you reviewing/testing each phase before moving on, this is realistic. The accounting module (Phase 6) is the bottleneck — double-entry with reconciliation is genuinely complex. Everything else is well-defined CRUD with domain-specific business logic.

---

*This is Tekton. Build it right. Build it once.*

# KOVA Sprint 1B — Home Dashboard + Module Index Dashboards

## Context
Sprint 1A deployed the workflow engine (workflow_templates, workflow_instances, task_instances tables + Edge Function + Admin UI). Now we make it visible. The team needs to open KOVA on March 2 and immediately see: what do I need to do today, what's overdue, and how is the portfolio performing.

## Dependencies
- Sprint 1A complete (workflow engine tables exist, seed templates loaded, Edge Function deployed)
- Existing module tables: opportunities, projects, jobs, dispositions, lots, task_instances

## What to Build

### 1. Home Dashboard Redesign

Location: `src/routes/_authenticated/index.tsx` (or `dashboard.tsx` — wherever the Home/landing page route is)

Replace the current basic landing page with a 3-zone operations command center:

**Zone 1: Portfolio KPI Strip** (top, full width, 6 metric cards in a row)
- Active Projects (count from projects where status = 'active')
- Homes Under Construction (count from jobs where status IN ('pre_construction', 'in_progress'))
- Closings This Month (count from dispositions where close_date is current month)
- Pipeline Value (sum of estimated_value from opportunities where status NOT IN ('archived', 'dead'))
- Overdue Tasks (count from task_instances where is_overdue = true AND assigned_to = current user)
- On Schedule % (count of jobs where current milestone is on or ahead of planned date / total active jobs)

Each card: white background, subtle border (#E2E8F0), metric value large (text-3xl, #112233), label below (text-sm, text-gray-500). Overdue Tasks card gets red text if > 0. On Schedule gets green if > 90%, yellow if 70-90%, red if < 70%.

**Zone 2: My Tasks** (left 2/3 of remaining space)
A DataTable showing all task_instances assigned to the current user, sorted by urgency:
- Column order: Status (color dot), Task Name, Project (linked), Phase, Due Date, Overdue By (days, red if > 0)
- Default sort: overdue items first (sorted by most overdue), then active items by due date ascending, then pending
- Status filter chips above table: All, Overdue (red badge with count), Due Today, Due This Week, Completed
- Clicking a task row expands inline to show: description, notes field (auto-save), "Mark Complete" button, link to the parent record
- "Mark Complete" button updates task_instances.status = 'completed', task_instances.completed_at = now(), task_instances.completed_by = current user. Then check: if this was a gate task, find downstream blocked tasks in the same workflow instance and set them to 'active'.

**Zone 3: Alerts & Activity** (right 1/3)
A stacked card layout showing:
- **Overdue Alerts**: task_instances where is_overdue = true across ALL users (not just current user), grouped by project. Show: task name, assigned user name, days overdue, project name. Red left border on each card.
- **Recent Activity**: last 20 task_instances that were completed, showing: task name, completed by, completed at (relative time), project name. Green left border.
- **Upcoming Deadlines**: task_instances due in next 3 days, showing: task name, assigned to, due date, project name. Yellow left border.

### 2. Module Index Page Dashboards

Redesign the index/landing page for each of these 4 modules. Same 3-zone pattern: KPI strip → status filter pills → record table.

**Pipeline (Opportunities) Index** — `src/routes/_authenticated/pipeline/index.tsx`
- KPI strip (4 cards): Total Opportunities, Active Analyses, Pending Offers, Win Rate (completed with won status / total completed, as percentage)
- Status pills: New, Screening, Analysis, DD, Under Contract, Won, Dead/Archived — each with count badge
- DataTable columns: Address, Municipality, Price, Project Type, Status (badge), Days in Stage, Assigned To, Last Updated

**Projects Index** — `src/routes/_authenticated/projects/index.tsx`
- KPI strip (4 cards): Active Projects, Total Lots, Under Construction (job count), Pending Sale (disposition count where status != 'closed')
- Status pills: Pre-Development, Active, Selling Out, Completed, On Hold — each with count badge
- DataTable columns: Project Name, Type (SL/CD/LP/LD badge), Municipality, Lots (X/Y format: sold/total), Active Jobs, Status (badge), Entity

**Construction (Jobs) Index** — `src/routes/_authenticated/construction/index.tsx`
- KPI strip (4 cards): Active Jobs, On Schedule (count), Behind Schedule (count), Avg Days to CO (from completed jobs)
- Status pills: Pre-Construction, In Progress, Punch, CO Received, Completed — each with count badge
- DataTable columns: Job Code, Project (linked), Lot, Floor Plan, Status (badge), Current Phase, Days Since Start, PM, Budget Variance ($)

**Disposition Index** — `src/routes/_authenticated/disposition/index.tsx`
- KPI strip (4 cards): Active Listings, Under Contract, Closings This Month, Avg DOM (days on market)
- Status pills: Listing Prep, Active, Under Contract, Closing Scheduled, Closed — each with count badge
- DataTable columns: Address, Project (linked), Lot, List Price, Contract Price, Status (badge), Buyer, Close Date, Days on Market

### 3. Detail Sidebar Consolidation

For each module's detail/record page, update the left sidebar to show dynamic, prepopulated lists of linked records with status.

**Project Detail Sidebar** — under existing sections, add:
```
——— LOTS ———
  LOT-001  Available
  LOT-002  Under Construction ●
  LOT-003  Sold ✓
  LOT-004  Available
  (clickable → navigates to lot detail or filters main content)

——— JOBS ———
  JOB-2024-001  Framing ●
  JOB-2024-002  Pre-Con
  (clickable → navigates to job detail)

——— DISPOSITIONS ———
  221 Main St  Under Contract
  223 Main St  Listing Prep
  (clickable → navigates to disposition detail)

——— TASKS ———
  3 overdue · 5 active · 12 total
  (clickable → scrolls to tasks section or opens task panel)
```

Each item: compact single line, name on left, status badge on right. Status badges use the standard color system (green = complete/on-track, yellow = in-progress, red = overdue/behind). Lots sorted by lot number. Jobs sorted by status priority. Dispositions sorted by close date.

**Job Detail Sidebar** — add:
```
——— TASKS ———
  12/25 complete (48%)
  ▓▓▓▓▓▓▓▓▓░░░░░░░░░  48%
  Next: Rough Inspection (due Mar 5)

——— PURCHASE ORDERS ———
  PO-001  Framing  $24,500  Approved
  PO-002  Plumbing  $8,200  Draft
```

**Disposition Detail Sidebar** — add:
```
——— TASKS ———
  4/10 complete (40%)
  Next: Schedule Closing (due Mar 8)
```

### 4. Shared Components

**KPICard.tsx** (`src/components/dashboard/KPICard.tsx`)
- Props: label (string), value (string|number), trend? (up/down/neutral), trendValue? (string), status? (success/warning/danger)
- White card, metric large, label small below, optional colored trend indicator

**StatusPills.tsx** (`src/components/filters/StatusPills.tsx`)
- Props: statuses (array of {label, value, count}), activeStatus, onStatusChange
- Horizontal row of pill-shaped buttons. Active pill gets #1B3022 background, white text. Inactive pills get gray background. Count badges inside each pill.

**TaskListPanel.tsx** (`src/components/tasks/TaskListPanel.tsx`)
- Props: tasks (task_instances array), onComplete, onExpand
- Reusable task list used in dashboard Zone 2 and sidebar task sections
- Each task row: status dot, name, due date, complete button

**SidebarRecordList.tsx** (`src/components/sidebar/SidebarRecordList.tsx`)
- Props: items (array of {id, label, status, statusColor, href}), title
- Compact list under uppercase divider label, each item clickable with status badge

### 5. Data Hooks

```
src/hooks/
├── useDashboardKPIs.ts        — aggregates counts across modules for home dashboard
├── useMyTasks.ts              — task_instances for current user with filters
├── useModuleKPIs.ts           — per-module KPI calculations (takes module name, returns metrics)
├── useSidebarRecords.ts       — linked records for detail sidebar (takes record type + id)
└── useTaskActions.ts          — complete task, add note, check gate status
```

All hooks use TanStack Query with appropriate cache keys and stale times.

## Design Rules
- KOVA design system: #1B3022 primary, #112233 text, #F1F5F9 page background, white cards with #E2E8F0 borders
- No icons anywhere — text labels, color, and typography create hierarchy
- Status badges: small rounded pills with colored background. Use the standard set: green (#10B981), yellow (#F59E0B), blue (#3B82F6), red (#EF4444), gray (#94A3B8)
- KPI cards are NOT clickable — they're information display only
- Status pills ARE clickable — they filter the table below
- Auto-save on task notes with 800ms debounce
- "Mark Complete" on tasks is a button click (not auto-save) since it's a deliberate action

## Acceptance Criteria
1. Home dashboard loads with real data from database (KPIs, My Tasks, Alerts)
2. Completing a task updates the database and refreshes the task list
3. Completing a gate task unblocks downstream tasks (status changes from 'blocked' to 'active')
4. Pipeline, Projects, Construction, Disposition index pages show KPI strips and filterable tables
5. Project detail sidebar shows linked lots, jobs, dispositions, and tasks with live status badges
6. Job detail sidebar shows task progress bar and PO list
7. Status pills filter the DataTable correctly with accurate count badges

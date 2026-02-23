# KOVA — MATTERS MODULE SPECIFICATION
## Commit to: `kova/docs/matters-module-spec.md`
<!-- NOTE: If your git repository path still uses "tekton", update the repo path accordingly -->

This spec defines the Matters module for KOVA. To build it, read this entire file, then execute Phases 1-6 in order, running `npm run build` after each phase to verify zero TypeScript errors before continuing.

---

## KOVA CONTEXT

**KOVA** is a full-lifecycle real estate development platform for Red Cedar Homes (RCH) and affiliated entities. RCH is a **for-sale residential builder only** — no rentals, no property management. The platform covers deal pipeline, project management, construction management, disposition (sales), accounting, purchasing, investor/fund management, contacts, calendar, workflows, and administration across the I-85 corridor from Charlotte to Greenville, SC.

**Entities:**
- VanRock Holdings LLC — Parent holding company
- Red Cedar Homes LLC — Builder/contractor (operating company)
- Carolina Affordable Housing Project Inc. — 501(c)(3) nonprofit
- SL Fund II — Related third-party fund (not owned by RCH)
- SPEs (Special Purpose Entities) — Created per project or fund

**Project Types (all for-sale):**
1. Scattered Lot — Acquire individual lots → Build → Sell
2. Community Development — Assemble land → Entitle → Horizontal infrastructure → Build → Sell
3. Lot Development — Develop finished lots → Sell to third-party builders
4. Lot Purchase — Buy finished lots in bulk (takedown tranches) → Build → Sell

---

## TECH STACK

| Layer | Technology |
|-------|-----------|
| Build | Vite 6 |
| Framework | React 19 + TypeScript 5.9 (strict) |
| Routing | TanStack Router (file-based, type-safe) |
| Server State | TanStack Query v5 |
| Client State | Zustand |
| Forms | React Hook Form + Zod v4 (auto-save 800ms debounce, NO save buttons) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Tables | TanStack Table v8 |
| Calendar | FullCalendar |
| Charts | Recharts + Tremor |
| Command | cmdk |
| E-Sign | DocuSeal |
| Linting | Biome |
| Testing | Vitest |
| Hosting | Vercel |
| Monitoring | Sentry |

**This is a Vite + React SPA. There is NO Next.js. Server-side logic runs through Supabase Edge Functions (Deno runtime), NOT API routes.**

---

## DESIGN SYSTEM

```css
:root {
  --primary: #1B3022; --primary-foreground: #ffffff;
  --primary-hover: #264733; --primary-accent: #6B9E7A;
  --secondary: #DDE6DF; --secondary-foreground: #1B3022;
  --background: #F1F5F9; --card: #ffffff;
  --foreground: #112233; --muted: #F1F5F9; --muted-foreground: #64748B;
  --accent: #F1F5F4; --accent-foreground: #1B3022;
  --nav-bg: #112233; --nav-fg: #F1F5F9; --nav-muted: #94A3B8; --nav-active: #6B9E7A;
  --sidebar-bg: #ffffff; --sidebar-active-border: #1B3022; --sidebar-active-text: #1B3022; --sidebar-hover: #F1F5F4;
  --border: #E2E8F0; --ring: #1B3022;
  --success: #4A7A5B; --success-bg: #DDE6DF;
  --warning: #C4841D; --warning-bg: #F3E8D0;
  --info: #3B6FA0; --info-bg: #DBEAFE;
  --destructive: #B84040; --destructive-bg: #F0D4D4;
}
```

---

## NAVIGATION CONTEXT

Top nav (#112233) has: Pipeline, Projects, Construction, Disposition, Accounting, Contacts, Calendar, Admin. An **Operations** dropdown (shadcn DropdownMenu) contains: Deal Sheets, E-Sign Documents, RCH Contracts. **Matters becomes the 4th item in this dropdown.**

Sidebar follows the **Qualia pattern:**
- **Index pages:** status filters with count badges, aggregate metrics at bottom
- **Detail pages:** back link, record identity block (icon, name, code), grouped sections under UPPERCASE DIVIDER LABELS, active page gets #1B3022 green left border

---

## PROJECT STRUCTURE (relevant paths)

```
kova/
<!-- NOTE: If your git repository directory still uses "tekton", update accordingly -->
├── src/
│   ├── routes/_authenticated/
│   │   ├── operations/
│   │   │   ├── deal-sheets/
│   │   │   ├── esign/
│   │   │   ├── rch-contracts/
│   │   │   └── matters/           ← NEW MODULE
│   │   │       ├── index.tsx      ← list page
│   │   │       ├── new.tsx        ← conversational intake
│   │   │       └── $matterId.tsx  ← detail page
│   ├── components/
│   │   ├── ui/                    # shadcn/ui
│   │   ├── layout/                # TopNav, Sidebar, RightPanel
│   │   ├── forms/                 # AutoSaveField, etc.
│   │   ├── tables/                # DataTable wrapper
│   │   └── matters/               ← NEW COMPONENTS
│   ├── hooks/                     # useAutoSave, useSupabase, useAuth
│   ├── stores/                    # Zustand
│   ├── lib/                       # Supabase client, utils
│   │   └── queries/
│   │       └── matters.ts         ← NEW
│   └── types/
│       └── matters.ts             ← NEW
└── supabase/
    ├── migrations/
    │   └── XXX_create_matters.sql ← NEW
    └── functions/
        └── generate-matter/
            └── index.ts           ← NEW (Deno Edge Function)
```

**Existing tables (do NOT recreate):** projects, opportunities, contacts, entities, documents, auth.users

---

## WHAT THE MATTERS MODULE IS

A **catch-all workflow system** for anything outside the standard opportunity → project → construction → disposition pipeline. Examples: contract disputes, loan refinances, insurance claims, zoning appeals, partnership negotiations, vendor disputes, title issues, tax appeals.

A Matter is created through a **conversational AI intake** (chat or voice-to-text) that asks three questions, then Claude generates a structured record with a tailored workflow of milestones, tasks, and deliverables — all linked to existing KOVA records.

---

## PHASE 1 — DATABASE MIGRATION

Create `supabase/migrations/XXX_create_matters.sql` (next sequential number).

### matters

```sql
CREATE TABLE matters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','on_hold','resolved','closed','cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('critical','high','medium','low')),
  category TEXT NOT NULL
    CHECK (category IN (
      'contract_dispute','refinance','insurance_claim','legal','compliance',
      'zoning','permitting','partnership','vendor_dispute','title_issue',
      'environmental','tax','investor_relations','construction_defect','other'
    )),
  situation_summary TEXT,
  relevant_information TEXT,
  goals_and_deliverables TEXT,
  target_completion_date DATE,
  intake_conversation JSONB DEFAULT '[]'::jsonb,
  ai_generated_workflow JSONB,
  linked_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  linked_opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  linked_entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);
```

Auto-number trigger generating `MTR-YYYY-NNNN`. Updated_at trigger. Indexes on status, priority, category, created_by, assigned_to, all linked FKs, created_at DESC.

### matter_contacts

Junction table: matter_id → contacts with role (free text: opposing_counsel, lender_contact, attorney, broker, etc.), notes, is_primary. UNIQUE(matter_id, contact_id, role).

### matter_workflow_steps

AI-generated (and user-editable) steps: step_order, step_type (milestone/task/deliverable/decision_point/review), title, description, status (pending/in_progress/completed/skipped/blocked), assigned_to, due_date, completed_at, depends_on (UUID[]), ai_generated boolean, parent_step_id for sub-tasks.

### matter_documents

File references: file_name, file_url, storage_path, file_size, mime_type, document_type (contract/correspondence/legal_filing/financial/photo/other), uploaded_by.

### matter_notes

Activity log: note_type (comment/status_change/assignment/system/email_log), content, previous_value, new_value for tracking field changes.

### matter_linked_records

Flexible polymorphic linking: record_type (project/opportunity/entity/contact/matter), record_id, relationship_description. UNIQUE(matter_id, record_type, record_id).

### Storage & RLS

Storage bucket `matter-documents` (private, 50MB limit). RLS enabled on all 6 tables, authenticated full access.

### Verify

6 tables exist. Regenerate TypeScript types. `npm run build` — zero errors.

---

## PHASE 2 — ROUTING, TYPES, QUERIES, LIST PAGE

### 2a. Add Matters to Operations Dropdown

In `src/components/layout/TopNav.tsx`, add Matters as 4th item in Operations dropdown → `/operations/matters`. Use `Scale` icon (lucide-react). If Operations dropdown doesn't exist, create it with shadcn DropdownMenu.

### 2b. TypeScript Types

Create `src/types/matters.ts` with full interfaces for: Matter (with all joined relations), MatterContact, MatterWorkflowStep, MatterDocument, MatterNote, MatterLinkedRecord. Plus type aliases for all enum values (MatterStatus, MatterPriority, MatterCategory, WorkflowStepType, WorkflowStepStatus, MatterNoteType).

### 2c. Query Helpers

Create `src/lib/queries/matters.ts` with Supabase query functions: getMatters (filterable, paginated), getMatter (single with all joins), updateMatter, addMatterNote, updateWorkflowStep, addWorkflowStep, addMatterContact, removeMatterContact, uploadMatterDocument, addLinkedRecord.

### 2d. List Page

Create `src/routes/_authenticated/operations/matters/index.tsx`.

**Sidebar (Qualia index mode):** Status filters with count badges (All, Open, In Progress, On Hold, Resolved, Closed). Active filter gets #1B3022 left border. Aggregate metrics at bottom.

**Main content:** Breadcrumb (Operations > Matters), title with count, "+ New Matter" primary button, filter bar (priority, category, search). DataTable: matter_number, title, status badge, priority badge, category, assigned_to, target_completion_date, created_at. Click row navigates to detail. Empty state with Scale icon.

Badge colors — Status: open=info, in_progress=warning, on_hold=muted, resolved=success, closed=slate, cancelled=destructive. Priority: critical=destructive, high=warning, medium=info, low=muted.

### Verify

`npm run build` — zero errors. Operations dropdown has Matters. List page renders at `/operations/matters`.

---

## PHASE 3 — CONVERSATIONAL INTAKE PAGE

Create `src/routes/_authenticated/operations/matters/new.tsx` and supporting components.

### Layout

Two-column on #F1F5F9: left 60% = chat interface, right 40% = live preview panel. Breadcrumb: Operations > Matters > New Matter.

### Chat Interface (`src/components/matters/MatterIntakeChat.tsx`)

Messaging-style UI with 4 guided steps:

1. **Situation:** "Let's create a new matter. Describe the situation — what's going on?"
2. **Parties & Context:** "Tell me about the relevant parties and any important background." — includes typeahead record linking (search contacts, projects, opportunities, entities)
3. **Goals & Timeline:** "What's the desired outcome? What needs to happen, and by when?"
4. **Documents (optional):** File upload dropzone → Supabase Storage `matter-documents` bucket.

After all steps → "Create Matter" button → calls Supabase Edge Function (Phase 4) → navigate to detail on success.

Styling: system messages left-aligned (#F1F5F9 bg, #64748B text), user messages right-aligned (#1B3022 bg, white text). Auto-scroll. Typing indicator dots.

### Voice-to-Text (`src/components/matters/VoiceInputButton.tsx`)

Mic button using browser Web Speech API. Pulsing red dot when active. Toggle start/stop. Graceful fallback if unsupported.

### Record Linker (`src/components/matters/RecordLinker.tsx`)

Debounced 300ms typeahead search across projects, opportunities, contacts, entities. Floating dropdown grouped by type. Click to add as chip. Stored in local state for creation payload.

### Preview Panel (`src/components/matters/MatterPreviewPanel.tsx`)

White card (#E2E8F0 border) updating per step: title/category suggestion after Step 1, linked records after Step 2, goals/priority/date after Step 3, document list after Step 4.

### Verify

`npm run build` — zero errors. Chat renders. Steps advance. Mic works (Chrome). Preview updates. Files upload.

---

## PHASE 4 — SUPABASE EDGE FUNCTION (AI GENERATION)

**This is a Supabase Edge Function (Deno runtime), NOT a Next.js API route.**

### Create `supabase/functions/generate-matter/index.ts`

The function:

1. Receives: userId, situationText, relevantInfoText, goalsText, linkedRecords, uploadedFiles
2. Fetches linked record context from Supabase (project names/status, contact details, entity info)
3. Calls Claude API (via `fetch` to `https://api.anthropic.com/v1/messages`, model: `claude-sonnet-4-20250514`) with a system prompt tailored for VanRock Holdings / Red Cedar Homes
4. Parses JSON response: title, category, priority, summaries, target_completion_date, 5-15 workflow_steps (with step_order, step_type, suggested_due_offset_days, dependencies), contact_roles
5. Writes to Supabase: matter record, workflow steps (resolving step_order → UUID for dependencies), contact links with AI-suggested roles, additional linked records, document references
6. Returns `{ success: true, matter_id, matter_number }`

### System Prompt for Claude

```
You are a workflow generation engine for VanRock Holdings LLC, a for-sale
residential development company operating in the Greenville-Spartanburg-Charlotte
corridor. The company builds through Red Cedar Homes LLC (general contractor)
and operates through project-specific SPEs. Development types: scattered lot,
community development, lot development, and lot purchase — all for-sale
residential, no rentals.

Take a conversational intake about a "matter" (a one-off workflow item outside
standard project operations) and produce structured JSON with:

1. title (max 80 chars)
2. category (from enum)
3. priority (critical/high/medium/low)
4. situation_summary (2-4 sentences)
5. relevant_information (2-4 sentences)
6. goals_and_deliverables (2-4 sentences)
7. target_completion_date (ISO date)
8. workflow_steps: 5-15 steps with step_order, step_type, title, description,
   suggested_due_offset_days, depends_on
9. contact_roles: suggested role per linked contact

Front-load information gathering. Include decision points. End with resolution.
Respond ONLY with valid JSON — no markdown, no explanation.
```

### Client Invocation

In the intake page, call via:
```typescript
const response = await supabase.functions.invoke('generate-matter', {
  body: { userId, situationText, relevantInfoText, goalsText, linkedRecords, uploadedFiles }
})
```

Navigate with TanStack Router on success. Show rotating loading messages during the 3-8 second generation.

### Deploy

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy generate-matter
```

### Verify

`npm run build` — zero errors. Edge function deploys. Full intake flow creates a matter with workflow steps in Supabase.

---

## PHASE 5 — MATTER DETAIL PAGE

Create `src/routes/_authenticated/operations/matters/$matterId.tsx` and supporting components.

### Sidebar (Qualia Detail Mode)

```
← BACK TO MATTERS

MATTER
[Scale icon] Loan Refinance - Watson House
MTR-2026-0001

───── OVERVIEW ─────
  Basic Info
  Situation
  Parties

───── WORKFLOW ─────
  Steps & Milestones
  Timeline

───── RECORDS ─────
  Documents
  Linked Records

───── ACTIVITY ─────
  Notes & History
```

Active page: #1B3022 left border. Section labels are uppercase dividers, NOT clickable.

### Sections

**Basic Info** — Auto-save fields (useAutoSave, 800ms debounce, NO save buttons): title, status, priority, category, assigned_to, target_completion_date. Status and assignment changes auto-log matter_notes. KPI cards: workflow progress bar (X of Y complete), days open, days to deadline.

**Situation** — Auto-save textareas: situation_summary, relevant_information, goals_and_deliverables.

**Parties** — Table of matter_contacts: contact name (link to /contacts/$id), role, company, email, phone, primary toggle, remove. "Add Contact" button → modal with contact typeahead + role input.

**Steps & Milestones** — Vertical list of matter_workflow_steps. Each step card: step number, type icon (Flag=milestone, CheckSquare=task, FileText=deliverable, GitBranch=decision_point, Eye=review), title, expandable description, status dropdown (auto-save), assigned_to (auto-save), due_date (auto-save), dependency pills, "AI Generated" badge. Completed=green check + dimmed. Overdue=red badge. "Add Step" inline form at bottom. Progress bar at top.

**Documents** — Table of matter_documents. Upload button + drag-and-drop zone → Supabase Storage. Document type selector on upload.

**Linked Records** — Primary links (project/opportunity/entity cards), additional from matter_linked_records, "Link Record" modal, related matters (same linked_project_id).

**Notes & History** — Reverse-chronological feed. comment=user bubble, status_change=system line, assignment=system line. "Add Comment" input at top.

### Right Panel

Use existing collapsible right panel pattern (Tasks, Notes, Activity).

### Verify

`npm run build` — zero errors. Detail page renders. Auto-save works with visual feedback (spinner → green check). Status changes log notes. Workflow steps update. Documents upload. Comments post.

---

## PHASE 6 — DASHBOARD WIDGET & POLISH

### Dashboard Widget

Add to `src/routes/_authenticated/dashboard/index.tsx`: white card with Scale icon, "Open Matters" header, priority breakdown (Critical red / High amber / Medium blue / Low gray counts), 5 most recent open matters, "View All" → `/operations/matters`, "+ New Matter" → `/operations/matters/new`.

### Auto-Completion

After any workflow step status change, check if all steps completed/skipped. If so, prompt: "All steps complete. Resolve this matter?" → sets status to resolved + logs note.

### Breadcrumbs

All pages: Operations > Matters (list), Operations > Matters > New Matter, Operations > Matters > MTR-2026-0001 (detail).

### Empty States

Every detail section: Workflow ("No steps yet. Click 'Add Step' to create one."), Documents ("No documents. Upload files to keep everything together."), Notes ("No activity yet."), Linked Records ("No additional linked records.").

### Keyboard Shortcuts (list page)

`n` → new matter, `/` → focus search, `Escape` → clear filters.

### Mobile

List: stack filters, table→cards. Detail: sidebar→drawer, single column. New: single column, preview below chat.

### Loading Skeletons

Skeleton states for list table, detail cards, workflow steps.

### Verify

`npm run build` — zero errors. Dashboard widget renders. Auto-completion prompts. Breadcrumbs correct. Mobile responsive. All empty states display.

---

## FILE MANIFEST

```
NEW FILES:
supabase/migrations/XXX_create_matters.sql
supabase/functions/generate-matter/index.ts
src/types/matters.ts
src/lib/queries/matters.ts
src/routes/_authenticated/operations/matters/index.tsx
src/routes/_authenticated/operations/matters/new.tsx
src/routes/_authenticated/operations/matters/$matterId.tsx
src/components/matters/MatterIntakeChat.tsx
src/components/matters/MatterPreviewPanel.tsx
src/components/matters/VoiceInputButton.tsx
src/components/matters/RecordLinker.tsx
src/components/matters/MatterOverview.tsx
src/components/matters/MatterWorkflow.tsx
src/components/matters/MatterDocuments.tsx
src/components/matters/MatterNotes.tsx
src/components/matters/MatterLinkedRecords.tsx
src/components/matters/WorkflowStepCard.tsx
src/components/matters/AddStepForm.tsx
src/components/matters/AddContactModal.tsx
src/components/matters/LinkRecordModal.tsx
src/components/matters/MatterDashboardWidget.tsx

MODIFIED FILES:
src/components/layout/TopNav.tsx (add Matters to Operations dropdown)
src/routes/_authenticated/dashboard/index.tsx (add widget)
```

## CATEGORY REFERENCE

| Category | Use For |
|---|---|
| contract_dispute | Contract disagreements, change orders, scope disputes |
| refinance | Loan refinancing, debt restructuring, extensions |
| insurance_claim | Property damage, liability, builder's risk |
| legal | Lawsuits, demand letters, mediation |
| compliance | Regulatory, affordable housing certs, LIHTC |
| zoning | Variances, appeals, conditional use permits |
| permitting | Permit delays, inspection failures, code violations |
| partnership | JV structuring, partner disputes, OA amendments |
| vendor_dispute | Vendor/sub disputes, liens, payment issues |
| title_issue | Title defects, mechanic's liens, easements |
| environmental | Phase I/II, remediation, wetlands |
| tax | Tax appeals, reassessments, Safe Harbor |
| investor_relations | Capital calls, distributions, reporting |
| construction_defect | Warranty, quality, structural issues |
| other | Anything else |

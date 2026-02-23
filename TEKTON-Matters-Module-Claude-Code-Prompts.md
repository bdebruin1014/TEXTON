# KOVA — MATTERS MODULE
## Claude Code Build Prompts

---

# PROMPT 1 OF 6 — DATABASE SCHEMA: MATTERS MODULE

## Context

You are working on **KOVA**, a full-lifecycle real estate development platform built for Red Cedar Homes (RCH) and its affiliated entities (VanRock Holdings LLC, Scattered Lot Fund II LLC, DCL Holdings, TCMP, SCR Management LLC, plus per-project SPEs). KOVA covers deal pipeline, project management, construction management, disposition, accounting, purchasing, investor/fund management, contacts, calendar, workflows, and administration. It serves the I-85 corridor from Charlotte to Greenville, SC.

**Tech Stack:**
- Build: Vite 6
- Framework: React 19 + TypeScript 5.9 (strict mode)
- Routing: TanStack Router (file-based, type-safe)
- Server State: TanStack Query v5
- Client State: Zustand
- Forms: React Hook Form + Zod v4 (auto-save 800ms debounce via useAutoSave hook — NO save buttons)
- Styling: Tailwind CSS v4 + shadcn/ui (design tokens via CSS vars)
- Database: Supabase (PostgreSQL + Auth + Storage + Realtime), PKCE auth
- Tables: TanStack Table v8
- Calendar: FullCalendar
- Charts: Recharts + Tremor
- Command Palette: cmdk
- E-Sign: DocuSeal
- Linting: Biome
- Testing: Vitest
- Hosting: Vercel
- Monitoring: Sentry

**Design System (CSS Variables):**
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

**Project Structure:**
```
kova/
├── src/
│   ├── routes/
│   │   ├── _authenticated/
│   │   │   ├── dashboard/
│   │   │   ├── pipeline/
│   │   │   ├── projects/
│   │   │   ├── construction/
│   │   │   ├── disposition/
│   │   │   ├── accounting/
│   │   │   ├── operations/        ← Operations dropdown module
│   │   │   │   ├── deal-sheets/
│   │   │   │   ├── esign/
│   │   │   │   ├── rch-contracts/
│   │   │   │   └── matters/       ← NEW (this module)
│   │   │   ├── contacts/
│   │   │   ├── calendar/
│   │   │   └── admin/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui primitives
│   │   ├── layout/                # TopNav, Sidebar, RightPanel
│   │   ├── forms/                 # AutoSaveField, CurrencyInput
│   │   ├── tables/                # DataTable wrapper
│   │   └── charts/
│   ├── hooks/                     # useAutoSave, useSupabase, useAuth
│   ├── stores/                    # Zustand (auth, UI, entity, filters)
│   ├── lib/                       # Supabase client, query client, utils
│   ├── types/                     # DB types + enums
│   └── styles/                    # globals.css, tokens.css
└── supabase/
    ├── migrations/
    ├── functions/                 # Edge Functions (Deno)
    └── config.toml
```

**Navigation:** Top nav (#112233) has: Pipeline, Projects, Construction, Disposition, Accounting, Contacts, Calendar, Admin. An **Operations** dropdown exists (or is being added) containing: Deal Sheets, E-Sign Documents, RCH Contracts. Matters becomes the 4th item.

**Existing Core Tables (do NOT recreate):**
- projects, opportunities, contacts, entities, documents, auth.users

**Important:** KOVA is Vite + React SPA. NO Next.js. Server-side logic uses **Supabase Edge Functions** (Deno).

## Task

Create migration: `supabase/migrations/XXX_create_matters_module.sql`

### Tables

**matters** — core record with auto-generated matter_number (MTR-YYYY-NNNN), status/priority/category enums, narrative fields (situation_summary, relevant_information, goals_and_deliverables), AI intake conversation log (JSONB), linked record FKs to projects/opportunities/entities, ownership (created_by, assigned_to), timestamps.

**matter_contacts** — junction linking contacts to matters with roles (opposing_counsel, lender_contact, attorney, etc.).

**matter_workflow_steps** — AI-generated and user-editable milestones/tasks/deliverables with step_order, step_type enum (milestone/task/deliverable/decision_point/review), status enum (pending/in_progress/completed/skipped/blocked), dependencies (UUID array), due dates.

**matter_documents** — file references (Supabase Storage), document_type classification.

**matter_notes** — activity log with note_type enum (comment/status_change/assignment/system/email_log), tracks field changes via previous_value/new_value.

**matter_linked_records** — flexible polymorphic linking for additional records beyond primary FKs.

Include: auto-number trigger, updated_at triggers, all indexes, RLS policies (authenticated full access), storage bucket (matter-documents, 50MB limit).

### Full SQL

See the complete CREATE TABLE statements, triggers, indexes, RLS policies, and storage bucket creation in the schema specification above. Key details:

- matter_number auto-generated via trigger: MTR-YYYY-NNNN
- Category enum: contract_dispute, refinance, insurance_claim, legal, compliance, zoning, permitting, partnership, vendor_dispute, title_issue, environmental, tax, investor_relations, construction_defect, other
- Status: open, in_progress, on_hold, resolved, closed, cancelled
- Priority: critical, high, medium, low
- Step types: milestone, task, deliverable, decision_point, review
- Step statuses: pending, in_progress, completed, skipped, blocked

### Verification

After running: verify 6 tables exist (matters, matter_contacts, matter_workflow_steps, matter_documents, matter_notes, matter_linked_records). Regenerate types. `npm run build` — zero errors.

---

# PROMPT 2 OF 6 — OPERATIONS DROPDOWN UPDATE, ROUTING & MATTERS LIST PAGE

## Context

Same KOVA stack as Prompt 1. Matters database tables exist. KOVA is Vite 6 + React 19 SPA with TanStack Router (file-based routing at `src/routes/_authenticated/`).

## Task

### 1. Add Matters to Operations Dropdown

In `src/components/layout/TopNav.tsx`, add Matters as the 4th item in the Operations dropdown:

```
Operations ▾
├── Deal Sheets      → /operations/deal-sheets
├── E-Sign Documents → /operations/esign
├── RCH Contracts    → /operations/rch-contracts
└── Matters          → /operations/matters        ← NEW
```

Use `Scale` icon (lucide-react). If Operations dropdown doesn't exist yet, create it using shadcn DropdownMenu. Active state: any /operations/* route active → trigger shows active styling (white text, #6B9E7A underline).

### 2. Create Route Files

```
src/routes/_authenticated/operations/matters/
├── index.tsx          -- list page
├── new.tsx            -- conversational intake
└── $matterId.tsx      -- detail view
```

### 3. Create Types (`src/types/matters.ts`) and Query Helpers (`src/lib/queries/matters.ts`)

Full TypeScript interfaces for all matter-related types. Query helpers using Supabase client: getMatters (with filters/pagination), getMatter (with all joins), updateMatter, addMatterNote, updateWorkflowStep, addWorkflowStep, addMatterContact, removeMatterContact, uploadMatterDocument, addLinkedRecord.

### 4. Matters List Page (Qualia Index Pattern)

**Sidebar (Index Mode):** Status filters with count badges (All, Open, In Progress, On Hold, Resolved, Closed). Active filter gets #1B3022 left border. Aggregate metrics at bottom.

**Main Content:** Breadcrumb (Operations > Matters), page title with count, "+ New Matter" primary button, filter bar (priority, category, search). DataTable via TanStack Table v8: matter_number, title, status badge, priority badge, category, assigned_to, target date, created_at. Click row → navigate. Empty state with Scale icon.

Status badge colors: open=info, in_progress=warning, on_hold=muted, resolved=success, closed=slate, cancelled=destructive. Priority: critical=destructive, high=warning, medium=info, low=muted.

### Verification

`npm run build` — zero errors. Operations dropdown has Matters. `/operations/matters` renders list with sidebar and empty state.

---

# PROMPT 3 OF 6 — CONVERSATIONAL INTAKE: NEW MATTER PAGE

## Context

Same KOVA stack. Matters database and list page exist. This is Vite + React SPA (no Next.js). The AI call goes through a Supabase Edge Function (Prompt 4). This prompt builds frontend only.

## Task

Build `src/routes/_authenticated/operations/matters/new.tsx`

### Layout

Two-column on #F1F5F9: left 60% chat, right 40% live preview. Breadcrumb: Operations > Matters > New Matter.

### Chat Interface (`src/components/matters/MatterIntakeChat.tsx`)

4-step guided conversation:

**Step 1 — Situation:** "Let's create a new matter. Describe the situation..."
**Step 2 — Parties & Context:** "Tell me about relevant parties and background..." (with typeahead record linking across contacts/projects/opportunities/entities)
**Step 3 — Goals & Timeline:** "What's the desired outcome and timeline?"
**Step 4 — Documents:** Optional file upload to Supabase Storage.

After all steps → "Create Matter" button → calls edge function → navigate to detail on success.

Chat styling: system messages left-aligned (#F1F5F9 bg), user messages right-aligned (#1B3022 bg, white text). Auto-scroll. Typing indicator.

### Voice-to-Text (`src/components/matters/VoiceInputButton.tsx`)

Mic button using Web Speech API. Pulsing red dot when recording. Toggle start/stop.

### Record Linking (`src/components/matters/RecordLinker.tsx`)

Debounced 300ms search across projects, opportunities, contacts, entities. Floating dropdown grouped by type. Click to add as linked chip.

### Preview Panel (`src/components/matters/MatterPreviewPanel.tsx`)

Updates per step: title/category suggestion, linked records, goals/priority, documents. White card, #E2E8F0 border.

### Verification

`npm run build` — zero errors. Chat renders at `/operations/matters/new`. Steps progress on user input. Mic works in Chrome. Preview updates. File upload works.

---

# PROMPT 4 OF 6 — SUPABASE EDGE FUNCTION: AI MATTER GENERATION

## Context

Same KOVA stack. NO Next.js API routes. Server logic uses **Supabase Edge Functions** (Deno runtime) at `supabase/functions/`.

## Task

### Create Edge Function: `supabase/functions/generate-matter/index.ts`

Deno-based edge function that:

1. Receives intake data (userId, situationText, relevantInfoText, goalsText, linkedRecords, uploadedFiles)
2. Fetches linked record context from Supabase (project names, contact details, entity info)
3. Calls Claude (Anthropic API via fetch, model: claude-sonnet-4-20250514) with a structured system prompt for VanRock Holdings
4. Parses JSON response: title, category, priority, summaries, target_completion_date, 5-15 workflow_steps, contact_roles
5. Writes to Supabase: matter record, workflow steps (with dependency resolution from step_order → UUID), contact links with AI-suggested roles, linked records, document references
6. Returns { success: true, matter_id, matter_number }

Includes CORS headers, error handling, JSON fence stripping.

### Deploy & Configure

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy generate-matter
```

### Wire Intake Page

Update the "Create Matter" handler to call: `supabase.functions.invoke('generate-matter', { body: {...} })`. Navigate with TanStack Router on success. Loading animation while processing (3-8 seconds).

### Verification

`npm run build` — zero errors. Deploy edge function. Full intake flow → matter created in Supabase with workflow steps.

---

# PROMPT 5 OF 6 — MATTER DETAIL PAGE

## Context

Same KOVA stack. All pieces exist except detail page. Build `src/routes/_authenticated/operations/matters/$matterId.tsx` following the Qualia detail pattern.

## Task

### Sidebar (Qualia Detail Mode)

```
← BACK TO MATTERS

MATTER
[Scale] Loan Refinance - Watson House
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

Active page: #1B3022 left border. Section labels are uppercase dividers, not clickable.

### Sections

**Basic Info:** Auto-save fields (title, status, priority, category, assigned_to, target_completion_date). Status/assignment changes auto-log notes. KPI cards: workflow progress, days open, days to deadline.

**Situation:** Auto-save textareas for situation_summary, relevant_information, goals_and_deliverables.

**Parties:** matter_contacts table with role, contact link, add/remove.

**Steps & Milestones:** Workflow step cards with type icons, status dropdown (auto-save), assigned_to, due_date, dependency pills, AI-generated badge. Add Step form. Progress bar.

**Documents:** File table, upload with drag-and-drop, Supabase Storage.

**Linked Records:** Primary links (project/opportunity/entity cards), additional links, Link Record modal, related matters.

**Notes & History:** Activity feed (comments, status_changes, assignments, system). Add comment input.

### Right Panel

Collapsible panel with Tasks, Notes, Activity tabs for this matter.

### Verification

`npm run build` — zero errors. Detail page renders from list. Auto-save works. Status changes log notes. Workflow steps update. Documents upload. Comments post.

---

# PROMPT 6 OF 6 — DASHBOARD WIDGET & POLISH

## Context

Same KOVA stack. Matters module fully functional. Final polish.

## Task

### 1. Dashboard Widget

Add to `src/routes/_authenticated/dashboard/index.tsx`: "Open Matters" card (Scale icon) with priority breakdown, 5 most recent open matters, View All and New Matter links.

### 2. Auto-Completion Detection

After workflow step changes, check if all complete → prompt "Resolve this matter?"

### 3. Breadcrumbs

All pages: Operations > Matters, Operations > Matters > New Matter, Operations > Matters > MTR-2026-0001.

### 4. Empty States

Every detail section gets proper empty state with icon and helpful text.

### 5. Keyboard Shortcuts (list page)

`n` → new matter, `/` → focus search, `Escape` → clear.

### 6. Mobile

Stack filters vertically, table → cards, sidebar → drawer, two-column → single.

### 7. Loading Skeletons

Skeleton states for list, detail, workflow.

### Verification

`npm run build` — zero errors. Dashboard widget shows. Auto-completion works. Breadcrumbs correct. Mobile responsive. Empty states display.

---

# APPENDIX A — EXECUTION ORDER

1. Prompt 1 — Database migration
2. Prompt 2 — Routing, types, queries, list page, Operations dropdown
3. Prompt 3 — Conversational intake UI
4. Prompt 4 — Supabase Edge Function + wire to intake
5. Prompt 5 — Matter detail page (Qualia pattern)
6. Prompt 6 — Dashboard widget, polish

After each: `npm run build` — zero errors.

# APPENDIX B — FILE MANIFEST

```
NEW FILES:
supabase/migrations/XXX_create_matters_module.sql
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

# APPENDIX C — CATEGORY REFERENCE

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

---

# DETAILED CODE APPENDIX

The prompts above are summaries. Below is the complete code Claude Code needs for each prompt.

## D1 — FULL MIGRATION SQL

```sql
-- ============================================================
-- KOVA MATTERS MODULE — Database Migration
-- ============================================================

CREATE TABLE matters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'on_hold', 'resolved', 'closed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  category TEXT NOT NULL CHECK (category IN (
    'contract_dispute', 'refinance', 'insurance_claim', 'legal',
    'compliance', 'zoning', 'permitting', 'partnership',
    'vendor_dispute', 'title_issue', 'environmental',
    'tax', 'investor_relations', 'construction_defect', 'other'
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

CREATE OR REPLACE FUNCTION generate_matter_number()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  next_num INTEGER;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(matter_number FROM 10) AS INTEGER)), 0) + 1
    INTO next_num
    FROM matters
    WHERE matter_number LIKE 'MTR-' || year_str || '-%';
  NEW.matter_number := 'MTR-' || year_str || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_matter_number
  BEFORE INSERT ON matters
  FOR EACH ROW
  WHEN (NEW.matter_number IS NULL OR NEW.matter_number = '')
  EXECUTE FUNCTION generate_matter_number();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $fn$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $fn$ LANGUAGE plpgsql;
  END IF;
END $$;

CREATE TRIGGER trg_matters_updated_at
  BEFORE UPDATE ON matters FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_matters_status ON matters(status);
CREATE INDEX idx_matters_priority ON matters(priority);
CREATE INDEX idx_matters_category ON matters(category);
CREATE INDEX idx_matters_created_by ON matters(created_by);
CREATE INDEX idx_matters_assigned_to ON matters(assigned_to);
CREATE INDEX idx_matters_linked_project ON matters(linked_project_id) WHERE linked_project_id IS NOT NULL;
CREATE INDEX idx_matters_linked_opportunity ON matters(linked_opportunity_id) WHERE linked_opportunity_id IS NOT NULL;
CREATE INDEX idx_matters_linked_entity ON matters(linked_entity_id) WHERE linked_entity_id IS NOT NULL;
CREATE INDEX idx_matters_created_at ON matters(created_at DESC);

CREATE TABLE matter_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  notes TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(matter_id, contact_id, role)
);
CREATE INDEX idx_matter_contacts_matter ON matter_contacts(matter_id);
CREATE INDEX idx_matter_contacts_contact ON matter_contacts(contact_id);

CREATE TABLE matter_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  parent_step_id UUID REFERENCES matter_workflow_steps(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_type TEXT NOT NULL CHECK (step_type IN ('milestone', 'task', 'deliverable', 'decision_point', 'review')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'blocked')),
  assigned_to UUID REFERENCES auth.users(id),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  depends_on UUID[] DEFAULT '{}',
  ai_generated BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_matter_workflow_steps_updated_at
  BEFORE UPDATE ON matter_workflow_steps FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX idx_matter_steps_matter ON matter_workflow_steps(matter_id);
CREATE INDEX idx_matter_steps_parent ON matter_workflow_steps(parent_step_id) WHERE parent_step_id IS NOT NULL;
CREATE INDEX idx_matter_steps_status ON matter_workflow_steps(matter_id, status);
CREATE INDEX idx_matter_steps_assigned ON matter_workflow_steps(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_matter_steps_due ON matter_workflow_steps(due_date) WHERE status NOT IN ('completed', 'skipped');

CREATE TABLE matter_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT,
  storage_path TEXT,
  file_size BIGINT,
  mime_type TEXT,
  document_type TEXT,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_matter_docs_matter ON matter_documents(matter_id);

CREATE TABLE matter_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  note_type TEXT NOT NULL DEFAULT 'comment' CHECK (note_type IN ('comment', 'status_change', 'assignment', 'system', 'email_log')),
  content TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_matter_notes_matter ON matter_notes(matter_id);
CREATE INDEX idx_matter_notes_created ON matter_notes(matter_id, created_at DESC);

CREATE TABLE matter_linked_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('project', 'opportunity', 'entity', 'contact', 'matter')),
  record_id UUID NOT NULL,
  relationship_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(matter_id, record_type, record_id)
);
CREATE INDEX idx_matter_linked_matter ON matter_linked_records(matter_id);
CREATE INDEX idx_matter_linked_record ON matter_linked_records(record_type, record_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('matter-documents', 'matter-documents', false, 52428800)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_linked_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access" ON matters FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON matter_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON matter_workflow_steps FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON matter_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON matter_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON matter_linked_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

## D2 — EDGE FUNCTION SYSTEM PROMPT (for generate-matter)

The Claude system prompt used inside the edge function:

```
You are a workflow generation engine for VanRock Holdings LLC, a real estate development company operating in the Greenville-Spartanburg-Charlotte corridor. The company builds through Red Cedar Homes (builder/contractor) and operates through project-specific SPEs. Development types include scattered lot, community development, lot development, and lot purchase.

Your job is to take a conversational intake about a new "matter" (a one-off workflow item outside standard project operations) and produce structured JSON with:

1. title (max 80 characters, clear and specific)
2. category: one of contract_dispute, refinance, insurance_claim, legal, compliance, zoning, permitting, partnership, vendor_dispute, title_issue, environmental, tax, investor_relations, construction_defect, other
3. priority: critical, high, medium, or low
4. situation_summary (2-4 sentences, professional)
5. relevant_information (2-4 sentences)
6. goals_and_deliverables (2-4 sentences)
7. target_completion_date (ISO date, based on stated timeline or reasonable estimate)
8. workflow_steps: 5-15 steps, each with step_order (integer), step_type (milestone/task/deliverable/decision_point/review), title, description (1-2 sentences), suggested_due_offset_days (integer from today), depends_on (array of step_order numbers, empty if none)
9. contact_roles: for each linked contact, suggest a role (opposing_party, attorney, lender_contact, broker, contractor, consultant, etc.)

The workflow should be practical and specific to the described situation. Front-load information gathering. Include decision points. End with resolution/closure steps.

Respond ONLY with valid JSON — no markdown fences, no explanation:

{
  "title": "string",
  "category": "string",
  "priority": "string",
  "situation_summary": "string",
  "relevant_information": "string",
  "goals_and_deliverables": "string",
  "target_completion_date": "YYYY-MM-DD",
  "workflow_steps": [
    { "step_order": 1, "step_type": "task", "title": "string", "description": "string", "suggested_due_offset_days": 3, "depends_on": [] }
  ],
  "contact_roles": [
    { "contact_name": "string", "suggested_role": "string" }
  ]
}
```

## D3 — EDGE FUNCTION CALL FROM CLIENT

```typescript
// In the intake page — call via Supabase client (NOT fetch to an API route)
const handleCreateMatter = async () => {
  setIsGenerating(true)
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const response = await supabase.functions.invoke('generate-matter', {
      body: {
        userId: session?.user.id,
        situationText,
        relevantInfoText,
        goalsText,
        linkedRecords,
        uploadedFiles,
      },
    })
    if (response.data?.success) {
      navigate({ to: '/operations/matters/$matterId', params: { matterId: response.data.matter_id } })
    }
  } catch (error) {
    console.error('Matter creation failed:', error)
  } finally {
    setIsGenerating(false)
  }
}
```

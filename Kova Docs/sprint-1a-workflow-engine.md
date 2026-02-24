# KOVA Sprint 1A — Workflow Engine Foundation

## Context
KOVA has 204 route files, 95 components, 124 DB tables, and 11 modules. The platform stores data but does not assign work. This sprint adds the workflow engine that auto-generates tasks when project/job status changes.

## What to Build

### 1. Database Migration: `supabase/migrations/20260225_workflow_engine.sql`

Create these tables:

```sql
-- Workflow template library (configured in Admin)
CREATE TABLE workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  project_type TEXT CHECK (project_type IN ('scattered_lot', 'community_development', 'lot_purchase', 'lot_development', 'all')),
  trigger_event TEXT NOT NULL, -- e.g. 'opportunity.status:dd', 'job.status:started', 'disposition.status:under_contract'
  trigger_table TEXT NOT NULL, -- e.g. 'opportunities', 'jobs', 'dispositions'
  trigger_column TEXT NOT NULL DEFAULT 'status',
  trigger_value TEXT NOT NULL,  -- the status value that fires this template
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Task definitions within a template (ordered)
CREATE TABLE workflow_template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  phase TEXT, -- grouping label like 'Order Opening', 'Title', 'Pre-Closing' (matches Qualia pattern)
  assigned_role TEXT NOT NULL, -- e.g. 'pm', 'acq_mgr', 'director', 'principal', 'closing_coordinator'
  due_days INTEGER NOT NULL, -- days relative to trigger event
  due_reference TEXT DEFAULT 'trigger_date', -- 'trigger_date' or 'previous_task'
  is_gate BOOLEAN DEFAULT false, -- if true, blocks downstream tasks until complete
  gate_condition TEXT, -- optional: additional condition beyond completion
  depends_on UUID REFERENCES workflow_template_tasks(id), -- optional: predecessor task
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Running instance of a template applied to a specific record
CREATE TABLE workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES workflow_templates(id),
  record_type TEXT NOT NULL, -- 'opportunity', 'project', 'job', 'disposition'
  record_id UUID NOT NULL,
  project_id UUID REFERENCES projects(id), -- always populated for context
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  trigger_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  progress_pct NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Individual task instances within a workflow instance
CREATE TABLE task_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  template_task_id UUID REFERENCES workflow_template_tasks(id),
  name TEXT NOT NULL,
  description TEXT,
  phase TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'blocked', 'active', 'completed', 'skipped')),
  assigned_to UUID REFERENCES auth.users(id),
  assigned_role TEXT,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  is_gate BOOLEAN DEFAULT false,
  is_overdue BOOLEAN GENERATED ALWAYS AS (
    CASE WHEN status IN ('pending', 'active') AND due_date < now() THEN true ELSE false END
  ) STORED,
  notes TEXT,
  record_type TEXT NOT NULL,
  record_id UUID NOT NULL,
  project_id UUID,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_task_instances_assigned ON task_instances(assigned_to, status);
CREATE INDEX idx_task_instances_record ON task_instances(record_type, record_id);
CREATE INDEX idx_task_instances_overdue ON task_instances(is_overdue) WHERE is_overdue = true;
CREATE INDEX idx_task_instances_project ON task_instances(project_id);
CREATE INDEX idx_workflow_instances_record ON workflow_instances(record_type, record_id);
CREATE INDEX idx_workflow_templates_trigger ON workflow_templates(trigger_table, trigger_value);

-- RLS
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_template_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_instances ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can read all, only admin can write templates
CREATE POLICY "Anyone can read templates" ON workflow_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage templates" ON workflow_templates FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'software_admin'))
);
CREATE POLICY "Anyone can read template tasks" ON workflow_template_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage template tasks" ON workflow_template_tasks FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'software_admin'))
);
CREATE POLICY "Anyone can read workflow instances" ON workflow_instances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage instances" ON workflow_instances FOR ALL TO authenticated USING (true);
CREATE POLICY "Anyone can read task instances" ON task_instances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage task instances" ON task_instances FOR ALL TO authenticated USING (true);

-- Updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workflow_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workflow_template_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workflow_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON task_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

After creating the migration, regenerate Supabase types.

### 2. Seed Data: First 4 Workflow Templates

Insert seed data for 4 critical templates. Each template has tasks grouped by phase, with role assignments and relative deadlines. Use the Qualia workflow screenshot as the pattern — ordered tasks, phase groupings, role assignments, relative deadlines.

**Template 1: Opportunity Intake** (trigger: opportunity created, all project types)
- Phase "Intake": Review Opportunity (acq_mgr, 1 day), Run GIS Enrichment (acq_mgr, 1 day), Duplicate Check (acq_mgr, 1 day)
- Phase "Analysis": Run Feasibility Analysis (acq_mgr, 3 days), Present to Land Committee (acq_mgr, 5 days), Decision: Pursue/Archive (principal, 7 days — GATE)

**Template 2: Due Diligence** (trigger: opportunity.status = 'dd', all project types)
- Phase "Title & Survey": Order Title Search (closing_coordinator, 2 days), Order Survey (closing_coordinator, 2 days), Review Title Commitment (principal, 7 days), Review Survey (pm, 7 days)
- Phase "Environmental & Geotech": Order Soil Testing (pm, 3 days), Environmental Review (pm, 5 days)
- Phase "Zoning & Permits": Verify Zoning Compliance (acq_mgr, 3 days), Pre-Application Meeting (acq_mgr, 7 days)
- Phase "Financial": Final Underwriting (principal, 10 days — GATE), DD Decision: Proceed/Terminate (principal, 14 days — GATE)

**Template 3: Pre-Construction Readiness** (trigger: job.status = 'pre_construction', scattered_lot + community_development + lot_purchase)
- Phase "Plan & Selections": Assign Floor Plan (director, 2 days), Lock Selections (director, 5 days — GATE), Send to Sterling (pm, 7 days)
- Phase "Permits": Submit Permit Application (pm, 3 days), Track Permit Status (pm, 30 days), Permit Received (pm, 45 days — GATE)
- Phase "Estimating": Review Sterling Estimate (pm, 10 days), Approve Budget (director, 12 days — GATE)
- Phase "Pre-Con Checklist": Confirm Utility Availability (pm, 5 days), Schedule Pre-Con Meeting (pm, 7 days), Pre-Con Complete (pm, 14 days — GATE)

**Template 4: Construction Execution** (trigger: job.status = 'in_progress', all with vertical)
- Phase "Site Work": Mobilization (pm, 3 days), Clearing & Grading (pm, 7 days), Foundation Layout (pm, 10 days)
- Phase "Foundation": Footer Inspection (pm, 14 days — GATE), Pour Foundation (pm, 18 days), Foundation Backfill (pm, 21 days)
- Phase "Framing": Framing Start (pm, 25 days), Framing Complete (pm, 40 days), Framing Inspection (pm, 42 days — GATE)
- Phase "Rough-Ins": Plumbing Rough (pm, 48 days), HVAC Rough (pm, 48 days), Electrical Rough (pm, 48 days), Rough Inspection (pm, 52 days — GATE)
- Phase "Finishes": Insulation (pm, 55 days), Drywall (pm, 62 days), Interior Trim (pm, 70 days), Paint (pm, 75 days), Flooring (pm, 80 days), Cabinets & Counters (pm, 85 days)
- Phase "Completion": Final Mechanical (pm, 90 days), Landscaping (pm, 95 days), Final Clean (pm, 98 days), Punch List (pm, 100 days), Final Inspection (pm, 105 days — GATE), CO Received (pm, 110 days — GATE)

### 3. Admin UI: Workflow Template Builder

Location: `src/routes/_authenticated/admin/workflows/`

**Index page** (`index.tsx`): DataTable listing all workflow templates. Columns: Name, Project Type, Trigger Event, Task Count, Active (toggle), Actions (Edit, Duplicate, Delete). "Create Template" button top right.

**Detail page** (`$templateId.tsx`): Modeled EXACTLY on the Qualia workflow screenshot pattern:
- Top: Template name (editable), project type dropdown, trigger event config (table + column + value dropdowns)
- Below: Phase sections. Each phase has a header bar with phase name (editable) and a + button to add tasks
- Each task row shows: drag handle, Task Name, Assigned When (dropdown), To (role dropdown), Completes When (dropdown), Due (days input), From (reference dropdown), Gate checkbox, × delete button
- "Add Phase" button at bottom
- This is the EXACT layout from the Qualia Admin > Workflows > Core Workflows screenshot — ordered task list within collapsible phase sections

**Components needed:**
- `WorkflowTemplateForm.tsx` — template metadata (name, type, trigger)
- `WorkflowPhaseSection.tsx` — collapsible phase with task list
- `WorkflowTaskRow.tsx` — single task row with inline editing
- `useWorkflowTemplates.ts` — hook for CRUD operations
- `useWorkflowTemplateTasks.ts` — hook for task CRUD within a template

### 4. Workflow Instance Engine (Edge Function)

Create `supabase/functions/workflow-engine/index.ts`:

This Edge Function is called via database webhook when a record's status changes. Logic:
1. Receive payload with table name, record ID, old status, new status
2. Query `workflow_templates` for matching templates (trigger_table + trigger_value match, is_active = true)
3. For each matching template, check project_type compatibility
4. Create a `workflow_instance` record linked to the triggering record
5. For each `workflow_template_task` in the template:
   a. Create a `task_instance`
   b. Resolve `assigned_to` from the project's team assignments (query the project record for pm_id, acq_mgr_id, etc., falling back to assigned_role if no specific user)
   c. Calculate `due_date` from trigger_date + due_days
   d. Set status to 'active' if no dependencies, 'blocked' if depends_on another task or is behind a gate
6. Return the created workflow instance ID

Also create a database trigger function that calls this Edge Function when status changes on: opportunities, projects, jobs, dispositions.

## Design Rules
- Follow KOVA design system: #1B3022 primary, #112233 nav, #F1F5F9 page background
- No icons — typography and color for hierarchy
- Auto-save with 800ms debounce on all editable fields in the template builder
- Admin workflow page uses the exact Qualia pattern from the screenshot: phase sections with ordered task rows

## Acceptance Criteria
1. Migration runs clean, types regenerate
2. 4 workflow templates visible in Admin > Workflows with all tasks
3. Template builder allows creating, editing, reordering tasks within phases
4. When an opportunity status changes to 'dd' in the UI, the DD workflow auto-instantiates and task_instances appear in the database
5. task_instances have correct assigned_to, due_date, and status (active vs blocked by gates)

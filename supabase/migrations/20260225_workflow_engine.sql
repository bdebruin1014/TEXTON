-- 20260225_workflow_engine.sql
-- Sprint 1A: Workflow Engine Foundation
-- Evolves existing workflow_templates + workflow_instances and adds
-- workflow_template_tasks + task_instances for the trigger-based engine.

-- ============================================================
-- 1. Extend workflow_templates with trigger configuration
-- ============================================================

ALTER TABLE public.workflow_templates
  ADD COLUMN IF NOT EXISTS project_type TEXT
    CHECK (project_type IN ('scattered_lot', 'community_development', 'lot_purchase', 'lot_development', 'all')),
  ADD COLUMN IF NOT EXISTS trigger_event TEXT,        -- e.g. 'opportunity.status:dd'
  ADD COLUMN IF NOT EXISTS trigger_table TEXT,        -- e.g. 'opportunities'
  ADD COLUMN IF NOT EXISTS trigger_column TEXT DEFAULT 'status',
  ADD COLUMN IF NOT EXISTS trigger_value TEXT,        -- the status value that fires this template
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- ============================================================
-- 2. workflow_template_tasks (task definitions within a template)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.workflow_template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  phase TEXT,                        -- grouping label like 'Intake', 'Title & Survey', etc.
  assigned_role TEXT NOT NULL,       -- e.g. 'pm', 'acq_mgr', 'director', 'principal', 'closing_coordinator'
  due_days INTEGER NOT NULL,         -- days relative to trigger event
  due_reference TEXT DEFAULT 'trigger_date',  -- 'trigger_date' or 'previous_task'
  is_gate BOOLEAN DEFAULT false,     -- blocks downstream tasks until complete
  gate_condition TEXT,               -- optional additional condition
  depends_on UUID REFERENCES public.workflow_template_tasks(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. Extend workflow_instances for engine use
-- ============================================================

ALTER TABLE public.workflow_instances
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id),
  ADD COLUMN IF NOT EXISTS trigger_date TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS progress_pct NUMERIC(5,2) DEFAULT 0;

-- Add 'cancelled' to status check if not already present (existing allows 'active','paused','completed','cancelled')
-- The existing constraint already includes 'cancelled', so no change needed.

-- ============================================================
-- 4. task_instances (individual tasks within a workflow instance)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.task_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID NOT NULL REFERENCES public.workflow_instances(id) ON DELETE CASCADE,
  template_task_id UUID REFERENCES public.workflow_template_tasks(id),
  name TEXT NOT NULL,
  description TEXT,
  phase TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'blocked', 'active', 'completed', 'skipped')),
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
  project_id UUID REFERENCES public.projects(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_task_instances_assigned ON public.task_instances(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_task_instances_record ON public.task_instances(record_type, record_id);
CREATE INDEX IF NOT EXISTS idx_task_instances_overdue ON public.task_instances(is_overdue) WHERE is_overdue = true;
CREATE INDEX IF NOT EXISTS idx_task_instances_project ON public.task_instances(project_id);
CREATE INDEX IF NOT EXISTS idx_wf_templates_trigger ON public.workflow_templates(trigger_table, trigger_value);
CREATE INDEX IF NOT EXISTS idx_wf_template_tasks_template ON public.workflow_template_tasks(template_id);

-- ============================================================
-- 6. RLS
-- ============================================================

ALTER TABLE public.workflow_template_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_instances ENABLE ROW LEVEL SECURITY;

-- workflow_templates: anyone authenticated can read, admins can manage
DROP POLICY IF EXISTS "wf_templates_select" ON public.workflow_templates;
CREATE POLICY "wf_templates_select" ON public.workflow_templates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "wf_templates_manage" ON public.workflow_templates;
CREATE POLICY "wf_templates_manage" ON public.workflow_templates
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role IN ('admin', 'software_admin')
    )
  );

-- workflow_template_tasks: same pattern as templates
DROP POLICY IF EXISTS "wf_template_tasks_select" ON public.workflow_template_tasks;
CREATE POLICY "wf_template_tasks_select" ON public.workflow_template_tasks
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "wf_template_tasks_manage" ON public.workflow_template_tasks;
CREATE POLICY "wf_template_tasks_manage" ON public.workflow_template_tasks
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role IN ('admin', 'software_admin')
    )
  );

-- task_instances: all authenticated users can read and manage
DROP POLICY IF EXISTS "task_instances_select" ON public.task_instances;
CREATE POLICY "task_instances_select" ON public.task_instances
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "task_instances_manage" ON public.task_instances;
CREATE POLICY "task_instances_manage" ON public.task_instances
  FOR ALL TO authenticated USING (true);

-- ============================================================
-- 7. Updated_at triggers
-- ============================================================

DROP TRIGGER IF EXISTS set_workflow_template_tasks_updated_at ON public.workflow_template_tasks;
CREATE TRIGGER set_workflow_template_tasks_updated_at
  BEFORE UPDATE ON public.workflow_template_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_task_instances_updated_at ON public.task_instances;
CREATE TRIGGER set_task_instances_updated_at
  BEFORE UPDATE ON public.task_instances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 8. Seed Data: 4 Workflow Templates
-- ============================================================

-- Template 1: Opportunity Intake
INSERT INTO public.workflow_templates (id, name, description, project_type, trigger_event, trigger_table, trigger_column, trigger_value, is_active, sort_order, status)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Opportunity Intake',
  'Auto-generated tasks when a new opportunity is created. Covers intake review, GIS enrichment, feasibility, and land committee presentation.',
  'all',
  'opportunity.created',
  'opportunities',
  'status',
  'new',
  true,
  1,
  'Active'
);

-- Template 1 Tasks
INSERT INTO public.workflow_template_tasks (id, template_id, name, description, phase, assigned_role, due_days, due_reference, is_gate, sort_order)
VALUES
  -- Phase: Intake
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Review Opportunity', 'Review incoming opportunity details, verify data quality, and confirm initial fit.', 'Intake', 'acq_mgr', 1, 'trigger_date', false, 1),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Run GIS Enrichment', 'Run GIS data enrichment to gather parcel info, flood zone, zoning, and nearby comps.', 'Intake', 'acq_mgr', 1, 'trigger_date', false, 2),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Duplicate Check', 'Check for duplicate opportunities in the pipeline to avoid redundant work.', 'Intake', 'acq_mgr', 1, 'trigger_date', false, 3),
  -- Phase: Analysis
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Run Feasibility Analysis', 'Complete financial feasibility analysis including ARV, acquisition cost, and estimated margins.', 'Analysis', 'acq_mgr', 3, 'trigger_date', false, 4),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Present to Land Committee', 'Prepare and deliver presentation to the land committee for go/no-go decision.', 'Analysis', 'acq_mgr', 5, 'trigger_date', false, 5),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Decision: Pursue/Archive', 'Principal makes final decision to pursue the opportunity or archive it.', 'Analysis', 'principal', 7, 'trigger_date', true, 6);

-- Template 2: Due Diligence
INSERT INTO public.workflow_templates (id, name, description, project_type, trigger_event, trigger_table, trigger_column, trigger_value, is_active, sort_order, status)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'Due Diligence',
  'Comprehensive due diligence workflow triggered when an opportunity moves to DD status. Covers title, survey, environmental, zoning, and final underwriting.',
  'all',
  'opportunity.status:dd',
  'opportunities',
  'status',
  'dd',
  true,
  2,
  'Active'
);

-- Template 2 Tasks
INSERT INTO public.workflow_template_tasks (id, template_id, name, description, phase, assigned_role, due_days, due_reference, is_gate, sort_order)
VALUES
  -- Phase: Title & Survey
  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000002', 'Order Title Search', 'Order title search from title company to identify liens, easements, and encumbrances.', 'Title & Survey', 'closing_coordinator', 2, 'trigger_date', false, 1),
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000002', 'Order Survey', 'Order boundary and topographic survey of the property.', 'Title & Survey', 'closing_coordinator', 2, 'trigger_date', false, 2),
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000002', 'Review Title Commitment', 'Principal reviews title commitment for any issues that could affect closing.', 'Title & Survey', 'principal', 7, 'trigger_date', false, 3),
  ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000002', 'Review Survey', 'Project manager reviews survey results for setbacks, easements, and buildable area.', 'Title & Survey', 'pm', 7, 'trigger_date', false, 4),
  -- Phase: Environmental & Geotech
  ('b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000002', 'Order Soil Testing', 'Order geotechnical soil testing to assess foundation requirements.', 'Environmental & Geotech', 'pm', 3, 'trigger_date', false, 5),
  ('b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000002', 'Environmental Review', 'Complete environmental review including Phase I ESA if required.', 'Environmental & Geotech', 'pm', 5, 'trigger_date', false, 6),
  -- Phase: Zoning & Permits
  ('b0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000002', 'Verify Zoning Compliance', 'Verify that intended use complies with current zoning regulations.', 'Zoning & Permits', 'acq_mgr', 3, 'trigger_date', false, 7),
  ('b0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000002', 'Pre-Application Meeting', 'Schedule and attend pre-application meeting with local planning department.', 'Zoning & Permits', 'acq_mgr', 7, 'trigger_date', false, 8),
  -- Phase: Financial
  ('b0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000002', 'Final Underwriting', 'Complete final underwriting with updated numbers from DD findings.', 'Financial', 'principal', 10, 'trigger_date', true, 9),
  ('b0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000002', 'DD Decision: Proceed/Terminate', 'Principal makes final DD decision to proceed to closing or terminate the deal.', 'Financial', 'principal', 14, 'trigger_date', true, 10);

-- Template 3: Pre-Construction Readiness
INSERT INTO public.workflow_templates (id, name, description, project_type, trigger_event, trigger_table, trigger_column, trigger_value, is_active, sort_order, status)
VALUES (
  'a0000000-0000-0000-0000-000000000003',
  'Pre-Construction Readiness',
  'Pre-construction preparation workflow triggered when a job moves to pre_construction status. Covers plan selection, permitting, estimating, and pre-con checklist.',
  'scattered_lot',
  'job.status:pre_construction',
  'jobs',
  'status',
  'pre_construction',
  true,
  3,
  'Active'
);

-- Template 3 Tasks
INSERT INTO public.workflow_template_tasks (id, template_id, name, description, phase, assigned_role, due_days, due_reference, is_gate, sort_order)
VALUES
  -- Phase: Plan & Selections
  ('b0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000003', 'Assign Floor Plan', 'Assign the floor plan to the job based on lot characteristics and buyer selections.', 'Plan & Selections', 'director', 2, 'trigger_date', false, 1),
  ('b0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000003', 'Lock Selections', 'Lock all buyer/builder selections (finishes, fixtures, options) before sending to estimator.', 'Plan & Selections', 'director', 5, 'trigger_date', true, 2),
  ('b0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000003', 'Send to Sterling', 'Send locked plans and selections to Sterling for takeoff and estimating.', 'Plan & Selections', 'pm', 7, 'trigger_date', false, 3),
  -- Phase: Permits
  ('b0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000003', 'Submit Permit Application', 'Submit building permit application to the local jurisdiction.', 'Permits', 'pm', 3, 'trigger_date', false, 4),
  ('b0000000-0000-0000-0000-000000000024', 'a0000000-0000-0000-0000-000000000003', 'Track Permit Status', 'Monitor and follow up on permit application status with the jurisdiction.', 'Permits', 'pm', 30, 'trigger_date', false, 5),
  ('b0000000-0000-0000-0000-000000000025', 'a0000000-0000-0000-0000-000000000003', 'Permit Received', 'Confirm building permit has been received and is ready for construction start.', 'Permits', 'pm', 45, 'trigger_date', true, 6),
  -- Phase: Estimating
  ('b0000000-0000-0000-0000-000000000026', 'a0000000-0000-0000-0000-000000000003', 'Review Sterling Estimate', 'Review the Sterling estimate for accuracy, completeness, and budget alignment.', 'Estimating', 'pm', 10, 'trigger_date', false, 7),
  ('b0000000-0000-0000-0000-000000000027', 'a0000000-0000-0000-0000-000000000003', 'Approve Budget', 'Director approves the final construction budget before pre-con meeting.', 'Estimating', 'director', 12, 'trigger_date', true, 8),
  -- Phase: Pre-Con Checklist
  ('b0000000-0000-0000-0000-000000000028', 'a0000000-0000-0000-0000-000000000003', 'Confirm Utility Availability', 'Confirm all utilities (water, sewer, electric, gas) are available at the lot.', 'Pre-Con Checklist', 'pm', 5, 'trigger_date', false, 9),
  ('b0000000-0000-0000-0000-000000000029', 'a0000000-0000-0000-0000-000000000003', 'Schedule Pre-Con Meeting', 'Schedule the pre-construction meeting with all key stakeholders.', 'Pre-Con Checklist', 'pm', 7, 'trigger_date', false, 10),
  ('b0000000-0000-0000-0000-000000000030', 'a0000000-0000-0000-0000-000000000003', 'Pre-Con Complete', 'Mark pre-construction phase as complete, ready for construction start.', 'Pre-Con Checklist', 'pm', 14, 'trigger_date', true, 11);

-- Template 4: Construction Execution
INSERT INTO public.workflow_templates (id, name, description, project_type, trigger_event, trigger_table, trigger_column, trigger_value, is_active, sort_order, status)
VALUES (
  'a0000000-0000-0000-0000-000000000004',
  'Construction Execution',
  'Full construction execution workflow triggered when a job moves to in_progress. Covers site work through final inspection and CO.',
  'all',
  'job.status:in_progress',
  'jobs',
  'status',
  'in_progress',
  true,
  4,
  'Active'
);

-- Template 4 Tasks
INSERT INTO public.workflow_template_tasks (id, template_id, name, description, phase, assigned_role, due_days, due_reference, is_gate, sort_order)
VALUES
  -- Phase: Site Work
  ('b0000000-0000-0000-0000-000000000040', 'a0000000-0000-0000-0000-000000000004', 'Mobilization', 'Mobilize equipment, materials, and temporary facilities to the job site.', 'Site Work', 'pm', 3, 'trigger_date', false, 1),
  ('b0000000-0000-0000-0000-000000000041', 'a0000000-0000-0000-0000-000000000004', 'Clearing & Grading', 'Clear the lot and grade to design elevations.', 'Site Work', 'pm', 7, 'trigger_date', false, 2),
  ('b0000000-0000-0000-0000-000000000042', 'a0000000-0000-0000-0000-000000000004', 'Foundation Layout', 'Lay out foundation per engineered plans, confirm setbacks and elevations.', 'Site Work', 'pm', 10, 'trigger_date', false, 3),
  -- Phase: Foundation
  ('b0000000-0000-0000-0000-000000000043', 'a0000000-0000-0000-0000-000000000004', 'Footer Inspection', 'Schedule and pass footer/footing inspection before pour.', 'Foundation', 'pm', 14, 'trigger_date', true, 4),
  ('b0000000-0000-0000-0000-000000000044', 'a0000000-0000-0000-0000-000000000004', 'Pour Foundation', 'Pour foundation walls and/or slab per structural plans.', 'Foundation', 'pm', 18, 'trigger_date', false, 5),
  ('b0000000-0000-0000-0000-000000000045', 'a0000000-0000-0000-0000-000000000004', 'Foundation Backfill', 'Backfill foundation, install waterproofing and drainage as required.', 'Foundation', 'pm', 21, 'trigger_date', false, 6),
  -- Phase: Framing
  ('b0000000-0000-0000-0000-000000000046', 'a0000000-0000-0000-0000-000000000004', 'Framing Start', 'Begin framing — floor system, walls, and roof structure.', 'Framing', 'pm', 25, 'trigger_date', false, 7),
  ('b0000000-0000-0000-0000-000000000047', 'a0000000-0000-0000-0000-000000000004', 'Framing Complete', 'Complete all framing including sheathing, windows, and exterior doors.', 'Framing', 'pm', 40, 'trigger_date', false, 8),
  ('b0000000-0000-0000-0000-000000000048', 'a0000000-0000-0000-0000-000000000004', 'Framing Inspection', 'Schedule and pass framing inspection before closing walls.', 'Framing', 'pm', 42, 'trigger_date', true, 9),
  -- Phase: Rough-Ins
  ('b0000000-0000-0000-0000-000000000049', 'a0000000-0000-0000-0000-000000000004', 'Plumbing Rough', 'Complete rough plumbing installation per plans.', 'Rough-Ins', 'pm', 48, 'trigger_date', false, 10),
  ('b0000000-0000-0000-0000-000000000050', 'a0000000-0000-0000-0000-000000000004', 'HVAC Rough', 'Complete rough HVAC installation including ductwork and line sets.', 'Rough-Ins', 'pm', 48, 'trigger_date', false, 11),
  ('b0000000-0000-0000-0000-000000000051', 'a0000000-0000-0000-0000-000000000004', 'Electrical Rough', 'Complete rough electrical installation per plans and code.', 'Rough-Ins', 'pm', 48, 'trigger_date', false, 12),
  ('b0000000-0000-0000-0000-000000000052', 'a0000000-0000-0000-0000-000000000004', 'Rough Inspection', 'Schedule and pass rough inspection (plumbing, HVAC, electrical).', 'Rough-Ins', 'pm', 52, 'trigger_date', true, 13),
  -- Phase: Finishes
  ('b0000000-0000-0000-0000-000000000053', 'a0000000-0000-0000-0000-000000000004', 'Insulation', 'Install insulation per energy code and specifications.', 'Finishes', 'pm', 55, 'trigger_date', false, 14),
  ('b0000000-0000-0000-0000-000000000054', 'a0000000-0000-0000-0000-000000000004', 'Drywall', 'Hang, tape, and finish drywall throughout the home.', 'Finishes', 'pm', 62, 'trigger_date', false, 15),
  ('b0000000-0000-0000-0000-000000000055', 'a0000000-0000-0000-0000-000000000004', 'Interior Trim', 'Install interior trim — baseboards, casing, crown, and millwork.', 'Finishes', 'pm', 70, 'trigger_date', false, 16),
  ('b0000000-0000-0000-0000-000000000056', 'a0000000-0000-0000-0000-000000000004', 'Paint', 'Complete interior and exterior painting per selections.', 'Finishes', 'pm', 75, 'trigger_date', false, 17),
  ('b0000000-0000-0000-0000-000000000057', 'a0000000-0000-0000-0000-000000000004', 'Flooring', 'Install all flooring — hardwood, tile, carpet, LVP per selections.', 'Finishes', 'pm', 80, 'trigger_date', false, 18),
  ('b0000000-0000-0000-0000-000000000058', 'a0000000-0000-0000-0000-000000000004', 'Cabinets & Counters', 'Install cabinets, countertops, and hardware per selections.', 'Finishes', 'pm', 85, 'trigger_date', false, 19),
  -- Phase: Completion
  ('b0000000-0000-0000-0000-000000000059', 'a0000000-0000-0000-0000-000000000004', 'Final Mechanical', 'Complete final mechanical installations — fixtures, trim plates, HVAC startup.', 'Completion', 'pm', 90, 'trigger_date', false, 20),
  ('b0000000-0000-0000-0000-000000000060', 'a0000000-0000-0000-0000-000000000004', 'Landscaping', 'Complete landscaping — grading, sod/seed, plantings, hardscape.', 'Completion', 'pm', 95, 'trigger_date', false, 21),
  ('b0000000-0000-0000-0000-000000000061', 'a0000000-0000-0000-0000-000000000004', 'Final Clean', 'Complete construction clean — remove debris, detail clean interior.', 'Completion', 'pm', 98, 'trigger_date', false, 22),
  ('b0000000-0000-0000-0000-000000000062', 'a0000000-0000-0000-0000-000000000004', 'Punch List', 'Walk the home and document all punch list items for correction.', 'Completion', 'pm', 100, 'trigger_date', false, 23),
  ('b0000000-0000-0000-0000-000000000063', 'a0000000-0000-0000-0000-000000000004', 'Final Inspection', 'Schedule and pass final building inspection.', 'Completion', 'pm', 105, 'trigger_date', true, 24),
  ('b0000000-0000-0000-0000-000000000064', 'a0000000-0000-0000-0000-000000000004', 'CO Received', 'Receive Certificate of Occupancy from the jurisdiction.', 'Completion', 'pm', 110, 'trigger_date', true, 25);

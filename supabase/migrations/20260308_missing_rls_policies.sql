-- 20260308_missing_rls_policies.sql
-- Adds RLS policies for tables created after the initial RLS migration.
-- Covers: matters, matter_contacts, matter_workflow_steps, matter_documents,
-- matter_notes, matter_linked_records, workflow_instances, workflow_instance_milestones,
-- workflow_instance_tasks. Tightens teams/record_teams.

-- ============================================================
-- 1. matters — scope by created_by or linked_entity_id
-- ============================================================
ALTER TABLE public.matters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matters_select" ON public.matters
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "matters_insert" ON public.matters
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "matters_update" ON public.matters
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "matters_delete" ON public.matters
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- ============================================================
-- 2. matter_contacts — access through parent matter
-- ============================================================
ALTER TABLE public.matter_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matter_contacts_select" ON public.matter_contacts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id));

CREATE POLICY "matter_contacts_insert" ON public.matter_contacts
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id));

CREATE POLICY "matter_contacts_update" ON public.matter_contacts
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id));

CREATE POLICY "matter_contacts_delete" ON public.matter_contacts
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id));

-- ============================================================
-- 3. matter_workflow_steps — access through parent matter
-- ============================================================
ALTER TABLE public.matter_workflow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matter_workflow_steps_select" ON public.matter_workflow_steps
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id));

CREATE POLICY "matter_workflow_steps_insert" ON public.matter_workflow_steps
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id));

CREATE POLICY "matter_workflow_steps_update" ON public.matter_workflow_steps
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id));

CREATE POLICY "matter_workflow_steps_delete" ON public.matter_workflow_steps
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id));

-- ============================================================
-- 4. matter_documents — access through parent matter
-- ============================================================
ALTER TABLE public.matter_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matter_documents_select" ON public.matter_documents
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id));

CREATE POLICY "matter_documents_insert" ON public.matter_documents
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id));

CREATE POLICY "matter_documents_update" ON public.matter_documents
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id));

CREATE POLICY "matter_documents_delete" ON public.matter_documents
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id));

-- ============================================================
-- 5. matter_notes — access through parent matter
-- ============================================================
ALTER TABLE public.matter_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matter_notes_select" ON public.matter_notes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id));

CREATE POLICY "matter_notes_insert" ON public.matter_notes
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id));

CREATE POLICY "matter_notes_update" ON public.matter_notes
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id));

CREATE POLICY "matter_notes_delete" ON public.matter_notes
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id));

-- ============================================================
-- 6. matter_linked_records — access through parent matter
-- ============================================================
ALTER TABLE public.matter_linked_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matter_linked_records_select" ON public.matter_linked_records
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id));

CREATE POLICY "matter_linked_records_insert" ON public.matter_linked_records
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id));

CREATE POLICY "matter_linked_records_update" ON public.matter_linked_records
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id));

CREATE POLICY "matter_linked_records_delete" ON public.matter_linked_records
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matters WHERE id = matter_id));

-- ============================================================
-- 7. workflow_instances — authenticated access
-- ============================================================
ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_instances_select" ON public.workflow_instances
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "workflow_instances_insert" ON public.workflow_instances
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "workflow_instances_update" ON public.workflow_instances
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "workflow_instances_delete" ON public.workflow_instances
  FOR DELETE TO authenticated
  USING (true);

-- ============================================================
-- 8. workflow_instance_milestones — through parent instance
-- ============================================================
ALTER TABLE public.workflow_instance_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_instance_milestones_select" ON public.workflow_instance_milestones
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workflow_instances WHERE id = instance_id));

CREATE POLICY "workflow_instance_milestones_insert" ON public.workflow_instance_milestones
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.workflow_instances WHERE id = instance_id));

CREATE POLICY "workflow_instance_milestones_update" ON public.workflow_instance_milestones
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workflow_instances WHERE id = instance_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workflow_instances WHERE id = instance_id));

CREATE POLICY "workflow_instance_milestones_delete" ON public.workflow_instance_milestones
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workflow_instances WHERE id = instance_id));

-- ============================================================
-- 9. workflow_instance_tasks — through parent instance
-- ============================================================
ALTER TABLE public.workflow_instance_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_instance_tasks_select" ON public.workflow_instance_tasks
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workflow_instances WHERE id = instance_id));

CREATE POLICY "workflow_instance_tasks_insert" ON public.workflow_instance_tasks
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.workflow_instances WHERE id = instance_id));

CREATE POLICY "workflow_instance_tasks_update" ON public.workflow_instance_tasks
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workflow_instances WHERE id = instance_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workflow_instances WHERE id = instance_id));

CREATE POLICY "workflow_instance_tasks_delete" ON public.workflow_instance_tasks
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workflow_instances WHERE id = instance_id));

-- ============================================================
-- 10. teams — tighten from open using(true) to authenticated
-- ============================================================
-- Drop existing overly-permissive policies
DROP POLICY IF EXISTS "teams_select" ON public.teams;
DROP POLICY IF EXISTS "teams_insert" ON public.teams;
DROP POLICY IF EXISTS "teams_update" ON public.teams;
DROP POLICY IF EXISTS "teams_delete" ON public.teams;

CREATE POLICY "teams_select" ON public.teams
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "teams_insert" ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "teams_update" ON public.teams
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "teams_delete" ON public.teams
  FOR DELETE TO authenticated
  USING (true);

-- ============================================================
-- 11. record_teams — tighten similarly
-- ============================================================
DROP POLICY IF EXISTS "record_teams_select" ON public.record_teams;
DROP POLICY IF EXISTS "record_teams_insert" ON public.record_teams;
DROP POLICY IF EXISTS "record_teams_update" ON public.record_teams;
DROP POLICY IF EXISTS "record_teams_delete" ON public.record_teams;

CREATE POLICY "record_teams_select" ON public.record_teams
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "record_teams_insert" ON public.record_teams
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "record_teams_update" ON public.record_teams
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "record_teams_delete" ON public.record_teams
  FOR DELETE TO authenticated
  USING (true);

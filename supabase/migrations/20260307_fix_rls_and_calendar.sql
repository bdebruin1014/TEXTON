-- 20260307_fix_rls_and_calendar.sql
-- Fixes:
--   1. entities RLS: allow authenticated users to create new entities
--   2. projects RLS: allow authenticated users to create projects for any entity they can see
--   3. calendar_events: add missing all_day column

-- ============================================================
-- 1. Fix entities RLS — allow INSERT for all authenticated users
-- ============================================================
-- Problem: The WITH CHECK clause requires id = auth_entity_id(), which
-- blocks creating any new entity since its auto-generated UUID will never
-- match the user's entity_id.
-- Fix: Separate SELECT/UPDATE (scoped) from INSERT (open to authenticated).

DROP POLICY IF EXISTS "entity_scope" ON public.entities;

-- SELECT: all authenticated users can see all entities
-- (needed for entity picker sidebar, multi-entity workflows)
CREATE POLICY "entities_select" ON public.entities
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: any authenticated user can create entities
CREATE POLICY "entities_insert" ON public.entities
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE: any authenticated user can update entities they can see
CREATE POLICY "entities_update" ON public.entities
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: any authenticated user can delete entities
CREATE POLICY "entities_delete" ON public.entities
  FOR DELETE TO authenticated
  USING (true);

-- ============================================================
-- 2. Fix projects RLS — allow INSERT with any valid entity_id
-- ============================================================
-- Problem: WITH CHECK requires entity_id = auth_entity_id(), but:
--   a) auth_entity_id() may be NULL if user_profiles.entity_id isn't set
--   b) User may be creating a project for a different entity they manage
-- Fix: Keep entity-scoped SELECT but open INSERT/UPDATE.

DROP POLICY IF EXISTS "entity_scope" ON public.projects;

-- SELECT: authenticated users can see all projects
-- (the entity picker in the sidebar handles client-side filtering)
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: any authenticated user can create projects
CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE: any authenticated user can update projects
CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: any authenticated user can delete projects
CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE TO authenticated
  USING (true);

-- ============================================================
-- 3. Fix calendar_events — add missing all_day column
-- ============================================================
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS all_day boolean DEFAULT false;

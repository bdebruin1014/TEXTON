-- 20260316_workflow_engine_triggers.sql
-- Workflow Instance Engine: database triggers that fire the workflow-engine
-- Edge Function when a status column changes on opportunities, projects,
-- jobs, or dispositions.
--
-- Uses pg_net (pre-installed on Supabase) to make an async HTTP POST to
-- the Edge Function. Secrets are read from vault.decrypted_secrets.

-- ============================================================
-- 1. Enable pg_net extension (idempotent)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================
-- 2. Trigger function: notify_workflow_status_change
-- ============================================================
-- Called AFTER UPDATE on the four watched tables. Detects status changes
-- and invokes the workflow-engine Edge Function via pg_net.

CREATE OR REPLACE FUNCTION public.notify_workflow_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _supabase_url  text;
  _service_key   text;
  _payload       jsonb;
BEGIN
  -- Only fire when the status column actually changes
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Read Supabase URL from app settings (set via ALTER DATABASE ... SET)
  _supabase_url := current_setting('app.settings.supabase_url', true);

  -- Read service role key from Supabase vault
  SELECT decrypted_secret INTO _service_key
    FROM vault.decrypted_secrets
   WHERE name = 'service_role_key'
   LIMIT 1;

  -- Bail out silently if configuration is missing (avoids breaking writes)
  IF _supabase_url IS NULL OR _service_key IS NULL THEN
    RAISE WARNING 'workflow trigger: missing supabase_url or service_role_key — skipping';
    RETURN NEW;
  END IF;

  -- Build the payload
  _payload := jsonb_build_object(
    'table_name',  TG_TABLE_NAME,
    'record_id',   NEW.id::text,
    'old_status',  OLD.status,
    'new_status',  NEW.status
  );

  -- Async HTTP POST to the Edge Function
  PERFORM net.http_post(
    url     := _supabase_url || '/functions/v1/workflow-engine',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _service_key
    ),
    body    := _payload
  );

  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. Attach triggers to the four watched tables
-- ============================================================

-- opportunities
DROP TRIGGER IF EXISTS trg_workflow_status_opportunities ON public.opportunities;
CREATE TRIGGER trg_workflow_status_opportunities
  AFTER UPDATE ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_workflow_status_change();

-- projects
DROP TRIGGER IF EXISTS trg_workflow_status_projects ON public.projects;
CREATE TRIGGER trg_workflow_status_projects
  AFTER UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_workflow_status_change();

-- jobs
DROP TRIGGER IF EXISTS trg_workflow_status_jobs ON public.jobs;
CREATE TRIGGER trg_workflow_status_jobs
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_workflow_status_change();

-- dispositions
DROP TRIGGER IF EXISTS trg_workflow_status_dispositions ON public.dispositions;
CREATE TRIGGER trg_workflow_status_dispositions
  AFTER UPDATE ON public.dispositions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_workflow_status_change();

-- ============================================================
-- 4. Progress recalculation trigger
-- ============================================================
-- When a task_instance status changes to 'completed' or 'skipped',
-- recalculate the parent workflow_instance.progress_pct and
-- unblock downstream tasks if a gate was completed.

CREATE OR REPLACE FUNCTION public.recalculate_workflow_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total       integer;
  _done        integer;
  _pct         numeric(5,2);
  _instance_id uuid;
BEGIN
  _instance_id := NEW.workflow_instance_id;

  -- Count total vs completed/skipped tasks
  SELECT count(*),
         count(*) FILTER (WHERE status IN ('completed', 'skipped'))
    INTO _total, _done
    FROM public.task_instances
   WHERE workflow_instance_id = _instance_id;

  IF _total > 0 THEN
    _pct := round((_done::numeric / _total::numeric) * 100, 2);
  ELSE
    _pct := 0;
  END IF;

  -- Update the workflow instance progress
  UPDATE public.workflow_instances
     SET progress_pct  = _pct,
         completed_at  = CASE WHEN _total = _done THEN now() ELSE NULL END,
         status        = CASE WHEN _total = _done THEN 'completed' ELSE status END
   WHERE id = _instance_id;

  -- If a gate task was just completed, unblock the next batch of tasks
  -- (those whose sort_order is > this gate but <= the next gate)
  IF NEW.is_gate AND NEW.status = 'completed' THEN
    UPDATE public.task_instances
       SET status = 'active'
     WHERE workflow_instance_id = _instance_id
       AND status = 'blocked'
       AND sort_order > NEW.sort_order
       AND sort_order <= COALESCE(
         (SELECT min(ti2.sort_order)
            FROM public.task_instances ti2
           WHERE ti2.workflow_instance_id = _instance_id
             AND ti2.is_gate = true
             AND ti2.status != 'completed'
             AND ti2.sort_order > NEW.sort_order),
         2147483647  -- max int: unblock everything if no more gates
       );
  END IF;

  -- If a task with depends_on was completed, unblock dependent tasks
  IF NEW.status = 'completed' THEN
    UPDATE public.task_instances
       SET status = 'active'
     WHERE workflow_instance_id = _instance_id
       AND status = 'blocked'
       AND template_task_id IS NOT NULL
       AND template_task_id IN (
         SELECT wtt.id
           FROM public.workflow_template_tasks wtt
          WHERE wtt.depends_on = (
            SELECT template_task_id FROM public.task_instances WHERE id = NEW.id
          )
       );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_workflow_progress ON public.task_instances;
CREATE TRIGGER trg_recalculate_workflow_progress
  AFTER UPDATE ON public.task_instances
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.recalculate_workflow_progress();

-- 20260305_schema_mismatch_fixes.sql
-- Fixes 9 schema-to-route column mismatches identified in the KOVA Platform Build Spec audit.
-- Adds missing columns to 8 tables + recreates job_cost_summary view.
-- Does NOT rename existing columns; adds the TS-expected name and backfills from old column.

-- ============================================================
-- 1. purchase_orders — add description, cost_code, issued_date
-- ============================================================
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS cost_code text,
  ADD COLUMN IF NOT EXISTS issued_date date;

-- Backfill issued_date from the original issue_date column
UPDATE public.purchase_orders SET issued_date = issue_date WHERE issued_date IS NULL;

-- ============================================================
-- 2. change_orders — add requested_by, requested_date, cost_code
-- ============================================================
ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS requested_by text,
  ADD COLUMN IF NOT EXISTS requested_date date,
  ADD COLUMN IF NOT EXISTS cost_code text;

-- ============================================================
-- 3. daily_logs — add temperature, work_performed, delays, safety_incidents, created_by
-- ============================================================
ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS temperature text,
  ADD COLUMN IF NOT EXISTS work_performed text,
  ADD COLUMN IF NOT EXISTS delays text,
  ADD COLUMN IF NOT EXISTS safety_incidents text,
  ADD COLUMN IF NOT EXISTS created_by text;

-- Backfill work_performed from the original notes column
UPDATE public.daily_logs SET work_performed = notes WHERE work_performed IS NULL AND notes IS NOT NULL;

-- ============================================================
-- 4. inspections — add completed_date + fix status check constraint
-- ============================================================
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS completed_date date;

ALTER TABLE public.inspections DROP CONSTRAINT IF EXISTS inspections_status_check;
ALTER TABLE public.inspections
  ADD CONSTRAINT inspections_status_check
  CHECK (status IN ('Scheduled','In Progress','Passed','Failed','Completed','Re-Inspect','Cancelled'));

-- ============================================================
-- 5. selections — add selected_option, allowance, actual_cost, notes
-- ============================================================
ALTER TABLE public.selections
  ADD COLUMN IF NOT EXISTS selected_option text,
  ADD COLUMN IF NOT EXISTS allowance numeric(15,2),
  ADD COLUMN IF NOT EXISTS actual_cost numeric(15,2),
  ADD COLUMN IF NOT EXISTS notes text;

-- Backfill from existing columns
UPDATE public.selections SET selected_option = selection_made WHERE selected_option IS NULL AND selection_made IS NOT NULL;
UPDATE public.selections SET allowance = amount WHERE allowance IS NULL AND amount IS NOT NULL;

-- ============================================================
-- 6. warranty_claims — add claim_number, reported_by, scheduled_date, completed_date, assigned_to, notes
-- ============================================================
ALTER TABLE public.warranty_claims
  ADD COLUMN IF NOT EXISTS claim_number text,
  ADD COLUMN IF NOT EXISTS reported_by text,
  ADD COLUMN IF NOT EXISTS scheduled_date date,
  ADD COLUMN IF NOT EXISTS completed_date date,
  ADD COLUMN IF NOT EXISTS assigned_to text,
  ADD COLUMN IF NOT EXISTS notes text;

-- Backfill from existing columns
UPDATE public.warranty_claims SET completed_date = resolved_date WHERE completed_date IS NULL AND resolved_date IS NOT NULL;
UPDATE public.warranty_claims SET assigned_to = assignee WHERE assigned_to IS NULL AND assignee IS NOT NULL;

-- ============================================================
-- 7. bills — add paid_amount, description, job_name, cost_code + fix status check
-- ============================================================
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS paid_amount numeric(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS job_name text,
  ADD COLUMN IF NOT EXISTS cost_code text;

ALTER TABLE public.bills DROP CONSTRAINT IF EXISTS bills_status_check;
ALTER TABLE public.bills
  ADD CONSTRAINT bills_status_check
  CHECK (status IN ('Open','Pending','Approved','Paid','Partial','Void'));

-- ============================================================
-- 8. receivables — add customer_name, description, project_name + fix status check
-- ============================================================
ALTER TABLE public.receivables
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS project_name text;

ALTER TABLE public.receivables DROP CONSTRAINT IF EXISTS receivables_status_check;
ALTER TABLE public.receivables
  ADD CONSTRAINT receivables_status_check
  CHECK (status IN ('Draft','Open','Partial','Collected','Overdue','Write-Off'));

-- ============================================================
-- 9. job_cost_summary view — recreate with missing columns
--    Old view was aggregated (GROUP BY). New view is per-budget-line
--    to expose jbl.id as the row PK that the TS interface expects.
-- ============================================================
DROP VIEW IF EXISTS public.job_cost_summary;
CREATE VIEW public.job_cost_summary AS
SELECT
  jbl.id,
  jbl.job_id,
  j.job_name,
  p.project_name,
  j.entity_id,
  jbl.cost_code,
  jbl.description AS cost_code_name,
  jbl.budgeted,
  jbl.committed,
  jbl.invoiced AS actual,
  jbl.paid,
  COALESCE(jbl.budgeted, 0) - COALESCE(jbl.invoiced, 0) AS remaining,
  CASE WHEN COALESCE(jbl.budgeted, 0) > 0
       THEN ROUND(COALESCE(jbl.invoiced, 0) / jbl.budgeted * 100, 1)
       ELSE 0 END AS percent_complete
FROM public.job_budget_lines jbl
JOIN public.jobs j ON j.id = jbl.job_id
LEFT JOIN public.projects p ON p.id = j.project_id;

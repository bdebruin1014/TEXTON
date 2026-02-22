-- 20260309_investor_schema_fixes.sql
-- Add missing columns referenced by the investors module UI

-- ============================================================
-- funds: add vintage_year, preferred_return, promote_structure
-- ============================================================
ALTER TABLE public.funds
  ADD COLUMN IF NOT EXISTS vintage_year integer,
  ADD COLUMN IF NOT EXISTS preferred_return numeric(5,2),
  ADD COLUMN IF NOT EXISTS promote_structure text;

-- ============================================================
-- capital_calls: add due_date, purpose
-- ============================================================
ALTER TABLE public.capital_calls
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS purpose text;

-- ============================================================
-- distributions: add distribution_type, waterfall_tier
-- ============================================================
ALTER TABLE public.distributions
  ADD COLUMN IF NOT EXISTS distribution_type text,
  ADD COLUMN IF NOT EXISTS waterfall_tier text;

-- ============================================================
-- updated_at triggers (already exist on these tables, skip if present)
-- ============================================================

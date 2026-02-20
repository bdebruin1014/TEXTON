-- Migration: Create deal_sheets table for SL Deal Analyzer
-- Scattered lot only: one lot, one house, one sale.

-- ---------------------------------------------------------------------------
-- deal_sheets table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.deal_sheets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id  uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  project_id      uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by      uuid NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Status
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  recommendation  text CHECK (recommendation IN ('GO', 'NO_GO', 'CONDITIONAL')),

  -- Inputs (structured JSON)
  inputs          jsonb NOT NULL DEFAULT '{}',

  -- Computed results snapshot (written by app after calculation)
  results         jsonb NOT NULL DEFAULT '{}',
  sensitivity     jsonb NOT NULL DEFAULT '{}',

  -- Notes
  notes           text
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deal_sheets_opportunity ON public.deal_sheets(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_deal_sheets_project ON public.deal_sheets(project_id);
CREATE INDEX IF NOT EXISTS idx_deal_sheets_status ON public.deal_sheets(status);
CREATE INDEX IF NOT EXISTS idx_deal_sheets_created_by ON public.deal_sheets(created_by);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deal_sheets_updated_at ON public.deal_sheets;
CREATE TRIGGER trg_deal_sheets_updated_at
  BEFORE UPDATE ON public.deal_sheets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Audit trigger
DROP TRIGGER IF EXISTS trg_deal_sheets_audit ON public.deal_sheets;
CREATE TRIGGER trg_deal_sheets_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.deal_sheets
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- RLS
ALTER TABLE public.deal_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deal sheets they created or are org members"
  ON public.deal_sheets FOR SELECT
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert deal sheets"
  ON public.deal_sheets FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own deal sheets"
  ON public.deal_sheets FOR UPDATE
  USING (auth.uid() = created_by);

-- ---------------------------------------------------------------------------
-- municipality_fee_schedules table (admin-configurable)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.municipality_fee_schedules (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  county            text NOT NULL,
  state             text NOT NULL CHECK (state IN ('SC', 'NC')),

  -- Fee categories
  water_tap         numeric(10,2) NOT NULL DEFAULT 0,
  water_capacity    numeric(10,2) NOT NULL DEFAULT 0,
  sewer_tap         numeric(10,2) NOT NULL DEFAULT 0,
  sewer_capacity    numeric(10,2) NOT NULL DEFAULT 0,
  building_permit   numeric(10,2) NOT NULL DEFAULT 0,
  trade_permits     numeric(10,2) NOT NULL DEFAULT 0,
  impact_fees       numeric(10,2) NOT NULL DEFAULT 0,
  other_fees        numeric(10,2) NOT NULL DEFAULT 0,
  total_estimated   numeric(10,2) GENERATED ALWAYS AS (
    water_tap + water_capacity + sewer_tap + sewer_capacity +
    building_permit + trade_permits + impact_fees + other_fees
  ) STORED,

  -- Meta
  must_verify       boolean NOT NULL DEFAULT true,
  notes             text,
  last_verified     date,
  contacts          text[],

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE(name, state)
);

CREATE INDEX IF NOT EXISTS idx_municipality_fees_state ON public.municipality_fee_schedules(state);

DROP TRIGGER IF EXISTS trg_municipality_fees_updated_at ON public.municipality_fee_schedules;
CREATE TRIGGER trg_municipality_fees_updated_at
  BEFORE UPDATE ON public.municipality_fee_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.municipality_fee_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view municipality fees"
  ON public.municipality_fee_schedules FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage municipality fees"
  ON public.municipality_fee_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.user_id = auth.uid()
      AND org_members.role IN ('admin', 'owner')
    )
  );

-- Grant access
GRANT SELECT ON public.deal_sheets TO authenticated;
GRANT INSERT, UPDATE ON public.deal_sheets TO authenticated;
GRANT SELECT ON public.municipality_fee_schedules TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.municipality_fee_schedules TO authenticated;

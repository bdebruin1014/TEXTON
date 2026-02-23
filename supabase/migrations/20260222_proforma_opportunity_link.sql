-- Link proforma tables to opportunities for pipeline deal sheets
-- These tables already exist; we're adding opportunity_id for pipeline integration

ALTER TABLE public.community_proformas
  ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scenario_number integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS scenario_name text,
  ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT true;

ALTER TABLE public.lot_dev_proformas
  ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scenario_number integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS scenario_name text,
  ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT true;

ALTER TABLE public.lot_purchase_proformas
  ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scenario_number integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS scenario_name text,
  ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT true;

-- Indexes for opportunity-scoped queries
CREATE INDEX IF NOT EXISTS idx_community_proformas_opportunity ON public.community_proformas(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_lot_dev_proformas_opportunity ON public.lot_dev_proformas(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_lot_purchase_proformas_opportunity ON public.lot_purchase_proformas(opportunity_id);

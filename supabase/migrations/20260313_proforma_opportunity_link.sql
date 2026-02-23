-- Link proforma tables to opportunities for pipeline deal sheets
-- Safely handles case where proforma tables may not yet exist

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'community_proformas') THEN
    ALTER TABLE public.community_proformas
      ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS scenario_number integer DEFAULT 1,
      ADD COLUMN IF NOT EXISTS scenario_name text,
      ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT true;
    CREATE INDEX IF NOT EXISTS idx_community_proformas_opportunity ON public.community_proformas(opportunity_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lot_dev_proformas') THEN
    ALTER TABLE public.lot_dev_proformas
      ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS scenario_number integer DEFAULT 1,
      ADD COLUMN IF NOT EXISTS scenario_name text,
      ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT true;
    CREATE INDEX IF NOT EXISTS idx_lot_dev_proformas_opportunity ON public.lot_dev_proformas(opportunity_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lot_purchase_proformas') THEN
    ALTER TABLE public.lot_purchase_proformas
      ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS scenario_number integer DEFAULT 1,
      ADD COLUMN IF NOT EXISTS scenario_name text,
      ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT true;
    CREATE INDEX IF NOT EXISTS idx_lot_purchase_proformas_opportunity ON public.lot_purchase_proformas(opportunity_id);
  END IF;
END $$;

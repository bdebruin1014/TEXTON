-- COA Template enhancements: additional columns, provisions log, RLS for writes

-- ============================================================
-- Add columns to coa_templates
-- ============================================================
ALTER TABLE public.coa_templates
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS account_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- Backfill slug from name (lowercase, replace spaces with hyphens)
UPDATE public.coa_templates
  SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
  WHERE slug IS NULL;

-- Backfill account_count from actual item counts
UPDATE public.coa_templates t
  SET account_count = (
    SELECT count(*) FROM public.coa_template_items i WHERE i.template_id = t.id
  );

-- ============================================================
-- Add normal_balance to coa_template_items
-- ============================================================
ALTER TABLE public.coa_template_items
  ADD COLUMN IF NOT EXISTS normal_balance text CHECK (normal_balance IN ('Debit', 'Credit'));

-- Backfill normal_balance based on account_type
UPDATE public.coa_template_items
  SET normal_balance = CASE
    WHEN account_type IN ('Asset', 'Expense') THEN 'Debit'
    ELSE 'Credit'
  END
  WHERE normal_balance IS NULL;

-- ============================================================
-- Add is_template_account to chart_of_accounts
-- ============================================================
ALTER TABLE public.chart_of_accounts
  ADD COLUMN IF NOT EXISTS is_template_account boolean NOT NULL DEFAULT false;

-- Backfill: accounts with source_template_id are template accounts
UPDATE public.chart_of_accounts
  SET is_template_account = true
  WHERE source_template_id IS NOT NULL AND is_template_account = false;

-- ============================================================
-- entity_coa_provisions (provisioning log)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.entity_coa_provisions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id        uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  template_id      uuid NOT NULL REFERENCES public.coa_templates(id) ON DELETE RESTRICT,
  variables        jsonb NOT NULL DEFAULT '{}',
  accounts_created integer NOT NULL DEFAULT 0,
  provisioned_at   timestamptz NOT NULL DEFAULT now(),
  provisioned_by   uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_entity_coa_provisions_entity ON public.entity_coa_provisions(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_coa_provisions_template ON public.entity_coa_provisions(template_id);

-- ============================================================
-- RLS on entity_coa_provisions
-- ============================================================
ALTER TABLE public.entity_coa_provisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entity_coa_provisions_select" ON public.entity_coa_provisions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "entity_coa_provisions_insert" ON public.entity_coa_provisions
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- Add write policies for coa_templates (currently only SELECT exists)
-- ============================================================
DROP POLICY IF EXISTS "coa_templates_insert" ON public.coa_templates;
CREATE POLICY "coa_templates_insert" ON public.coa_templates
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "coa_templates_update" ON public.coa_templates;
CREATE POLICY "coa_templates_update" ON public.coa_templates
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "coa_templates_delete" ON public.coa_templates;
CREATE POLICY "coa_templates_delete" ON public.coa_templates
  FOR DELETE TO authenticated USING (true);

-- Add write policies for coa_template_items
DROP POLICY IF EXISTS "coa_template_items_insert" ON public.coa_template_items;
CREATE POLICY "coa_template_items_insert" ON public.coa_template_items
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "coa_template_items_update" ON public.coa_template_items;
CREATE POLICY "coa_template_items_update" ON public.coa_template_items
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "coa_template_items_delete" ON public.coa_template_items;
CREATE POLICY "coa_template_items_delete" ON public.coa_template_items
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_coa_templates_entity_types ON public.coa_templates USING gin(entity_types);
CREATE INDEX IF NOT EXISTS idx_coa_templates_slug ON public.coa_templates(slug);
CREATE INDEX IF NOT EXISTS idx_coa_template_items_parent ON public.coa_template_items(parent_account);

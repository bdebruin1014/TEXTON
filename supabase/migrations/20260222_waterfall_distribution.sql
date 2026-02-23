-- Waterfall Distribution Schema
-- Adds waterfall tier configuration, distribution calculation snapshots,
-- and per-investor line items for waterfall distribution calculations.

-- 1A. ALTER investments: add GP flag and contribution date
ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS is_gp boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contribution_date date;

-- 1B. Waterfall tier configuration per fund
CREATE TABLE public.waterfall_tiers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id       uuid NOT NULL REFERENCES public.funds(id) ON DELETE CASCADE,
  tier_order    integer NOT NULL,
  tier_name     text NOT NULL CHECK (tier_name IN (
    'return_of_capital','preferred_return','catch_up','profit_split')),
  description   text,
  pref_rate     numeric(5,4),
  catch_up_pct  numeric(5,4),
  gp_split_pct  numeric(5,4),
  lp_split_pct  numeric(5,4),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fund_id, tier_order)
);

-- 1C. Distribution calculation snapshots
CREATE TABLE public.distribution_calculations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id   uuid NOT NULL REFERENCES public.distributions(id) ON DELETE CASCADE,
  fund_id           uuid NOT NULL REFERENCES public.funds(id) ON DELETE CASCADE,
  total_distributable numeric(15,2) NOT NULL,
  total_allocated   numeric(15,2) NOT NULL DEFAULT 0,
  input_snapshot    jsonb NOT NULL DEFAULT '{}',
  output_snapshot   jsonb NOT NULL DEFAULT '{}',
  calculated_by     uuid,
  status            text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','approved','recorded')),
  approved_by       uuid,
  approved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 1D. Per-investor, per-tier line items
CREATE TABLE public.distribution_line_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id   uuid NOT NULL REFERENCES public.distributions(id) ON DELETE CASCADE,
  calculation_id    uuid NOT NULL REFERENCES public.distribution_calculations(id) ON DELETE CASCADE,
  investment_id     uuid NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  investor_name     text,
  tier_name         text NOT NULL,
  tier_order        integer NOT NULL,
  amount            numeric(15,2) NOT NULL DEFAULT 0,
  is_gp             boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 1E. RLS policies (open authenticated, matching investor table pattern)
ALTER TABLE public.waterfall_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "waterfall_tiers_select" ON public.waterfall_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "waterfall_tiers_insert" ON public.waterfall_tiers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "waterfall_tiers_update" ON public.waterfall_tiers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "waterfall_tiers_delete" ON public.waterfall_tiers FOR DELETE TO authenticated USING (true);

ALTER TABLE public.distribution_calculations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "distribution_calculations_select" ON public.distribution_calculations FOR SELECT TO authenticated USING (true);
CREATE POLICY "distribution_calculations_insert" ON public.distribution_calculations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "distribution_calculations_update" ON public.distribution_calculations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "distribution_calculations_delete" ON public.distribution_calculations FOR DELETE TO authenticated USING (true);

ALTER TABLE public.distribution_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "distribution_line_items_select" ON public.distribution_line_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "distribution_line_items_insert" ON public.distribution_line_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "distribution_line_items_update" ON public.distribution_line_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "distribution_line_items_delete" ON public.distribution_line_items FOR DELETE TO authenticated USING (true);

-- 1F. updated_at triggers
CREATE TRIGGER set_waterfall_tiers_updated_at
  BEFORE UPDATE ON public.waterfall_tiers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_distribution_calculations_updated_at
  BEFORE UPDATE ON public.distribution_calculations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

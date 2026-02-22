-- Add project_id to opportunities for back-reference after conversion
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_opportunities_project_id ON public.opportunities(project_id);

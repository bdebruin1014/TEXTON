-- 20260227_docuseal_integration.sql
-- DocuSeal cloud e-signature integration columns + config table.

-- ============================================================
-- 1. Alter esign_templates for DocuSeal
-- ============================================================

alter table public.esign_templates
  add column if not exists docuseal_template_id integer,
  add column if not exists docuseal_schema jsonb default '{}',
  add column if not exists field_mappings jsonb default '{}',
  add column if not exists last_synced_at timestamptz;

-- ============================================================
-- 2. Alter esign_documents for DocuSeal
-- ============================================================

alter table public.esign_documents
  add column if not exists docuseal_submission_id integer,
  add column if not exists docuseal_status text,
  add column if not exists completed_document_url text,
  add column if not exists webhook_events jsonb default '[]',
  add column if not exists field_values jsonb default '{}';

-- ============================================================
-- 3. Alter esign_signers for DocuSeal
-- ============================================================

alter table public.esign_signers
  add column if not exists docuseal_signer_id integer,
  add column if not exists embed_url text,
  add column if not exists completed_at timestamptz;

-- ============================================================
-- 4. DocuSeal Config Table
-- ============================================================

create table public.docuseal_config (
  id        uuid primary key default gen_random_uuid(),
  entity_id uuid unique references public.entities(id) on delete cascade,
  api_key   text not null,
  api_url   text not null default 'https://api.docuseal.co',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_docuseal_config_updated_at
  before update on public.docuseal_config
  for each row execute function public.set_updated_at();

-- RLS: entity-scoped
alter table public.docuseal_config enable row level security;

create policy "docuseal_config_select" on public.docuseal_config
  for select to authenticated
  using (entity_id = public.auth_entity_id());

create policy "docuseal_config_insert" on public.docuseal_config
  for insert to authenticated
  with check (entity_id = public.auth_entity_id());

create policy "docuseal_config_update" on public.docuseal_config
  for update to authenticated
  using (entity_id = public.auth_entity_id());

create policy "docuseal_config_delete" on public.docuseal_config
  for delete to authenticated
  using (entity_id = public.auth_entity_id());

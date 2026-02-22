-- 20260228_document_generation.sql
-- Document template generation system — extends document_templates
-- with HTML templates and variable substitution, and wires up
-- the generation pipeline to actually produce PDFs.

-- ============================================================
-- 1. Alter document_templates
-- ============================================================

alter table public.document_templates
  add column if not exists template_html text,
  add column if not exists variables jsonb default '[]',
  add column if not exists record_types text[] default '{}',
  add column if not exists is_active boolean not null default true;

-- ============================================================
-- 2. Alter documents for generation tracking
-- ============================================================

alter table public.documents
  add column if not exists generated_from_template_id uuid references public.document_templates(id) on delete set null,
  add column if not exists generation_status text
    check (generation_status is null or generation_status in ('pending', 'processing', 'completed', 'failed')),
  add column if not exists generation_error text;

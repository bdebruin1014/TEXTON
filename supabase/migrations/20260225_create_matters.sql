-- ============================================================================
-- MATTERS MODULE — Migration
-- Catch-all workflow system for items outside standard pipeline
-- ============================================================================

-- ── MATTERS ────────────────────────────────────────────────────────────────
create table if not exists public.matters (
  id                     uuid primary key default gen_random_uuid(),
  matter_number          text unique not null,
  title                  text not null,
  status                 text not null default 'open'
    check (status in ('open','in_progress','on_hold','resolved','closed','cancelled')),
  priority               text not null default 'medium'
    check (priority in ('critical','high','medium','low')),
  category               text not null
    check (category in (
      'contract_dispute','refinance','insurance_claim','legal','compliance',
      'zoning','permitting','partnership','vendor_dispute','title_issue',
      'environmental','tax','investor_relations','construction_defect','other'
    )),
  situation_summary      text,
  relevant_information   text,
  goals_and_deliverables text,
  target_completion_date date,
  intake_conversation    jsonb default '[]'::jsonb,
  ai_generated_workflow  jsonb,
  linked_project_id      uuid references public.projects(id) on delete set null,
  linked_opportunity_id  uuid references public.opportunities(id) on delete set null,
  linked_entity_id       uuid references public.entities(id) on delete set null,
  created_by             uuid references auth.users(id) not null,
  assigned_to            uuid references auth.users(id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  resolved_at            timestamptz,
  closed_at              timestamptz
);

-- Auto-number trigger: MTR-YYYY-NNNN
create or replace function public.generate_matter_number()
returns trigger as $$
declare
  yr text := to_char(now(), 'YYYY');
  seq int;
begin
  select coalesce(max(
    nullif(split_part(matter_number, '-', 3), '')::int
  ), 0) + 1
  into seq
  from public.matters
  where matter_number like 'MTR-' || yr || '-%';

  new.matter_number := 'MTR-' || yr || '-' || lpad(seq::text, 4, '0');
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_matters_auto_number on public.matters;
create trigger trg_matters_auto_number
  before insert on public.matters
  for each row
  when (new.matter_number is null or new.matter_number = '')
  execute function public.generate_matter_number();

-- Updated_at trigger
drop trigger if exists trg_matters_updated_at on public.matters;
create trigger trg_matters_updated_at
  before update on public.matters
  for each row
  execute function public.set_updated_at();

-- Indexes
create index if not exists idx_matters_status on public.matters(status);
create index if not exists idx_matters_priority on public.matters(priority);
create index if not exists idx_matters_category on public.matters(category);
create index if not exists idx_matters_created_by on public.matters(created_by);
create index if not exists idx_matters_assigned_to on public.matters(assigned_to);
create index if not exists idx_matters_linked_project on public.matters(linked_project_id);
create index if not exists idx_matters_linked_opportunity on public.matters(linked_opportunity_id);
create index if not exists idx_matters_linked_entity on public.matters(linked_entity_id);
create index if not exists idx_matters_created_at on public.matters(created_at desc);

-- ── MATTER CONTACTS ────────────────────────────────────────────────────────
create table if not exists public.matter_contacts (
  id          uuid primary key default gen_random_uuid(),
  matter_id   uuid not null references public.matters(id) on delete cascade,
  contact_id  uuid not null references public.contacts(id) on delete cascade,
  role        text not null,
  notes       text,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now(),
  unique(matter_id, contact_id, role)
);

create index if not exists idx_matter_contacts_matter on public.matter_contacts(matter_id);
create index if not exists idx_matter_contacts_contact on public.matter_contacts(contact_id);

-- ── MATTER WORKFLOW STEPS ──────────────────────────────────────────────────
create table if not exists public.matter_workflow_steps (
  id              uuid primary key default gen_random_uuid(),
  matter_id       uuid not null references public.matters(id) on delete cascade,
  parent_step_id  uuid references public.matter_workflow_steps(id) on delete cascade,
  step_order      int not null,
  step_type       text not null default 'task'
    check (step_type in ('milestone','task','deliverable','decision_point','review')),
  title           text not null,
  description     text,
  status          text not null default 'pending'
    check (status in ('pending','in_progress','completed','skipped','blocked')),
  assigned_to     uuid references auth.users(id),
  due_date        date,
  completed_at    timestamptz,
  depends_on      uuid[],
  ai_generated    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_matter_workflow_steps_updated_at on public.matter_workflow_steps;
create trigger trg_matter_workflow_steps_updated_at
  before update on public.matter_workflow_steps
  for each row
  execute function public.set_updated_at();

create index if not exists idx_matter_workflow_steps_matter on public.matter_workflow_steps(matter_id);
create index if not exists idx_matter_workflow_steps_parent on public.matter_workflow_steps(parent_step_id);
create index if not exists idx_matter_workflow_steps_status on public.matter_workflow_steps(status);
create index if not exists idx_matter_workflow_steps_order on public.matter_workflow_steps(matter_id, step_order);

-- ── MATTER DOCUMENTS ───────────────────────────────────────────────────────
create table if not exists public.matter_documents (
  id             uuid primary key default gen_random_uuid(),
  matter_id      uuid not null references public.matters(id) on delete cascade,
  file_name      text not null,
  file_url       text,
  storage_path   text,
  file_size      bigint,
  mime_type      text,
  document_type  text not null default 'other'
    check (document_type in ('contract','correspondence','legal_filing','financial','photo','other')),
  uploaded_by    uuid references auth.users(id),
  created_at     timestamptz not null default now()
);

create index if not exists idx_matter_documents_matter on public.matter_documents(matter_id);

-- ── MATTER NOTES ───────────────────────────────────────────────────────────
create table if not exists public.matter_notes (
  id              uuid primary key default gen_random_uuid(),
  matter_id       uuid not null references public.matters(id) on delete cascade,
  note_type       text not null default 'comment'
    check (note_type in ('comment','status_change','assignment','system','email_log')),
  content         text,
  previous_value  text,
  new_value       text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

create index if not exists idx_matter_notes_matter on public.matter_notes(matter_id);
create index if not exists idx_matter_notes_created_at on public.matter_notes(matter_id, created_at desc);

-- ── MATTER LINKED RECORDS ──────────────────────────────────────────────────
create table if not exists public.matter_linked_records (
  id                        uuid primary key default gen_random_uuid(),
  matter_id                 uuid not null references public.matters(id) on delete cascade,
  record_type               text not null
    check (record_type in ('project','opportunity','entity','contact','matter')),
  record_id                 uuid not null,
  relationship_description  text,
  created_at                timestamptz not null default now(),
  unique(matter_id, record_type, record_id)
);

create index if not exists idx_matter_linked_records_matter on public.matter_linked_records(matter_id);
create index if not exists idx_matter_linked_records_target on public.matter_linked_records(record_type, record_id);

-- ── STORAGE BUCKET ─────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('matter-documents', 'matter-documents', false, 52428800)
on conflict (id) do nothing;

-- ── RLS POLICIES ───────────────────────────────────────────────────────────
alter table public.matters enable row level security;
alter table public.matter_contacts enable row level security;
alter table public.matter_workflow_steps enable row level security;
alter table public.matter_documents enable row level security;
alter table public.matter_notes enable row level security;
alter table public.matter_linked_records enable row level security;

-- Authenticated full access on all matter tables
do $$
declare
  tbl text;
begin
  for tbl in select unnest(array[
    'matters','matter_contacts','matter_workflow_steps',
    'matter_documents','matter_notes','matter_linked_records'
  ])
  loop
    execute format(
      'drop policy if exists "Authenticated full access" on public.%I',
      tbl
    );
    execute format(
      'create policy "Authenticated full access" on public.%I for all to authenticated using (true) with check (true)',
      tbl
    );
  end loop;
end;
$$;

-- Storage policies for matter-documents bucket
drop policy if exists "Authenticated upload matter docs" on storage.objects;
create policy "Authenticated upload matter docs"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'matter-documents');

drop policy if exists "Authenticated read matter docs" on storage.objects;
create policy "Authenticated read matter docs"
  on storage.objects for select to authenticated
  using (bucket_id = 'matter-documents');

drop policy if exists "Authenticated delete matter docs" on storage.objects;
create policy "Authenticated delete matter docs"
  on storage.objects for delete to authenticated
  using (bucket_id = 'matter-documents');

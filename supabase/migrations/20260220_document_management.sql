-- 20260220_document_management.sql
-- Document Management: folder_templates, folder_template_items, document_folders,
--   documents, document_activity, apply_folder_template(), auto-apply triggers,
--   storage buckets, storage RLS policies, and seed data (Appendix B).

-- ============================================================
-- 1. TABLES
-- ============================================================

-- folder_templates: reusable folder structures per project_type / entity_type
create table if not exists public.folder_templates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  entity_type   text not null
    check (entity_type in ('project', 'job', 'disposition', 'opportunity')),
  project_type  text
    check (project_type is null or project_type in (
      'Scattered Lot', 'Community Development', 'Lot Development', 'Lot Purchase'
    )),
  is_default    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- folder_template_items: individual folders within a template (self-referential tree)
create table if not exists public.folder_template_items (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid not null references public.folder_templates(id) on delete cascade,
  parent_id     uuid references public.folder_template_items(id) on delete cascade,
  name          text not null,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- document_folders: instantiated folder hierarchy on a real record
create table if not exists public.document_folders (
  id            uuid primary key default gen_random_uuid(),
  entity_id     uuid references public.entities(id) on delete set null,
  parent_id     uuid references public.document_folders(id) on delete cascade,
  record_type   text not null
    check (record_type in ('project', 'job', 'disposition', 'opportunity', 'contact', 'entity')),
  record_id     uuid not null,
  name          text not null,
  slug          text,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- documents: individual files stored in Supabase Storage
create table if not exists public.documents (
  id              uuid primary key default gen_random_uuid(),
  entity_id       uuid references public.entities(id) on delete set null,
  folder_id       uuid references public.document_folders(id) on delete set null,
  record_type     text not null
    check (record_type in ('project', 'job', 'disposition', 'opportunity', 'contact', 'entity')),
  record_id       uuid not null,
  file_name       text not null,
  file_type       text,
  file_size       bigint,
  storage_path    text not null,
  storage_bucket  text not null,
  uploaded_by     uuid references auth.users(id) on delete set null,
  description     text,
  tags            text[] default '{}',
  version         integer not null default 1,
  parent_version  uuid references public.documents(id) on delete set null,
  is_archived     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- If documents table already existed with old schema (from 00007), add missing columns
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS entity_id uuid;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS folder_id uuid;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS record_type text DEFAULT 'project';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS record_id uuid;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_type text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS storage_bucket text DEFAULT 'project-docs';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS uploaded_by uuid;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS parent_version uuid;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
-- Backfill record_id from legacy columns for any existing rows
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'project_id') THEN
    UPDATE public.documents SET record_id = COALESCE(project_id, opportunity_id) WHERE record_id IS NULL AND (project_id IS NOT NULL OR opportunity_id IS NOT NULL);
    UPDATE public.documents SET record_type = CASE WHEN project_id IS NOT NULL THEN 'project' WHEN opportunity_id IS NOT NULL THEN 'opportunity' ELSE 'project' END WHERE record_type = 'project' AND project_id IS NULL AND opportunity_id IS NOT NULL;
  END IF;
END $$;

-- document_activity: audit trail for document actions
create table if not exists public.document_activity (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid references public.documents(id) on delete cascade,
  folder_id     uuid references public.document_folders(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  action        text not null
    check (action in (
      'uploaded', 'downloaded', 'viewed', 'renamed', 'moved',
      'archived', 'restored', 'deleted', 'versioned', 'folder_created', 'folder_renamed'
    )),
  details       jsonb default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);


-- ============================================================
-- 2. INDEXES
-- ============================================================

-- folder_templates
create index if not exists idx_folder_templates_entity_type on public.folder_templates (entity_type);
create index if not exists idx_folder_templates_project_type on public.folder_templates (project_type);
create index if not exists idx_folder_templates_default on public.folder_templates (entity_type, project_type, is_default)
  where is_default = true;

-- folder_template_items
create index if not exists idx_folder_template_items_template on public.folder_template_items (template_id);
create index if not exists idx_folder_template_items_parent on public.folder_template_items (parent_id);

-- document_folders
create index if not exists idx_document_folders_record on public.document_folders (record_type, record_id);
create index if not exists idx_document_folders_entity on public.document_folders (entity_id);
create index if not exists idx_document_folders_parent on public.document_folders (parent_id);
create index if not exists idx_document_folders_slug on public.document_folders (record_type, record_id, slug);

-- documents
create index if not exists idx_documents_record on public.documents (record_type, record_id);
create index if not exists idx_documents_folder on public.documents (folder_id);
create index if not exists idx_documents_entity on public.documents (entity_id);
create index if not exists idx_documents_uploaded_by on public.documents (uploaded_by);
create index if not exists idx_documents_tags on public.documents using gin (tags);
create index if not exists idx_documents_archived on public.documents (is_archived) where is_archived = false;

-- document_activity
create index if not exists idx_document_activity_document on public.document_activity (document_id);
create index if not exists idx_document_activity_folder on public.document_activity (folder_id);
create index if not exists idx_document_activity_user on public.document_activity (user_id);
create index if not exists idx_document_activity_created on public.document_activity (created_at desc);


-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all five tables
alter table public.folder_templates enable row level security;
alter table public.folder_template_items enable row level security;
alter table public.document_folders enable row level security;
alter table public.documents enable row level security;
alter table public.document_activity enable row level security;

-- folder_templates: all authenticated can read; only admins can write
drop policy if exists "folder_templates_select" on public.folder_templates;
create policy "folder_templates_select"
  on public.folder_templates for select
  to authenticated
  using (true);

drop policy if exists "folder_templates_insert" on public.folder_templates;
create policy "folder_templates_insert"
  on public.folder_templates for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_profiles
      where user_id = auth.uid() and role = 'Admin'
    )
  );

drop policy if exists "folder_templates_update" on public.folder_templates;
create policy "folder_templates_update"
  on public.folder_templates for update
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where user_id = auth.uid() and role = 'Admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles
      where user_id = auth.uid() and role = 'Admin'
    )
  );

drop policy if exists "folder_templates_delete" on public.folder_templates;
create policy "folder_templates_delete"
  on public.folder_templates for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where user_id = auth.uid() and role = 'Admin'
    )
  );

-- folder_template_items: same pattern as folder_templates
drop policy if exists "folder_template_items_select" on public.folder_template_items;
create policy "folder_template_items_select"
  on public.folder_template_items for select
  to authenticated
  using (true);

drop policy if exists "folder_template_items_insert" on public.folder_template_items;
create policy "folder_template_items_insert"
  on public.folder_template_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_profiles
      where user_id = auth.uid() and role = 'Admin'
    )
  );

drop policy if exists "folder_template_items_update" on public.folder_template_items;
create policy "folder_template_items_update"
  on public.folder_template_items for update
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where user_id = auth.uid() and role = 'Admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles
      where user_id = auth.uid() and role = 'Admin'
    )
  );

drop policy if exists "folder_template_items_delete" on public.folder_template_items;
create policy "folder_template_items_delete"
  on public.folder_template_items for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where user_id = auth.uid() and role = 'Admin'
    )
  );

-- document_folders: authenticated full access
drop policy if exists "document_folders_all" on public.document_folders;
create policy "document_folders_all"
  on public.document_folders for all
  to authenticated
  using (true)
  with check (true);

-- documents: authenticated full access
drop policy if exists "documents_all" on public.documents;
create policy "documents_all"
  on public.documents for all
  to authenticated
  using (true)
  with check (true);

-- document_activity: authenticated full access
drop policy if exists "document_activity_all" on public.document_activity;
create policy "document_activity_all"
  on public.document_activity for all
  to authenticated
  using (true)
  with check (true);


-- ============================================================
-- 4. TRIGGERS — set_updated_at
-- ============================================================

drop trigger if exists set_updated_at_folder_templates on public.folder_templates;
create trigger set_updated_at_folder_templates
  before update on public.folder_templates
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_folder_template_items on public.folder_template_items;
create trigger set_updated_at_folder_template_items
  before update on public.folder_template_items
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_document_folders on public.document_folders;
create trigger set_updated_at_document_folders
  before update on public.document_folders
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_documents on public.documents;
create trigger set_updated_at_documents
  before update on public.documents
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_document_activity on public.document_activity;
create trigger set_updated_at_document_activity
  before update on public.document_activity
  for each row execute function public.set_updated_at();


-- ============================================================
-- 5. apply_folder_template() — callable function
-- ============================================================

create or replace function public.apply_folder_template(
  p_template_id uuid,
  p_record_type text,
  p_record_id   uuid,
  p_entity_id   uuid default null
)
returns void as $$
declare
  item record;
  new_folder_id uuid;
  parent_map   jsonb := '{}';
begin
  -- Recursive CTE walks template items in parent-first order
  for item in
    with recursive tree as (
      select
        fti.id,
        fti.parent_id,
        fti.name,
        fti.sort_order,
        0 as depth
      from public.folder_template_items fti
      where fti.template_id = p_template_id
        and fti.parent_id is null
      union all
      select
        fti.id,
        fti.parent_id,
        fti.name,
        fti.sort_order,
        t.depth + 1
      from public.folder_template_items fti
      join tree t on t.id = fti.parent_id
    )
    select * from tree order by depth, sort_order
  loop
    insert into public.document_folders (
      entity_id, parent_id, record_type, record_id, name, slug, sort_order
    )
    values (
      p_entity_id,
      case
        when item.parent_id is null then null
        else (parent_map ->> item.parent_id::text)::uuid
      end,
      p_record_type,
      p_record_id,
      item.name,
      lower(regexp_replace(item.name, '[^a-zA-Z0-9]+', '-', 'g')),
      item.sort_order
    )
    returning id into new_folder_id;

    -- Map template_item.id → new folder id for child lookups
    parent_map := parent_map || jsonb_build_object(item.id::text, new_folder_id::text);
  end loop;
end;
$$ language plpgsql security definer;


-- ============================================================
-- 6. auto_apply_folder_template() — trigger function
-- ============================================================

create or replace function public.auto_apply_folder_template()
returns trigger as $$
declare
  v_entity_type  text;
  v_project_type text;
  v_template_id  uuid;
begin
  -- Determine entity_type based on TG_TABLE_NAME
  case TG_TABLE_NAME
    when 'projects'     then v_entity_type := 'project';
    when 'jobs'         then v_entity_type := 'job';
    when 'dispositions' then v_entity_type := 'disposition';
    when 'opportunities' then v_entity_type := 'opportunity';
    else return new;
  end case;

  -- For projects, also match project_type
  if TG_TABLE_NAME = 'projects' then
    v_project_type := new.project_type;

    select id into v_template_id
    from public.folder_templates
    where entity_type = v_entity_type
      and project_type = v_project_type
      and is_default = true
    limit 1;
  else
    select id into v_template_id
    from public.folder_templates
    where entity_type = v_entity_type
      and is_default = true
    limit 1;
  end if;

  -- Apply the template if one was found
  if v_template_id is not null then
    perform public.apply_folder_template(
      v_template_id,
      v_entity_type,
      new.id,
      new.entity_id
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Auto-apply triggers on record creation
drop trigger if exists trg_auto_folders_projects on public.projects;
create trigger trg_auto_folders_projects
  after insert on public.projects
  for each row execute function public.auto_apply_folder_template();

drop trigger if exists trg_auto_folders_jobs on public.jobs;
create trigger trg_auto_folders_jobs
  after insert on public.jobs
  for each row execute function public.auto_apply_folder_template();

drop trigger if exists trg_auto_folders_dispositions on public.dispositions;
create trigger trg_auto_folders_dispositions
  after insert on public.dispositions
  for each row execute function public.auto_apply_folder_template();

drop trigger if exists trg_auto_folders_opportunities on public.opportunities;
create trigger trg_auto_folders_opportunities
  after insert on public.opportunities
  for each row execute function public.auto_apply_folder_template();


-- ============================================================
-- 7. STORAGE BUCKETS
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('project-docs',     'project-docs',     false, 52428800, null),  -- 50 MB
  ('job-docs',         'job-docs',         false, 52428800, null),  -- 50 MB
  ('disposition-docs', 'disposition-docs', false, 52428800, null),  -- 50 MB
  ('entity-docs',      'entity-docs',      false, 52428800, null),  -- 50 MB
  ('contact-docs',     'contact-docs',     false, 52428800, null),  -- 50 MB
  ('templates',        'templates',        false, 10485760, null)   -- 10 MB
on conflict (id) do nothing;


-- ============================================================
-- 8. STORAGE RLS POLICIES
-- ============================================================

-- project-docs
drop policy if exists "project_docs_select" on storage.objects;
create policy "project_docs_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'project-docs');

drop policy if exists "project_docs_insert" on storage.objects;
create policy "project_docs_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'project-docs');

drop policy if exists "project_docs_update" on storage.objects;
create policy "project_docs_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'project-docs');

drop policy if exists "project_docs_delete" on storage.objects;
create policy "project_docs_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'project-docs');

-- job-docs
drop policy if exists "job_docs_select" on storage.objects;
create policy "job_docs_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'job-docs');

drop policy if exists "job_docs_insert" on storage.objects;
create policy "job_docs_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'job-docs');

drop policy if exists "job_docs_update" on storage.objects;
create policy "job_docs_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'job-docs');

drop policy if exists "job_docs_delete" on storage.objects;
create policy "job_docs_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'job-docs');

-- disposition-docs
drop policy if exists "disposition_docs_select" on storage.objects;
create policy "disposition_docs_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'disposition-docs');

drop policy if exists "disposition_docs_insert" on storage.objects;
create policy "disposition_docs_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'disposition-docs');

drop policy if exists "disposition_docs_update" on storage.objects;
create policy "disposition_docs_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'disposition-docs');

drop policy if exists "disposition_docs_delete" on storage.objects;
create policy "disposition_docs_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'disposition-docs');

-- entity-docs
drop policy if exists "entity_docs_select" on storage.objects;
create policy "entity_docs_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'entity-docs');

drop policy if exists "entity_docs_insert" on storage.objects;
create policy "entity_docs_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'entity-docs');

drop policy if exists "entity_docs_update" on storage.objects;
create policy "entity_docs_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'entity-docs');

drop policy if exists "entity_docs_delete" on storage.objects;
create policy "entity_docs_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'entity-docs');

-- contact-docs
drop policy if exists "contact_docs_select" on storage.objects;
create policy "contact_docs_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'contact-docs');

drop policy if exists "contact_docs_insert" on storage.objects;
create policy "contact_docs_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'contact-docs');

drop policy if exists "contact_docs_update" on storage.objects;
create policy "contact_docs_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'contact-docs');

drop policy if exists "contact_docs_delete" on storage.objects;
create policy "contact_docs_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'contact-docs');

-- templates
drop policy if exists "templates_select" on storage.objects;
create policy "templates_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'templates');

drop policy if exists "templates_insert" on storage.objects;
create policy "templates_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'templates');

drop policy if exists "templates_update" on storage.objects;
create policy "templates_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'templates');

drop policy if exists "templates_delete" on storage.objects;
create policy "templates_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'templates');


-- ============================================================
-- 9. SEED DATA — Folder Templates + Items (Appendix B)
-- ============================================================

-- -------------------------------------------------------
-- 9a. Scattered Lot template
-- -------------------------------------------------------
insert into public.folder_templates (id, name, description, entity_type, project_type, is_default)
values (
  '00000000-0000-0000-0001-000000000001',
  'Scattered Lot Default',
  'Default folder structure for Scattered Lot projects',
  'project',
  'Scattered Lot',
  true
)
on conflict (id) do nothing;

do $$
declare
  tpl_id uuid := '00000000-0000-0000-0001-000000000001';
  -- root folder IDs
  f_contracts      uuid;
  f_due_diligence  uuid;
  f_permits        uuid;
  f_plans          uuid;
  f_insurance      uuid;
  f_closing        uuid;
  f_financing      uuid;
  f_photos         uuid;
  f_correspondence uuid;
begin
  -- Root folders
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Contracts', 1) returning id into f_contracts;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Due Diligence', 2) returning id into f_due_diligence;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Permits & Approvals', 3) returning id into f_permits;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Plans & Surveys', 4) returning id into f_plans;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Insurance', 5) returning id into f_insurance;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Closing Documents', 6) returning id into f_closing;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Financing', 7) returning id into f_financing;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Photos', 8) returning id into f_photos;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Correspondence', 9) returning id into f_correspondence;

  -- Contracts subfolders
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_contracts, 'Purchase Agreement', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_contracts, 'Construction Agreement', 2);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_contracts, 'Addenda', 3);

  -- Due Diligence subfolders
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_due_diligence, 'Title', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_due_diligence, 'Environmental', 2);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_due_diligence, 'Survey', 3);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_due_diligence, 'Geotech', 4);

  -- Financing subfolders
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_financing, 'Loan Documents', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_financing, 'Draw Requests', 2);
end;
$$;


-- -------------------------------------------------------
-- 9b. Community Development template
-- -------------------------------------------------------
insert into public.folder_templates (id, name, description, entity_type, project_type, is_default)
values (
  '00000000-0000-0000-0001-000000000002',
  'Community Development Default',
  'Default folder structure for Community Development projects',
  'project',
  'Community Development',
  true
)
on conflict (id) do nothing;

do $$
declare
  tpl_id uuid := '00000000-0000-0000-0001-000000000002';
  -- root folder IDs
  f_due_diligence    uuid;
  f_entitlement      uuid;
  f_engineering      uuid;
  f_horizontal       uuid;
  f_permits          uuid;
  f_contracts        uuid;
  f_financing        uuid;
  f_insurance_bonds  uuid;
  f_plans_surveys    uuid;
  f_sales_marketing  uuid;
  f_entity_legal     uuid;
  f_investor_docs    uuid;
  f_hoa              uuid;
  f_photos           uuid;
  f_correspondence   uuid;
begin
  -- 15 root folders
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Due Diligence', 1) returning id into f_due_diligence;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Entitlement', 2) returning id into f_entitlement;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Engineering & Design', 3) returning id into f_engineering;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Horizontal Development', 4) returning id into f_horizontal;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Permits & Approvals', 5) returning id into f_permits;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Contracts', 6) returning id into f_contracts;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Financing', 7) returning id into f_financing;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Insurance & Bonds', 8) returning id into f_insurance_bonds;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Plans & Surveys', 9) returning id into f_plans_surveys;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Sales & Marketing', 10) returning id into f_sales_marketing;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Entity & Legal', 11) returning id into f_entity_legal;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Investor Documents', 12) returning id into f_investor_docs;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'HOA', 13) returning id into f_hoa;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Photos', 14) returning id into f_photos;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Correspondence', 15) returning id into f_correspondence;

  -- Due Diligence subfolders (8)
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_due_diligence, 'Title', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_due_diligence, 'Environmental', 2);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_due_diligence, 'Survey', 3);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_due_diligence, 'Geotech', 4);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_due_diligence, 'Appraisal', 5);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_due_diligence, 'Traffic Study', 6);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_due_diligence, 'Market Study', 7);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_due_diligence, 'Feasibility', 8);

  -- Entitlement subfolders (4)
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_entitlement, 'Rezoning', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_entitlement, 'Platting', 2);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_entitlement, 'Variance', 3);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_entitlement, 'Impact Fees', 4);

  -- Engineering & Design subfolders (5)
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_engineering, 'Civil Plans', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_engineering, 'Landscape Plans', 2);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_engineering, 'Stormwater', 3);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_engineering, 'Utilities', 4);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_engineering, 'Grading Plans', 5);

  -- Horizontal Development subfolders (4)
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_horizontal, 'Bid Packages', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_horizontal, 'Contracts', 2);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_horizontal, 'Pay Applications', 3);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_horizontal, 'Inspections', 4);

  -- Permits & Approvals subfolders (4)
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_permits, 'Grading Permit', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_permits, 'Utility Permits', 2);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_permits, 'NPDES Permit', 3);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_permits, 'Erosion Control', 4);

  -- Financing subfolders (3)
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_financing, 'Loan Documents', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_financing, 'Draw Requests', 2);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_financing, 'Payoff Letters', 3);

  -- Insurance & Bonds subfolders (4)
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_insurance_bonds, 'Builders Risk', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_insurance_bonds, 'General Liability', 2);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_insurance_bonds, 'Performance Bonds', 3);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_insurance_bonds, 'Payment Bonds', 4);

  -- Sales & Marketing subfolders (3)
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_sales_marketing, 'Brochures', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_sales_marketing, 'Price Sheets', 2);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_sales_marketing, 'Renderings', 3);

  -- Entity & Legal subfolders (3)
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_entity_legal, 'Operating Agreement', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_entity_legal, 'Articles of Organization', 2);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_entity_legal, 'Tax Returns', 3);

  -- Investor Documents subfolders (5)
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_investor_docs, 'Subscription Agreements', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_investor_docs, 'K-1s', 2);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_investor_docs, 'Distribution Notices', 3);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_investor_docs, 'Investor Reports', 4);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_investor_docs, 'Capital Call Notices', 5);

  -- HOA subfolders (3)
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_hoa, 'CC&Rs', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_hoa, 'Bylaws', 2);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_hoa, 'Design Guidelines', 3);

  -- Photos subfolders (3)
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_photos, 'Pre-Development', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_photos, 'Construction Progress', 2);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_photos, 'Completed', 3);
end;
$$;


-- -------------------------------------------------------
-- 9c. Lot Development template (same structure as Scattered Lot)
-- -------------------------------------------------------
insert into public.folder_templates (id, name, description, entity_type, project_type, is_default)
values (
  '00000000-0000-0000-0001-000000000003',
  'Lot Development Default',
  'Default folder structure for Lot Development projects',
  'project',
  'Lot Development',
  true
)
on conflict (id) do nothing;

do $$
declare
  tpl_id uuid := '00000000-0000-0000-0001-000000000003';
  -- root folder IDs
  f_contracts      uuid;
  f_due_diligence  uuid;
  f_permits        uuid;
  f_plans          uuid;
  f_insurance      uuid;
  f_closing        uuid;
  f_financing      uuid;
  f_photos         uuid;
  f_correspondence uuid;
begin
  -- Root folders (same as Scattered Lot)
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Contracts', 1) returning id into f_contracts;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Due Diligence', 2) returning id into f_due_diligence;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Permits & Approvals', 3) returning id into f_permits;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Plans & Surveys', 4) returning id into f_plans;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Insurance', 5) returning id into f_insurance;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Closing Documents', 6) returning id into f_closing;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Financing', 7) returning id into f_financing;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Photos', 8) returning id into f_photos;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Correspondence', 9) returning id into f_correspondence;

  -- Contracts subfolders
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_contracts, 'Purchase Agreement', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_contracts, 'Construction Agreement', 2);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_contracts, 'Addenda', 3);

  -- Due Diligence subfolders
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_due_diligence, 'Title', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_due_diligence, 'Environmental', 2);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_due_diligence, 'Survey', 3);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_due_diligence, 'Geotech', 4);

  -- Financing subfolders
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_financing, 'Loan Documents', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_financing, 'Draw Requests', 2);
end;
$$;


-- -------------------------------------------------------
-- 9d. Lot Purchase template (simplified)
-- -------------------------------------------------------
insert into public.folder_templates (id, name, description, entity_type, project_type, is_default)
values (
  '00000000-0000-0000-0001-000000000004',
  'Lot Purchase Default',
  'Default folder structure for Lot Purchase projects',
  'project',
  'Lot Purchase',
  true
)
on conflict (id) do nothing;

do $$
declare
  tpl_id uuid := '00000000-0000-0000-0001-000000000004';
  -- root folder IDs
  f_contracts      uuid;
  f_due_diligence  uuid;
  f_financing      uuid;
  f_closing        uuid;
  f_correspondence uuid;
begin
  -- Root folders
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Contracts', 1) returning id into f_contracts;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Due Diligence', 2) returning id into f_due_diligence;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Financing', 3) returning id into f_financing;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Closing Documents', 4) returning id into f_closing;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Correspondence', 5) returning id into f_correspondence;

  -- Due Diligence subfolders
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_due_diligence, 'Title', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_due_diligence, 'Environmental', 2);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_due_diligence, 'Survey', 3);
end;
$$;


-- -------------------------------------------------------
-- 9e. Job template
-- -------------------------------------------------------
insert into public.folder_templates (id, name, description, entity_type, project_type, is_default)
values (
  '00000000-0000-0000-0001-000000000010',
  'Job Default',
  'Default folder structure for construction jobs',
  'job',
  null,
  true
)
on conflict (id) do nothing;

do $$
declare
  tpl_id uuid := '00000000-0000-0000-0001-000000000010';
  -- root folder IDs
  f_contracts        uuid;
  f_plans_specs      uuid;
  f_permits          uuid;
  f_inspections      uuid;
  f_lien_waivers     uuid;
  f_change_orders    uuid;
  f_daily_logs       uuid;
  f_safety           uuid;
  f_submittals       uuid;
  f_rfi              uuid;
  f_punch_list       uuid;
  f_warranty         uuid;
  f_photos           uuid;
  f_correspondence   uuid;
begin
  -- 14 root folders
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Contracts & Agreements', 1) returning id into f_contracts;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Plans & Specifications', 2) returning id into f_plans_specs;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Permits', 3) returning id into f_permits;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Inspections', 4) returning id into f_inspections;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Lien Waivers', 5) returning id into f_lien_waivers;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Change Orders', 6) returning id into f_change_orders;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Daily Logs', 7) returning id into f_daily_logs;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Safety', 8) returning id into f_safety;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Submittals', 9) returning id into f_submittals;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'RFIs', 10) returning id into f_rfi;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Punch List', 11) returning id into f_punch_list;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Warranty', 12) returning id into f_warranty;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Photos', 13) returning id into f_photos;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Correspondence', 14) returning id into f_correspondence;

  -- Contracts & Agreements subfolders
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_contracts, 'Construction Agreement', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_contracts, 'Subcontracts', 2);

  -- Plans & Specifications subfolders
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_plans_specs, 'Architectural', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_plans_specs, 'Structural', 2);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_plans_specs, 'MEP', 3);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_plans_specs, 'Selections Sheet', 4);

  -- Lien Waivers subfolders
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_lien_waivers, 'Partial', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_lien_waivers, 'Final', 2);

  -- Photos subfolders
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_photos, 'Foundation', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_photos, 'Framing', 2);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_photos, 'Rough-In', 3);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_photos, 'Drywall', 4);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_photos, 'Finishes', 5);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_photos, 'Final', 6);
end;
$$;


-- -------------------------------------------------------
-- 9f. Disposition template
-- -------------------------------------------------------
insert into public.folder_templates (id, name, description, entity_type, project_type, is_default)
values (
  '00000000-0000-0000-0001-000000000020',
  'Disposition Default',
  'Default folder structure for dispositions (home sales)',
  'disposition',
  null,
  true
)
on conflict (id) do nothing;

do $$
declare
  tpl_id uuid := '00000000-0000-0000-0001-000000000020';
  -- root folder IDs
  f_listing          uuid;
  f_buyer_docs       uuid;
  f_lender_financing uuid;
  f_title_survey     uuid;
  f_closing_docs     uuid;
  f_settlement       uuid;
  f_inspections      uuid;
  f_appraisal        uuid;
  f_hoa              uuid;
  f_post_closing     uuid;
  f_correspondence   uuid;
begin
  -- 11 root folders
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Listing', 1) returning id into f_listing;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Buyer Documents', 2) returning id into f_buyer_docs;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Lender & Financing', 3) returning id into f_lender_financing;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Title & Survey', 4) returning id into f_title_survey;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Closing Documents', 5) returning id into f_closing_docs;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Settlement', 6) returning id into f_settlement;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Inspections', 7) returning id into f_inspections;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Appraisal', 8) returning id into f_appraisal;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'HOA', 9) returning id into f_hoa;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Post-Closing', 10) returning id into f_post_closing;

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Correspondence', 11) returning id into f_correspondence;

  -- Listing subfolders
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_listing, 'MLS Listing', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_listing, 'Marketing Materials', 2);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_listing, 'Photos', 3);

  -- Buyer Documents subfolders
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_buyer_docs, 'Pre-Approval', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_buyer_docs, 'Application', 2);

  -- Lender & Financing subfolders
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_lender_financing, 'Appraisal', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_lender_financing, 'Commitment Letter', 2);

  -- Title & Survey subfolders
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_title_survey, 'Title Search', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_title_survey, 'Title Commitment', 2);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_title_survey, 'Survey', 3);

  -- Closing Documents subfolders
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_closing_docs, 'Closing Disclosure', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_closing_docs, 'Deed', 2);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_closing_docs, 'Settlement Statement', 3);

  -- Settlement subfolders
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_settlement, 'Wire Confirmation', 1);

  -- Post-Closing subfolders
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_post_closing, 'Warranty Registration', 1);
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, f_post_closing, 'Walk Inspections', 2);
end;
$$;


-- -------------------------------------------------------
-- 9g. Opportunity template (root folders only, no subfolders)
-- -------------------------------------------------------
insert into public.folder_templates (id, name, description, entity_type, project_type, is_default)
values (
  '00000000-0000-0000-0001-000000000030',
  'Opportunity Default',
  'Default folder structure for pipeline opportunities',
  'opportunity',
  null,
  true
)
on conflict (id) do nothing;

do $$
declare
  tpl_id uuid := '00000000-0000-0000-0001-000000000030';
begin
  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Property Info', 1);

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Due Diligence', 2);

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Analysis', 3);

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Offers & Contracts', 4);

  insert into public.folder_template_items (template_id, parent_id, name, sort_order)
  values (tpl_id, null, 'Correspondence', 5);
end;
$$;

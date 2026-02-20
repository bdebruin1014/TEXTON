-- 00007_contacts.sql
-- Contacts module: companies, contacts, contact_assignments,
--   employees, customers, vendors, documents

-- ============================================================
-- companies
-- ============================================================
create table public.companies (
  id              uuid primary key default gen_random_uuid(),
  entity_id       uuid references public.entities(id) on delete set null,
  name            text not null,
  company_type    text,
  phone           text,
  email           text,
  address         text,
  city            text,
  state           text,
  zip             text,
  website         text,
  contact_count   integer default 0,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- contacts (individuals within companies)
-- Generated column: name = first_name || ' ' || last_name
-- ============================================================
create table public.contacts (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references public.companies(id) on delete cascade,
  first_name  text,
  last_name   text,
  name        text generated always as (
    coalesce(first_name, '') || ' ' || coalesce(last_name, '')
  ) stored,
  company     text,
  email       text,
  phone       text,
  title       text,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- contact_assignments (polymorphic join)
-- ============================================================
create table public.contact_assignments (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid not null references public.contacts(id) on delete cascade,
  record_type text not null,  -- 'opportunity', 'project', etc.
  record_id   uuid not null,
  role        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- employees
-- ============================================================
create table public.employees (
  id          uuid primary key default gen_random_uuid(),
  entity_id   uuid references public.entities(id) on delete set null,
  first_name  text,
  last_name   text,
  email       text,
  phone       text,
  department  text,
  title       text,
  status      text not null default 'Active'
    check (status in ('Active','Inactive','Terminated')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- customers
-- ============================================================
create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  entity_id   uuid references public.entities(id) on delete set null,
  first_name  text,
  last_name   text,
  email       text,
  phone       text,
  address     text,
  status      text not null default 'Active'
    check (status in ('Active','Inactive','Prospect')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- vendors
-- ============================================================
create table public.vendors (
  id              uuid primary key default gen_random_uuid(),
  entity_id       uuid references public.entities(id) on delete set null,
  company_name    text not null,
  trade           text,
  status          text not null default 'Active'
    check (status in ('Active','Inactive','Suspended')),
  w9_on_file      boolean default false,
  license_expiry  date,
  insurance_expiry date,
  phone           text,
  email           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Backfill FK on subcontracts → vendors
alter table public.subcontracts
  add constraint subcontracts_vendor_id_fkey
  foreign key (vendor_id) references public.vendors(id) on delete set null;

-- ============================================================
-- documents (shared by pipeline & projects)
-- ============================================================
create table public.documents (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  uuid references public.opportunities(id) on delete cascade,
  project_id      uuid references public.projects(id) on delete cascade,
  file_name       text,
  storage_path    text,
  file_size       bigint,
  category        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

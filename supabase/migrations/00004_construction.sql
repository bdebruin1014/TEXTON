-- 00004_construction.sql
-- Construction module: jobs, job_budget_lines, job_milestones,
--   daily_logs, change_orders, inspections, permits, punch_list_items,
--   selections, subcontracts, warranty_claims, job_photos, job_files

-- ============================================================
-- jobs
-- ============================================================
create table public.jobs (
  id                  uuid primary key default gen_random_uuid(),
  entity_id           uuid references public.entities(id) on delete set null,
  project_id          uuid references public.projects(id) on delete set null,
  lot_id              uuid references public.lots(id) on delete set null,
  floor_plan_id       uuid references public.floor_plans(id) on delete set null,
  job_name            text,
  lot_number          text,
  floor_plan_name     text,
  project_name        text,
  status              text not null default 'Pre-Construction'
    check (status in ('Pre-Construction','In Progress','Punch List','Complete','Warranty','Cancelled')),
  builder             text,
  start_date          date,
  target_completion   date,
  actual_completion   date,
  build_duration      integer,
  budget_total        numeric(15,2) default 0,
  spent_total         numeric(15,2) default 0,
  contract_amount     numeric(15,2),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Backfill FK on lots → jobs
alter table public.lots
  add constraint lots_job_id_fkey
  foreign key (job_id) references public.jobs(id) on delete set null;

-- ============================================================
-- job_budget_lines
-- ============================================================
create table public.job_budget_lines (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references public.jobs(id) on delete cascade,
  cost_code   text,
  description text,
  budgeted    numeric(15,2) default 0,
  committed   numeric(15,2) default 0,
  invoiced    numeric(15,2) default 0,
  paid        numeric(15,2) default 0,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- job_milestones
-- ============================================================
create table public.job_milestones (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid not null references public.jobs(id) on delete cascade,
  name            text not null,
  status          text not null default 'Pending'
    check (status in ('Pending','In Progress','Complete','Skipped')),
  target_date     date,
  started_date    date,
  completed_date  date,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- daily_logs
-- ============================================================
create table public.daily_logs (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid not null references public.jobs(id) on delete cascade,
  log_date        date not null default current_date,
  weather         text,
  crew_count      integer,
  notes           text,
  superintendent  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- change_orders
-- ============================================================
create table public.change_orders (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid not null references public.jobs(id) on delete cascade,
  co_number       integer,
  status          text not null default 'Pending'
    check (status in ('Pending','Approved','Rejected','Void')),
  amount          numeric(15,2),
  description     text,
  approved_date   date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- inspections
-- ============================================================
create table public.inspections (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid not null references public.jobs(id) on delete cascade,
  inspection_type text,
  status          text not null default 'Scheduled'
    check (status in ('Scheduled','Passed','Failed','Re-Inspect','Cancelled')),
  scheduled_date  date,
  inspector       text,
  result          text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- permits
-- ============================================================
create table public.permits (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid not null references public.jobs(id) on delete cascade,
  permit_type     text,
  status          text not null default 'Pending'
    check (status in ('Pending','Applied','Issued','Expired','Rejected')),
  applied_date    date,
  issued_date     date,
  permit_number   text,
  jurisdiction    text,
  fee             numeric(10,2),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- punch_list_items
-- ============================================================
create table public.punch_list_items (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid not null references public.jobs(id) on delete cascade,
  description     text,
  status          text not null default 'Open'
    check (status in ('Open','In Progress','Complete')),
  category        text,
  completed_date  date,
  assigned_to     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- selections
-- ============================================================
create table public.selections (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid not null references public.jobs(id) on delete cascade,
  category        text,
  item_name       text,
  status          text not null default 'Pending'
    check (status in ('Pending','Selected','Ordered','Installed')),
  selection_made  text,
  vendor          text,
  amount          numeric(15,2),
  approved_date   date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- subcontracts
-- ============================================================
create table public.subcontracts (
  id              uuid primary key default gen_random_uuid(),
  entity_id       uuid references public.entities(id) on delete set null,
  job_id          uuid references public.jobs(id) on delete cascade,
  vendor_id       uuid,  -- FK added in 00007 after vendors table
  contract_number text,
  vendor_name     text,
  status          text not null default 'Draft'
    check (status in ('Draft','Active','Complete','Cancelled')),
  contract_amount numeric(15,2),
  paid_to_date    numeric(15,2) default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- warranty_claims
-- ============================================================
create table public.warranty_claims (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid not null references public.jobs(id) on delete cascade,
  description     text,
  status          text not null default 'Open'
    check (status in ('Open','In Progress','Resolved','Closed')),
  category        text,
  reported_date   date,
  resolved_date   date,
  assignee        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- job_photos
-- ============================================================
create table public.job_photos (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid not null references public.jobs(id) on delete cascade,
  file_name       text,
  storage_path    text,
  caption         text,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- job_files
-- ============================================================
create table public.job_files (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid not null references public.jobs(id) on delete cascade,
  file_name       text,
  storage_path    text,
  file_size       bigint,
  category        text,
  created_at      timestamptz not null default now()
);

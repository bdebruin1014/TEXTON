-- 00003_projects.sql
-- Projects module: floor_plans, projects, lots, lot_takedowns,
--   budget_lines, horizontal_line_items, milestones, closeout_items,
--   insurance_certificates, draw_requests, project_investors
-- Also backfills FKs from pipeline tables to projects.

-- ============================================================
-- floor_plans
-- ============================================================
create table public.floor_plans (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid,  -- FK added below after projects table
  name            text,
  plan_name       text,
  square_footage  numeric(10,2),
  base_price      numeric(15,2),
  bed_count       integer,
  bath_count      numeric(3,1),
  status          text not null default 'Active'
    check (status in ('Active','Inactive','Draft')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- projects
-- ============================================================
create table public.projects (
  id                    uuid primary key default gen_random_uuid(),
  entity_id             uuid references public.entities(id) on delete set null,
  opportunity_id        uuid references public.opportunities(id) on delete set null,
  project_name          text not null,
  status                text not null default 'Planning'
    check (status in ('Planning','Active','On Hold','Completed','Cancelled')),
  project_type          text
    check (project_type is null or project_type in ('Scattered Lot','Community Development','Lot Development','Lot Purchase')),
  entity_name           text,
  description           text,
  total_budget          numeric(15,2),
  total_spent           numeric(15,2) default 0,
  total_revenue         numeric(15,2) default 0,
  total_profit          numeric(15,2) default 0,
  total_lots            integer,

  -- Property details
  address_street        text,
  address_city          text,
  address_state         text,
  address_zip           text,
  county                text,
  zoning                text,
  total_acreage         numeric(10,2),
  setback_front         text,
  setback_rear          text,
  setback_side          text,
  max_height            text,
  utility_water         text,
  utility_sewer         text,
  utility_electric      text,
  utility_gas           text,
  phases                integer,
  hoa_name              text,
  hoa_fee               numeric(10,2),

  -- Loan info
  lender_name           text,
  loan_officer          text,
  loan_number           text,
  loan_type             text,
  loan_amount           numeric(15,2),
  loan_rate             numeric(5,4),
  loan_origination_date date,
  loan_maturity_date    date,
  loan_balance          numeric(15,2),
  loan_notes            text,
  equity_invested       numeric(15,2),

  -- Entitlements
  rezoning_required     text,
  plat_status           text,
  plat_recording_date   date,
  site_plan_status      text,
  site_plan_date        date,
  stormwater_status     text,
  grading_status        text,
  entitlement_notes     text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Add project_id FK to floor_plans
alter table public.floor_plans
  add constraint floor_plans_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete cascade;

-- Backfill FKs from pipeline tables → projects
alter table public.parcels
  add constraint parcels_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete cascade;

alter table public.due_diligence_items
  add constraint due_diligence_items_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete cascade;

-- ============================================================
-- lots
-- ============================================================
create table public.lots (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  lot_number      text,
  status          text not null default 'Available'
    check (status in ('Available','Reserved','Sold','Under Contract','Hold')),
  floor_plan_name text,
  lot_premium     numeric(15,2),
  base_price      numeric(15,2),
  square_footage  numeric(10,2),
  job_id          uuid,  -- FK added in 00004 after jobs table
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- lot_takedowns
-- ============================================================
create table public.lot_takedowns (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  tranche_name    text,
  scheduled_date  date,
  lot_count       integer,
  purchase_price  numeric(15,2),
  status          text not null default 'Scheduled'
    check (status in ('Scheduled','Completed','Cancelled')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- budget_lines (project-level budget)
-- ============================================================
create table public.budget_lines (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  category    text,
  description text,
  budgeted    numeric(15,2) default 0,
  committed   numeric(15,2) default 0,
  spent       numeric(15,2) default 0,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- horizontal_line_items
-- ============================================================
create table public.horizontal_line_items (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  description     text,
  category        text,
  estimated_cost  numeric(15,2),
  actual_cost     numeric(15,2),
  status          text not null default 'Pending'
    check (status in ('Pending','In Progress','Complete')),
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- milestones (project-level timeline)
-- ============================================================
create table public.milestones (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
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
-- closeout_items
-- ============================================================
create table public.closeout_items (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  item_name       text not null,
  completed       boolean not null default false,
  completed_date  date,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- insurance_certificates
-- ============================================================
create table public.insurance_certificates (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  policy_type     text,
  insurer         text,
  policy_number   text,
  coverage_amount numeric(15,2),
  expiration_date date,
  status          text not null default 'Active'
    check (status in ('Active','Expired','Pending')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- draw_requests
-- ============================================================
create table public.draw_requests (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  draw_number     integer,
  status          text not null default 'Draft'
    check (status in ('Draft','Submitted','Approved','Funded','Rejected')),
  amount          numeric(15,2),
  submitted_date  date,
  funded_date     date,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- project_investors
-- ============================================================
create table public.project_investors (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects(id) on delete cascade,
  investor_name     text,
  investment_amount numeric(15,2),
  ownership_pct     numeric(5,4),
  distributions_paid numeric(15,2) default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

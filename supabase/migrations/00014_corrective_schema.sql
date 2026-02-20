-- 00014_corrective_schema.sql
-- Adds 24 tables and alters existing tables per corrective prompt.
-- Tables: municipalities, site_work_items, sticks_bricks_items, upgrade_packages,
--   pricing_defaults, pricing_exclusions, handoff_checklist_items, job_handoffs,
--   job_handoff_items, project_components, deal_sheets, deal_sheet_site_work,
--   deal_sheet_comps, deal_sheet_upgrades, deal_sheet_checklist, esign_templates,
--   esign_documents, esign_signers, rch_contracts, rch_contract_units,
--   rch_contract_draws, project_plan_catalog, project_elevation_options,
--   project_upgrade_catalog
-- Also alters: floor_plans (new columns), opportunities (buy_box + land committee),
--   entities (entity_type check)

-- ============================================================
-- ALTER floor_plans: add corrected columns
-- ============================================================
alter table public.floor_plans
  add column if not exists heated_sqft numeric(10,2),
  add column if not exists total_sqft numeric(10,2),
  add column if not exists garage_bays integer,
  add column if not exists base_construction_cost numeric(15,2),
  add column if not exists base_sale_price numeric(15,2),
  add column if not exists elevation text,
  add column if not exists stories integer;

-- ============================================================
-- ALTER opportunities: add buy_box + land_committee + municipality_id
-- ============================================================
alter table public.opportunities
  add column if not exists municipality_id uuid,
  add column if not exists buy_box_max_price numeric(15,2),
  add column if not exists buy_box_min_sqft numeric(10,2),
  add column if not exists buy_box_max_land_ratio numeric(5,4),
  add column if not exists buy_box_min_margin numeric(5,4),
  add column if not exists buy_box_pass boolean,
  add column if not exists land_committee_status text,
  add column if not exists land_committee_date date,
  add column if not exists land_committee_notes text;

-- ============================================================
-- municipalities
-- ============================================================
create table public.municipalities (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique,
  county          text,
  state           text default 'SC',
  water_tap       numeric(10,2) default 0,
  sewer_tap       numeric(10,2) default 0,
  gas_tap         numeric(10,2) default 0,
  permitting      numeric(10,2) default 0,
  impact          numeric(10,2) default 0,
  architect       numeric(10,2) default 0,
  engineering     numeric(10,2) default 0,
  survey          numeric(10,2) default 0,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Add FK from opportunities to municipalities
alter table public.opportunities
  add constraint opportunities_municipality_id_fkey
  foreign key (municipality_id) references public.municipalities(id) on delete set null;

-- ============================================================
-- site_work_items (18-line standard itemization)
-- ============================================================
create table public.site_work_items (
  id              uuid primary key default gen_random_uuid(),
  code            text not null,
  description     text not null,
  default_amount  numeric(15,2) default 0,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- sticks_bricks_items (base construction cost components)
-- ============================================================
create table public.sticks_bricks_items (
  id              uuid primary key default gen_random_uuid(),
  floor_plan_id   uuid references public.floor_plans(id) on delete cascade,
  category        text,
  description     text,
  amount          numeric(15,2) default 0,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- upgrade_packages (3 exterior + 8 interior + custom)
-- ============================================================
create table public.upgrade_packages (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  category        text not null check (category in ('Exterior','Interior','Custom')),
  description     text,
  default_amount  numeric(15,2) default 0,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- pricing_defaults
-- ============================================================
create table public.pricing_defaults (
  id              uuid primary key default gen_random_uuid(),
  key             text not null unique,
  value           numeric(15,4) not null,
  description     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- pricing_exclusions
-- ============================================================
create table public.pricing_exclusions (
  id              uuid primary key default gen_random_uuid(),
  category        text,
  description     text not null,
  notes           text,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- handoff_checklist_items (22-item standard checklist)
-- ============================================================
create table public.handoff_checklist_items (
  id              uuid primary key default gen_random_uuid(),
  item_name       text not null,
  category        text,
  sort_order      integer not null default 0,
  required        boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- job_handoffs
-- ============================================================
create table public.job_handoffs (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid not null references public.jobs(id) on delete cascade,
  handoff_date    date,
  handoff_day     text, -- Monday rule
  status          text not null default 'Pending'
    check (status in ('Pending','In Progress','Complete')),
  physical_package boolean default false,
  digital_package  boolean default false,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- job_handoff_items
-- ============================================================
create table public.job_handoff_items (
  id                  uuid primary key default gen_random_uuid(),
  handoff_id          uuid not null references public.job_handoffs(id) on delete cascade,
  checklist_item_id   uuid references public.handoff_checklist_items(id) on delete set null,
  item_name           text,
  completed           boolean not null default false,
  completed_date      date,
  completed_by        text,
  notes               text,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- project_components
-- ============================================================
create table public.project_components (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  component_type  text,
  name            text,
  description     text,
  status          text not null default 'Active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- deal_sheets
-- ============================================================
create table public.deal_sheets (
  id                      uuid primary key default gen_random_uuid(),
  entity_id               uuid references public.entities(id) on delete set null,
  sheet_number            text unique,
  name                    text,
  deal_type               text check (deal_type is null or deal_type in ('scattered_lot','community_dev','lot_dev','lot_purchase')),
  status                  text not null default 'Draft'
    check (status in ('Draft','In Review','Approved','Declined','Archived')),

  -- Connection
  opportunity_id          uuid references public.opportunities(id) on delete set null,
  project_id              uuid references public.projects(id) on delete set null,

  -- Lot acquisition
  address                 text,
  municipality_id         uuid references public.municipalities(id) on delete set null,
  floor_plan_id           uuid references public.floor_plans(id) on delete set null,
  lot_purchase_price      numeric(15,2) default 0,
  closing_costs           numeric(15,2) default 0,
  acquisition_commission  numeric(15,2) default 0,
  acquisition_bonus       numeric(15,2) default 0,
  other_lot_costs         numeric(15,2) default 0,

  -- Construction
  sticks_bricks           numeric(15,2) default 0,
  upgrades                numeric(15,2) default 0,
  soft_costs              numeric(15,2) default 0,
  land_prep               numeric(15,2) default 0,
  site_specific           numeric(15,2) default 0,

  -- Site work
  site_work_total         numeric(15,2) default 0,
  site_work_mode          text default 'lump_sum'
    check (site_work_mode in ('lump_sum','itemized')),
  other_site_costs        numeric(15,2) default 0,

  -- Fixed per-house
  is_rch_related_owner    boolean default true,

  -- Sales
  asset_sales_price       numeric(15,2) default 0,
  selling_cost_rate       numeric(5,4) default 0.0850,
  selling_concessions     numeric(15,2) default 0,

  -- Financing
  ltc_ratio               numeric(5,4) default 0.8500,
  interest_rate           numeric(5,4) default 0.1000,
  cost_of_capital         numeric(5,4) default 0.1600,
  project_duration_days   integer default 120,

  -- Computed results (stored for list views)
  total_lot_basis         numeric(15,2),
  sections_1_to_5         numeric(15,2),
  builder_fee             numeric(15,2),
  contingency             numeric(15,2),
  total_contract_cost     numeric(15,2),
  total_fixed_per_house   numeric(15,2),
  total_project_cost      numeric(15,2),
  loan_amount             numeric(15,2),
  equity_required         numeric(15,2),
  interest_cost           numeric(15,2),
  cost_of_capital_amount  numeric(15,2),
  total_all_in            numeric(15,2),
  selling_costs           numeric(15,2),
  net_proceeds            numeric(15,2),
  net_profit              numeric(15,2),
  net_profit_margin       numeric(5,4),
  land_cost_ratio         numeric(5,4),
  profit_verdict          text,
  land_verdict            text,

  -- Metadata
  created_by              text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ============================================================
-- deal_sheet_site_work (itemized site work lines)
-- ============================================================
create table public.deal_sheet_site_work (
  id              uuid primary key default gen_random_uuid(),
  deal_sheet_id   uuid not null references public.deal_sheets(id) on delete cascade,
  site_work_item_id uuid references public.site_work_items(id) on delete set null,
  description     text,
  amount          numeric(15,2) default 0,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- deal_sheet_comps
-- ============================================================
create table public.deal_sheet_comps (
  id              uuid primary key default gen_random_uuid(),
  deal_sheet_id   uuid not null references public.deal_sheets(id) on delete cascade,
  address         text,
  sale_price      numeric(15,2),
  sale_date       date,
  square_footage  numeric(10,2),
  price_per_sqft  numeric(10,2),
  beds            integer,
  baths           numeric(3,1),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- deal_sheet_upgrades
-- ============================================================
create table public.deal_sheet_upgrades (
  id                uuid primary key default gen_random_uuid(),
  deal_sheet_id     uuid not null references public.deal_sheets(id) on delete cascade,
  upgrade_package_id uuid references public.upgrade_packages(id) on delete set null,
  name              text,
  category          text,
  amount            numeric(15,2) default 0,
  included          boolean default false,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ============================================================
-- deal_sheet_checklist (Jenny's checklist)
-- ============================================================
create table public.deal_sheet_checklist (
  id              uuid primary key default gen_random_uuid(),
  deal_sheet_id   uuid not null references public.deal_sheets(id) on delete cascade,
  item_name       text not null,
  completed       boolean not null default false,
  completed_date  date,
  completed_by    text,
  notes           text,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- esign_templates
-- ============================================================
create table public.esign_templates (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text,
  provider        text default 'docuseal',
  external_id     text,
  category        text,
  status          text not null default 'Active'
    check (status in ('Active','Inactive','Draft')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- esign_documents
-- ============================================================
create table public.esign_documents (
  id              uuid primary key default gen_random_uuid(),
  template_id     uuid references public.esign_templates(id) on delete set null,
  name            text,
  status          text not null default 'Draft'
    check (status in ('Draft','Sent','Viewed','Partially Signed','Completed','Declined','Voided','Expired')),
  record_type     text,
  record_id       uuid,
  external_id     text,
  sent_date       timestamptz,
  completed_date  timestamptz,
  voided_date     timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- esign_signers
-- ============================================================
create table public.esign_signers (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid not null references public.esign_documents(id) on delete cascade,
  name            text,
  email           text,
  role            text,
  status          text not null default 'Pending'
    check (status in ('Pending','Sent','Viewed','Signed','Declined')),
  signed_date     timestamptz,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- rch_contracts
-- ============================================================
create table public.rch_contracts (
  id                  uuid primary key default gen_random_uuid(),
  contract_number     text unique,
  contract_type       text check (contract_type is null or contract_type in ('single','multi','community')),
  status              text not null default 'Intake'
    check (status in ('Intake','Plan Selection','Sterling Pricing','Lot Condition Review','Budget Assembly','Contract Generation','Sent for Signature','Active','Complete','Cancelled')),
  owner_entity_id     uuid references public.entities(id) on delete set null,
  client_name         text,
  project_id          uuid references public.projects(id) on delete set null,
  unit_count          integer default 0,
  contract_amount     numeric(15,2) default 0,
  effective_date      date,
  completion_date     date,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- rch_contract_units
-- ============================================================
create table public.rch_contract_units (
  id                  uuid primary key default gen_random_uuid(),
  contract_id         uuid not null references public.rch_contracts(id) on delete cascade,
  lot_id              uuid references public.lots(id) on delete set null,
  floor_plan_id       uuid references public.floor_plans(id) on delete set null,
  lot_number          text,
  plan_name           text,
  elevation           text,
  phase               text,
  -- Sterling PO
  sterling_requested  boolean default false,
  sterling_received   boolean default false,
  sterling_amount     numeric(15,2),
  sterling_status     text,
  -- Lot condition
  lot_condition_cm    text,
  lot_condition_date  date,
  lot_condition_notes text,
  site_specific_cost  numeric(15,2) default 0,
  -- Budget (7 sections + fixed)
  section_1_sticks    numeric(15,2) default 0,
  section_2_upgrades  numeric(15,2) default 0,
  section_3_soft      numeric(15,2) default 0,
  section_4_land_prep numeric(15,2) default 0,
  section_5_site      numeric(15,2) default 0,
  section_6_builder_fee numeric(15,2) default 0,
  section_7_contingency numeric(15,2) default 0,
  fixed_per_house     numeric(15,2) default 0,
  unit_total          numeric(15,2) default 0,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- rch_contract_draws
-- ============================================================
create table public.rch_contract_draws (
  id              uuid primary key default gen_random_uuid(),
  contract_id     uuid not null references public.rch_contracts(id) on delete cascade,
  draw_number     integer,
  amount          numeric(15,2),
  status          text not null default 'Draft'
    check (status in ('Draft','Submitted','Approved','Funded','Rejected')),
  submitted_date  date,
  approved_date   date,
  funded_date     date,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- project_plan_catalog
-- ============================================================
create table public.project_plan_catalog (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  floor_plan_id   uuid references public.floor_plans(id) on delete set null,
  plan_name       text,
  base_price      numeric(15,2),
  lot_count       integer default 0,
  status          text not null default 'Active'
    check (status in ('Active','Inactive')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- project_elevation_options
-- ============================================================
create table public.project_elevation_options (
  id                  uuid primary key default gen_random_uuid(),
  plan_catalog_id     uuid not null references public.project_plan_catalog(id) on delete cascade,
  elevation_name      text,
  price_adjustment    numeric(15,2) default 0,
  description         text,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- project_upgrade_catalog
-- ============================================================
create table public.project_upgrade_catalog (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects(id) on delete cascade,
  upgrade_package_id  uuid references public.upgrade_packages(id) on delete set null,
  name                text,
  category            text,
  amount              numeric(15,2) default 0,
  included_by_default boolean default false,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- Enable RLS + policies on all new tables
-- ============================================================
do $$
declare
  tbl text;
begin
  for tbl in
    values ('municipalities'),('site_work_items'),('sticks_bricks_items'),
           ('upgrade_packages'),('pricing_defaults'),('pricing_exclusions'),
           ('handoff_checklist_items'),('job_handoffs'),('job_handoff_items'),
           ('project_components'),('deal_sheets'),('deal_sheet_site_work'),
           ('deal_sheet_comps'),('deal_sheet_upgrades'),('deal_sheet_checklist'),
           ('esign_templates'),('esign_documents'),('esign_signers'),
           ('rch_contracts'),('rch_contract_units'),('rch_contract_draws'),
           ('project_plan_catalog'),('project_elevation_options'),('project_upgrade_catalog')
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format(
      'create policy "Authenticated users full access" on public.%I '
      'for all to authenticated using (true) with check (true)',
      tbl
    );
  end loop;
end;
$$;

-- ============================================================
-- updated_at triggers on new tables that have the column
-- ============================================================
do $$
declare
  tbl text;
begin
  for tbl in
    values ('municipalities'),('site_work_items'),('sticks_bricks_items'),
           ('upgrade_packages'),('pricing_defaults'),('pricing_exclusions'),
           ('handoff_checklist_items'),('job_handoffs'),('job_handoff_items'),
           ('project_components'),('deal_sheets'),('deal_sheet_site_work'),
           ('deal_sheet_comps'),('deal_sheet_upgrades'),('deal_sheet_checklist'),
           ('esign_templates'),('esign_documents'),('esign_signers'),
           ('rch_contracts'),('rch_contract_units'),('rch_contract_draws'),
           ('project_plan_catalog'),('project_elevation_options'),('project_upgrade_catalog')
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I '
      'for each row execute function public.set_updated_at()',
      tbl
    );
  end loop;
end;
$$;

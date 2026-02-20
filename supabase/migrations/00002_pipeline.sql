-- 00002_pipeline.sql
-- Pipeline module: opportunities, parcels, deal_analyses,
--   due_diligence_items, comparable_sales, counter_offers

-- ============================================================
-- opportunities
-- ============================================================
create table public.opportunities (
  id                    uuid primary key default gen_random_uuid(),
  entity_id             uuid references public.entities(id) on delete set null,
  opportunity_name      text not null,
  status                text not null default 'New Lead'
    check (status in ('New Lead','Qualifying','Analyzing','Due Diligence','Under Contract','Closed Won','Closed Lost','On Hold')),
  project_type          text
    check (project_type is null or project_type in ('Scattered Lot','Community Development','Lot Development','Lot Purchase')),
  source                text,
  assigned_to           text,
  priority              text
    check (priority is null or priority in ('Low','Medium','High','Urgent')),
  probability           numeric(5,2),
  estimated_value       numeric(15,2),
  description           text,

  -- Property details
  address_street        text,
  address_city          text,
  address_state         text,
  address_zip           text,
  county                text,
  parcel_id             text,
  acreage               numeric(10,2),
  zoning                text,
  topography            text,
  flood_zone            text,
  water_status          text,
  sewer_status          text,
  electric_status       text,
  gas_status            text,
  -- Scattered Lot specifics
  lot_price             numeric(15,2),
  lot_dimensions        text,
  -- Community Development specifics
  total_lots            integer,
  num_phases            integer,
  infrastructure_budget numeric(15,2),
  hoa_required          text,

  -- Underwriting
  financing_type        text,
  ltc_ratio             numeric(5,4),
  interest_rate         numeric(5,4),
  loan_term_months      integer,
  target_gross_margin   numeric(5,4),
  target_net_margin     numeric(5,4),
  target_roi            numeric(5,4),
  target_annualized_roi numeric(5,4),
  market_risk           text,
  execution_risk        text,
  entitlement_risk      text,
  overall_risk          text,
  underwriting_notes    text,

  -- Offer / Contract
  offer_amount          numeric(15,2),
  offer_date            date,
  offer_status          text,
  earnest_money         numeric(15,2),
  contract_price        numeric(15,2),
  effective_date        date,
  dd_period_end         date,
  closing_date          date,
  special_conditions    text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ============================================================
-- parcels (shared by opportunities & projects)
-- ============================================================
create table public.parcels (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  uuid references public.opportunities(id) on delete cascade,
  project_id      uuid,  -- FK added in 00003 after projects table exists
  parcel_number   text,
  address         text,
  acreage         numeric(10,2),
  zoning          text,
  apn             text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- deal_analyses
-- ============================================================
create table public.deal_analyses (
  id                uuid primary key default gen_random_uuid(),
  opportunity_id    uuid not null references public.opportunities(id) on delete cascade,
  version           integer not null default 1,
  purchase_price    numeric(15,2),
  site_work         numeric(15,2),
  base_build_cost   numeric(15,2),
  upgrade_package   numeric(15,2),
  asp               numeric(15,2),
  concessions       numeric(15,2),
  duration_months   integer,
  interest_rate     numeric(5,4),
  ltc_ratio         numeric(5,4),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ============================================================
-- due_diligence_items (shared by opportunities & projects)
-- ============================================================
create table public.due_diligence_items (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  uuid references public.opportunities(id) on delete cascade,
  project_id      uuid,  -- FK added in 00003
  item_name       text not null,
  status          text not null default 'Pending'
    check (status in ('Pending','In Progress','Complete','N/A')),
  category        text,
  notes           text,
  completed_date  date,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- comparable_sales
-- ============================================================
create table public.comparable_sales (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  uuid not null references public.opportunities(id) on delete cascade,
  address         text,
  sale_price      numeric(15,2),
  sale_date       date,
  square_footage  numeric(10,2),
  price_per_sqft  numeric(10,2),
  beds            integer,
  baths           numeric(3,1),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- counter_offers
-- ============================================================
create table public.counter_offers (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  uuid not null references public.opportunities(id) on delete cascade,
  counter_number  integer,
  offered_by      text,
  amount          numeric(15,2),
  terms           text,
  status          text,
  date            date,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 00005_disposition.sql
-- Disposition module: dispositions (~103 cols), disposition_options,
--   offers, showings, listing_photos, disposition_files

-- ============================================================
-- dispositions (wide table — buyer, pricing, lender, closing,
--   settlement, marketing, post-closing)
-- ============================================================
create table public.dispositions (
  id                        uuid primary key default gen_random_uuid(),
  entity_id                 uuid references public.entities(id) on delete set null,
  project_id                uuid references public.projects(id) on delete set null,
  lot_id                    uuid references public.lots(id) on delete set null,
  job_id                    uuid references public.jobs(id) on delete set null,

  -- Identity & status
  status                    text not null default 'Lead'
    check (status in ('Lead','Prospect','Under Contract','Closing','Closed','Cancelled','Dead')),
  lot_number                text,
  project_name              text,
  address                   text,
  floor_plan                text,
  notes                     text,

  -- Key dates
  listed_date               date,
  contract_date             date,
  closing_date              date,
  actual_closed_date        date,

  -- Buyer info
  buyer_name                text,
  buyer_email               text,
  buyer_phone               text,
  buyer_address             text,
  co_buyer_name             text,
  co_buyer_email            text,

  -- Buyer's agent
  buyer_agent_name          text,
  buyer_agent_email         text,
  buyer_agent_phone         text,
  buyer_agent_brokerage     text,

  -- Pre-approval
  pre_approval_status       text,
  pre_approval_lender       text,
  pre_approval_date         date,
  pre_approval_amount       numeric(15,2),

  -- Pricing & contract
  base_price                numeric(15,2),
  lot_premium               numeric(15,2),
  options_total             numeric(15,2),
  incentives                numeric(15,2),
  contract_price            numeric(15,2),
  emd_amount                numeric(15,2),
  emd_received_date         date,
  emd_held_by               text,
  inspection_deadline       date,
  appraisal_deadline        date,
  financing_deadline        date,

  -- Lender / financing
  financing_type            text,
  lender_name               text,
  loan_officer              text,
  loan_officer_email        text,
  loan_officer_phone        text,
  loan_amount               numeric(15,2),
  interest_rate             numeric(5,4),
  down_payment_pct          numeric(5,4),
  appraisal_status          text,
  appraisal_date            date,
  appraised_value           numeric(15,2),
  ctc_status                text,
  ctc_date                  date,
  ctc_notes                 text,

  -- 12-step closing timeline (each nullable date)
  contract_executed         date,
  title_ordered             date,
  earnest_money_received    date,
  inspections_complete      date,
  appraisal_ordered         date,
  appraisal_received        date,
  loan_approved             date,
  clear_to_close            date,
  closing_disclosure_sent   date,
  final_walkthrough         date,
  closing_scheduled         date,
  closed_funded             date,

  -- Closing details
  title_company             text,
  closing_agent             text,
  closing_location          text,
  closing_time              text,
  closing_notes             text,

  -- Settlement
  gross_sale_price          numeric(15,2),
  buyer_credits             numeric(15,2),
  seller_concessions        numeric(15,2),
  listing_commission_pct    numeric(5,4),
  listing_commission        numeric(15,2),
  buyer_agent_commission_pct numeric(5,4),
  buyer_agent_commission    numeric(15,2),
  closing_costs             numeric(15,2),
  loan_payoff               numeric(15,2),
  other_settlement_costs    numeric(15,2),
  net_proceeds              numeric(15,2),
  settlement_statement_path text,
  wire_confirmation_path    text,

  -- Post-closing
  warranty_start_date       date,
  warranty_end_1yr          date,
  warranty_end_structural   date,
  walk_30_day_date          date,
  walk_30_day_status        text,
  walk_11_month_date        date,
  walk_11_month_status      text,
  satisfaction_rating       text,
  survey_date               date,
  customer_feedback         text,
  referral_willing          text,
  post_closing_notes        text,

  -- Marketing
  marketing_description     text,
  virtual_tour_url          text,
  mls_number                text,
  listing_agent             text,
  listing_brokerage         text,
  zillow_url                text,
  realtor_url               text,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- ============================================================
-- disposition_options
-- ============================================================
create table public.disposition_options (
  id              uuid primary key default gen_random_uuid(),
  disposition_id  uuid not null references public.dispositions(id) on delete cascade,
  category        text,
  item_name       text,
  amount          numeric(15,2),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- offers
-- ============================================================
create table public.offers (
  id              uuid primary key default gen_random_uuid(),
  disposition_id  uuid not null references public.dispositions(id) on delete cascade,
  offer_amount    numeric(15,2),
  offer_date      date,
  status          text not null default 'Pending'
    check (status in ('Pending','Accepted','Rejected','Countered','Expired','Withdrawn')),
  buyer_name      text,
  earnest_money   numeric(15,2),
  contingencies   text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- showings
-- ============================================================
create table public.showings (
  id              uuid primary key default gen_random_uuid(),
  disposition_id  uuid not null references public.dispositions(id) on delete cascade,
  showing_date    timestamptz,
  agent_name      text,
  feedback        text,
  result          text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- listing_photos
-- ============================================================
create table public.listing_photos (
  id              uuid primary key default gen_random_uuid(),
  disposition_id  uuid not null references public.dispositions(id) on delete cascade,
  file_name       text,
  storage_path    text,
  caption         text,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- disposition_files
-- ============================================================
create table public.disposition_files (
  id              uuid primary key default gen_random_uuid(),
  disposition_id  uuid not null references public.dispositions(id) on delete cascade,
  file_name       text,
  storage_path    text,
  file_size       bigint,
  category        text,
  created_at      timestamptz not null default now()
);

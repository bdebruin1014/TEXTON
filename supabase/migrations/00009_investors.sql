-- 00009_investors.sql
-- Investors module: funds, investments, capital_calls, distributions

-- ============================================================
-- funds
-- ============================================================
create table public.funds (
  id                uuid primary key default gen_random_uuid(),
  entity_id         uuid references public.entities(id) on delete set null,
  name              text not null,
  fund_type         text,
  status            text not null default 'Active'
    check (status in ('Active','Closed','Fundraising','Winding Down')),
  total_committed   numeric(15,2) default 0,
  total_called      numeric(15,2) default 0,
  total_deployed    numeric(15,2) default 0,
  total_distributed numeric(15,2) default 0,
  description       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ============================================================
-- investments
-- ============================================================
create table public.investments (
  id                    uuid primary key default gen_random_uuid(),
  fund_id               uuid not null references public.funds(id) on delete cascade,
  investor_name         text,
  status                text not null default 'Active'
    check (status in ('Active','Redeemed','Pending')),
  commitment_amount     numeric(15,2),
  called_amount         numeric(15,2) default 0,
  distributed_amount    numeric(15,2) default 0,
  ownership_pct         numeric(5,4),
  distributions_received numeric(15,2) default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ============================================================
-- capital_calls
-- ============================================================
create table public.capital_calls (
  id              uuid primary key default gen_random_uuid(),
  fund_id         uuid references public.funds(id) on delete set null,
  fund_name       text,
  call_number     text,
  call_date       date not null default current_date,
  status          text not null default 'Draft'
    check (status in ('Draft','Issued','Partial','Collected','Cancelled')),
  total_amount    numeric(15,2),
  amount_received numeric(15,2) default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- distributions
-- ============================================================
create table public.distributions (
  id                  uuid primary key default gen_random_uuid(),
  fund_id             uuid references public.funds(id) on delete set null,
  fund_name           text,
  distribution_number text,
  distribution_date   date not null default current_date,
  status              text not null default 'Draft'
    check (status in ('Draft','Issued','Paid','Cancelled')),
  total_amount        numeric(15,2),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

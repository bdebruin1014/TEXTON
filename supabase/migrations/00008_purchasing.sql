-- 00008_purchasing.sql
-- Purchasing module: purchase_orders, estimates

-- ============================================================
-- purchase_orders
-- ============================================================
create table public.purchase_orders (
  id          uuid primary key default gen_random_uuid(),
  entity_id   uuid references public.entities(id) on delete set null,
  job_id      uuid references public.jobs(id) on delete set null,
  po_number   text,
  vendor_name text,
  amount      numeric(15,2),
  issue_date  date,
  status      text not null default 'Draft'
    check (status in ('Draft','Issued','Approved','Received','Cancelled')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- estimates
-- ============================================================
create table public.estimates (
  id              uuid primary key default gen_random_uuid(),
  entity_id       uuid references public.entities(id) on delete set null,
  estimate_number text,
  project_name    text,
  status          text not null default 'Draft'
    check (status in ('Draft','Sent','Accepted','Converted','Expired')),
  total_amount    numeric(15,2),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

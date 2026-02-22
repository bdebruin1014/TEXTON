-- 20260221_cost_books.sql
-- Versioned Cost Book system: named, dated collections of all pricing
-- for floor plans, upgrades, site work, and fees.
-- Enables tracking pricing vintages, year-over-year comparison, and
-- per-deal cost book selection.

-- ============================================================
-- 1. cost_books — Master table for pricing vintages
-- ============================================================
create table if not exists public.cost_books (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text,
  effective_date  date,
  status          text not null default 'Draft'
    check (status in ('Draft','Active','Archived')),
  is_default      boolean not null default false,
  source_book_id  uuid references public.cost_books(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Only one default cost book at a time
create unique index if not exists cost_books_single_default
  on public.cost_books (is_default)
  where (is_default = true);

-- ============================================================
-- 2. cost_book_plans — Per-plan S&B totals within a cost book
-- ============================================================
create table if not exists public.cost_book_plans (
  id                    uuid primary key default gen_random_uuid(),
  cost_book_id          uuid not null references public.cost_books(id) on delete cascade,
  floor_plan_id         uuid not null references public.floor_plans(id) on delete cascade,
  contract_snb          numeric(15,2),
  dm_budget_snb         numeric(15,2),
  dm_budget_total       numeric(15,2),
  contract_total        numeric(15,2),
  base_construction_cost numeric(15,2),
  cost_per_sf           numeric(8,2),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (cost_book_id, floor_plan_id)
);

-- ============================================================
-- 3. cost_book_line_items — 53 S&B line items per plan per cost book
-- ============================================================
create table if not exists public.cost_book_line_items (
  id              uuid primary key default gen_random_uuid(),
  cost_book_id    uuid not null references public.cost_books(id) on delete cascade,
  floor_plan_id   uuid not null references public.floor_plans(id) on delete cascade,
  category        text,
  description     text,
  amount          numeric(15,2) default 0,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- 4. cost_book_upgrades — Upgrade package pricing per vintage
-- ============================================================
create table if not exists public.cost_book_upgrades (
  id                  uuid primary key default gen_random_uuid(),
  cost_book_id        uuid not null references public.cost_books(id) on delete cascade,
  upgrade_package_id  uuid not null references public.upgrade_packages(id) on delete cascade,
  amount              numeric(15,2) default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (cost_book_id, upgrade_package_id)
);

-- ============================================================
-- 5. cost_book_site_work — Site work defaults per vintage
-- ============================================================
create table if not exists public.cost_book_site_work (
  id                uuid primary key default gen_random_uuid(),
  cost_book_id      uuid not null references public.cost_books(id) on delete cascade,
  site_work_item_id uuid not null references public.site_work_items(id) on delete cascade,
  amount            numeric(15,2) default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (cost_book_id, site_work_item_id)
);

-- ============================================================
-- 6. cost_book_fees — Fee schedule overrides per vintage
-- ============================================================
create table if not exists public.cost_book_fees (
  id              uuid primary key default gen_random_uuid(),
  cost_book_id    uuid not null references public.cost_books(id) on delete cascade,
  builder_fee     numeric(15,2),
  am_fee          numeric(15,2),
  builder_warranty numeric(15,2),
  builders_risk   numeric(15,2),
  po_fee          numeric(15,2),
  bookkeeping     numeric(15,2),
  pm_fee          numeric(15,2),
  utilities       numeric(15,2),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (cost_book_id)
);

-- ============================================================
-- 7. ALTER deal_sheets — Add cost_book_id FK
-- ============================================================
alter table public.deal_sheets
  add column if not exists cost_book_id uuid references public.cost_books(id) on delete set null;

-- ============================================================
-- 8. Enable RLS + policies on all new tables
-- ============================================================
do $$
declare
  tbl text;
begin
  for tbl in
    values ('cost_books'),('cost_book_plans'),('cost_book_line_items'),
           ('cost_book_upgrades'),('cost_book_site_work'),('cost_book_fees')
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format(
      'drop policy if exists "Authenticated users full access" on public.%I',
      tbl
    );
    execute format(
      'create policy "Authenticated users full access" on public.%I '
      'for all to authenticated using (true) with check (true)',
      tbl
    );
  end loop;
end;
$$;

-- ============================================================
-- 9. updated_at triggers on all new tables
-- ============================================================
do $$
declare
  tbl text;
begin
  for tbl in
    values ('cost_books'),('cost_book_plans'),('cost_book_line_items'),
           ('cost_book_upgrades'),('cost_book_site_work'),('cost_book_fees')
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I',
      tbl
    );
    execute format(
      'create trigger set_updated_at before update on public.%I '
      'for each row execute function public.set_updated_at()',
      tbl
    );
  end loop;
end;
$$;

-- ============================================================
-- 10. Seed initial cost books from existing data
-- ============================================================

-- (a) "DM Budget Sep 2025" — Active, is_default
insert into public.cost_books (id, name, description, effective_date, status, is_default)
values (
  'a0000000-0000-0000-0000-000000000001',
  'DM Budget Sep 2025',
  'DM Budget pricing from September 2025. Auto-populated from floor plan data.',
  '2025-09-01',
  'Active',
  true
)
on conflict (id) do nothing;

-- (b) "RC Pricing Guide (Legacy)" — Archived
insert into public.cost_books (id, name, description, effective_date, status, is_default)
values (
  'a0000000-0000-0000-0000-000000000002',
  'RC Pricing Guide (Legacy)',
  'Contract pricing from the RC Pricing Guide. Auto-populated from floor plan data.',
  '2025-01-01',
  'Archived',
  false
)
on conflict (id) do nothing;

-- Seed cost_book_plans for DM Budget (from dm_budget_snb on floor_plans)
insert into public.cost_book_plans (cost_book_id, floor_plan_id, contract_snb, dm_budget_snb, dm_budget_total, contract_total, base_construction_cost, cost_per_sf)
select
  'a0000000-0000-0000-0000-000000000001',
  fp.id,
  fp.contract_snb,
  fp.dm_budget_snb,
  fp.dm_budget_total,
  fp.contract_total,
  fp.base_construction_cost,
  fp.cost_per_sf
from public.floor_plans fp
where fp.status = 'Active'
on conflict do nothing;

-- Seed cost_book_plans for RC Pricing Guide (same data, represents contract pricing)
insert into public.cost_book_plans (cost_book_id, floor_plan_id, contract_snb, dm_budget_snb, dm_budget_total, contract_total, base_construction_cost, cost_per_sf)
select
  'a0000000-0000-0000-0000-000000000002',
  fp.id,
  fp.contract_snb,
  fp.dm_budget_snb,
  fp.dm_budget_total,
  fp.contract_total,
  fp.base_construction_cost,
  fp.cost_per_sf
from public.floor_plans fp
where fp.status = 'Active'
on conflict do nothing;

-- Seed cost_book_line_items from sticks_bricks_items (TULIP's 53 items)
insert into public.cost_book_line_items (cost_book_id, floor_plan_id, category, description, amount, sort_order)
select
  'a0000000-0000-0000-0000-000000000001',
  sbi.floor_plan_id,
  sbi.category,
  sbi.description,
  sbi.amount,
  sbi.sort_order
from public.sticks_bricks_items sbi
where not exists (
  select 1 from public.cost_book_line_items
  where cost_book_id = 'a0000000-0000-0000-0000-000000000001'
  limit 1
);

insert into public.cost_book_line_items (cost_book_id, floor_plan_id, category, description, amount, sort_order)
select
  'a0000000-0000-0000-0000-000000000002',
  sbi.floor_plan_id,
  sbi.category,
  sbi.description,
  sbi.amount,
  sbi.sort_order
from public.sticks_bricks_items sbi
where not exists (
  select 1 from public.cost_book_line_items
  where cost_book_id = 'a0000000-0000-0000-0000-000000000002'
  limit 1
);

-- Seed cost_book_upgrades from upgrade_packages
insert into public.cost_book_upgrades (cost_book_id, upgrade_package_id, amount)
select 'a0000000-0000-0000-0000-000000000001', up.id, up.default_amount
from public.upgrade_packages up
on conflict do nothing;

insert into public.cost_book_upgrades (cost_book_id, upgrade_package_id, amount)
select 'a0000000-0000-0000-0000-000000000002', up.id, up.default_amount
from public.upgrade_packages up
on conflict do nothing;

-- Seed cost_book_site_work from site_work_items
insert into public.cost_book_site_work (cost_book_id, site_work_item_id, amount)
select 'a0000000-0000-0000-0000-000000000001', swi.id, swi.default_amount
from public.site_work_items swi
on conflict do nothing;

insert into public.cost_book_site_work (cost_book_id, site_work_item_id, amount)
select 'a0000000-0000-0000-0000-000000000002', swi.id, swi.default_amount
from public.site_work_items swi
on conflict do nothing;

-- Seed cost_book_fees from fee_schedule (if it has the right columns)
insert into public.cost_book_fees (cost_book_id, builder_fee, am_fee, builder_warranty, builders_risk, po_fee, bookkeeping, pm_fee, utilities)
select 'a0000000-0000-0000-0000-000000000001',
  fs.builder_fee, fs.am_fee, fs.builder_warranty, fs.builders_risk,
  fs.po_fee, fs.bookkeeping, fs.pm_fee, fs.utilities
from public.fee_schedule fs
limit 1
on conflict do nothing;

insert into public.cost_book_fees (cost_book_id, builder_fee, am_fee, builder_warranty, builders_risk, po_fee, bookkeeping, pm_fee, utilities)
select 'a0000000-0000-0000-0000-000000000002',
  fs.builder_fee, fs.am_fee, fs.builder_warranty, fs.builders_risk,
  fs.po_fee, fs.bookkeeping, fs.pm_fee, fs.utilities
from public.fee_schedule fs
limit 1
on conflict do nothing;

-- ============================================================
-- 11. Clone function — atomically copies a cost book
-- ============================================================
create or replace function public.clone_cost_book(
  source_id uuid,
  new_name text,
  new_effective_date date default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_book_id uuid;
begin
  -- Create the new cost book
  insert into public.cost_books (name, description, effective_date, status, is_default, source_book_id)
  select
    new_name,
    'Cloned from ' || cb.name,
    coalesce(new_effective_date, current_date),
    'Draft',
    false,
    source_id
  from public.cost_books cb
  where cb.id = source_id
  returning id into new_book_id;

  if new_book_id is null then
    raise exception 'Source cost book not found: %', source_id;
  end if;

  -- Copy plans
  insert into public.cost_book_plans (cost_book_id, floor_plan_id, contract_snb, dm_budget_snb, dm_budget_total, contract_total, base_construction_cost, cost_per_sf)
  select new_book_id, floor_plan_id, contract_snb, dm_budget_snb, dm_budget_total, contract_total, base_construction_cost, cost_per_sf
  from public.cost_book_plans
  where cost_book_id = source_id;

  -- Copy line items
  insert into public.cost_book_line_items (cost_book_id, floor_plan_id, category, description, amount, sort_order)
  select new_book_id, floor_plan_id, category, description, amount, sort_order
  from public.cost_book_line_items
  where cost_book_id = source_id;

  -- Copy upgrades
  insert into public.cost_book_upgrades (cost_book_id, upgrade_package_id, amount)
  select new_book_id, upgrade_package_id, amount
  from public.cost_book_upgrades
  where cost_book_id = source_id;

  -- Copy site work
  insert into public.cost_book_site_work (cost_book_id, site_work_item_id, amount)
  select new_book_id, site_work_item_id, amount
  from public.cost_book_site_work
  where cost_book_id = source_id;

  -- Copy fees
  insert into public.cost_book_fees (cost_book_id, builder_fee, am_fee, builder_warranty, builders_risk, po_fee, bookkeeping, pm_fee, utilities)
  select new_book_id, builder_fee, am_fee, builder_warranty, builders_risk, po_fee, bookkeeping, pm_fee, utilities
  from public.cost_book_fees
  where cost_book_id = source_id;

  return new_book_id;
end;
$$;

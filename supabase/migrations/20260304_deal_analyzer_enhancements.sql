-- ============================================================
-- Deal Analyzer Enhancements
-- Adds scenario support to deal_sheets, floor_plan_images table,
-- and floor-plan-images storage bucket.
-- ============================================================

-- 1. Add scenario columns to deal_sheets
alter table public.deal_sheets
  add column if not exists scenario_number      integer default 1,
  add column if not exists scenario_name        text,
  add column if not exists is_primary           boolean default false,
  add column if not exists sensitivity_results  jsonb,
  add column if not exists breakeven_asp        numeric(15,2),
  add column if not exists min_asp_5pct_margin  numeric(15,2),
  add column if not exists cost_book_id         uuid references public.cost_books(id) on delete set null;

-- Constraint: scenario_number 1-5
alter table public.deal_sheets
  add constraint deal_sheets_scenario_number_check
  check (scenario_number is null or (scenario_number >= 1 and scenario_number <= 5));

-- Unique partial index: only one primary per opportunity
create unique index if not exists deal_sheets_one_primary_per_opp
  on public.deal_sheets (opportunity_id)
  where is_primary = true;

-- Index for querying scenarios by opportunity
create index if not exists deal_sheets_opp_scenario
  on public.deal_sheets (opportunity_id, scenario_number);

-- 2. Create floor_plan_images table
create table if not exists public.floor_plan_images (
  id                uuid primary key default gen_random_uuid(),
  floor_plan_id     uuid not null references public.floor_plans(id) on delete cascade,
  image_type        text not null default 'rendering'
    check (image_type in ('rendering','floorplan','elevation','photo')),
  storage_path      text not null,
  is_primary        boolean not null default false,
  elevation_variant text,
  display_order     integer not null default 0,
  caption           text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- RLS
alter table public.floor_plan_images enable row level security;

drop policy if exists "authenticated_full_access" on public.floor_plan_images;
create policy "authenticated_full_access" on public.floor_plan_images
  for all to authenticated
  using (true)
  with check (true);

-- Updated-at trigger
create trigger set_updated_at before update on public.floor_plan_images
  for each row execute function public.set_updated_at();

-- Unique partial index: one primary per floor plan + image type
create unique index if not exists floor_plan_images_one_primary
  on public.floor_plan_images (floor_plan_id, image_type)
  where is_primary = true;

-- 3. Storage bucket for floor plan images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'floor-plan-images',
  'floor-plan-images',
  true,
  10485760, -- 10MB
  array['image/jpeg','image/png','image/webp','image/svg+xml']
)
on conflict (id) do nothing;

-- Storage RLS: authenticated users can upload/read
create policy "authenticated_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'floor-plan-images');

create policy "public_read" on storage.objects
  for select to public
  using (bucket_id = 'floor-plan-images');

create policy "authenticated_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'floor-plan-images');

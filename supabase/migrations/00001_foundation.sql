-- 00001_foundation.sql
-- Foundation: trigger function, entities, user_profiles

-- Enable UUID extension (usually enabled by default on Supabase)
create extension if not exists "pgcrypto";

-- ============================================================
-- Reusable trigger function: set updated_at = now()
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- entities
-- ============================================================
create table public.entities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  entity_type text,
  status      text not null default 'Active'
    check (status in ('Active','Inactive')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- user_profiles
-- ============================================================
create table public.user_profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  role        text,
  status      text not null default 'Active'
    check (status in ('Active','Inactive','Invited')),
  entity_id   uuid references public.entities(id) on delete set null,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

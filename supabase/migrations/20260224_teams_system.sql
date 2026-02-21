-- 20260224_teams_system.sql
-- Evolve assignment_groups into a full Teams system with member management
-- and polymorphic record assignment.

-- ============================================================
-- 1. EVOLVE assignment_groups → teams
-- ============================================================

-- Add new columns to assignment_groups before renaming
alter table public.assignment_groups
  add column if not exists entity_id uuid references public.entities(id) on delete set null,
  add column if not exists team_type text not null default 'department'
    check (team_type in ('department', 'project', 'ad_hoc')),
  add column if not exists color text default '#48BB78',
  add column if not exists member_count integer not null default 0;

-- Rename table
alter table public.assignment_groups rename to teams;

-- Drop the old jsonb members column (data migrated to team_members)
alter table public.teams drop column if exists members;

-- ============================================================
-- 2. team_members — junction table
-- ============================================================

create table public.team_members (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  user_id    uuid not null references public.user_profiles(id) on delete cascade,
  role       text not null default 'member'
    check (role in ('lead', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create index idx_team_members_team on public.team_members(team_id);
create index idx_team_members_user on public.team_members(user_id);

-- ============================================================
-- 3. record_teams — polymorphic record assignment
-- ============================================================

create table public.record_teams (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid references public.teams(id) on delete cascade,
  user_id         uuid references public.user_profiles(id) on delete cascade,
  record_type     text not null
    check (record_type in ('opportunity', 'project', 'job', 'disposition', 'matter', 'rch_contract')),
  record_id       uuid not null,
  assignment_role text not null default 'responsible'
    check (assignment_role in ('responsible', 'accountable', 'consulted', 'informed')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- At least one of team_id or user_id must be set
  constraint record_teams_has_assignee check (team_id is not null or user_id is not null)
);

create index idx_record_teams_record on public.record_teams(record_type, record_id);
create index idx_record_teams_team on public.record_teams(team_id);
create index idx_record_teams_user on public.record_teams(user_id);

-- ============================================================
-- 4. TRIGGERS — member_count auto-update
-- ============================================================

create or replace function public.update_team_member_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.teams set member_count = member_count + 1 where id = new.team_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.teams set member_count = member_count - 1 where id = old.team_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger trg_team_member_count
  after insert or delete on public.team_members
  for each row execute function public.update_team_member_count();

-- updated_at triggers
create trigger set_teams_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

create trigger set_team_members_updated_at
  before update on public.team_members
  for each row execute function public.set_updated_at();

create trigger set_record_teams_updated_at
  before update on public.record_teams
  for each row execute function public.set_updated_at();

-- ============================================================
-- 5. RLS POLICIES
-- ============================================================

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.record_teams enable row level security;

-- Teams: entity-scoped (or global teams with null entity_id visible to all)
create policy "teams_select" on public.teams
  for select to authenticated
  using (entity_id is null or entity_id = public.auth_entity_id());

create policy "teams_insert" on public.teams
  for insert to authenticated
  with check (entity_id is null or entity_id = public.auth_entity_id());

create policy "teams_update" on public.teams
  for update to authenticated
  using (entity_id is null or entity_id = public.auth_entity_id());

create policy "teams_delete" on public.teams
  for delete to authenticated
  using (entity_id is null or entity_id = public.auth_entity_id());

-- Team members: accessible if you can see the team
create policy "team_members_select" on public.team_members
  for select to authenticated
  using (exists (
    select 1 from public.teams t
    where t.id = team_id
    and (t.entity_id is null or t.entity_id = public.auth_entity_id())
  ));

create policy "team_members_insert" on public.team_members
  for insert to authenticated
  with check (exists (
    select 1 from public.teams t
    where t.id = team_id
    and (t.entity_id is null or t.entity_id = public.auth_entity_id())
  ));

create policy "team_members_update" on public.team_members
  for update to authenticated
  using (exists (
    select 1 from public.teams t
    where t.id = team_id
    and (t.entity_id is null or t.entity_id = public.auth_entity_id())
  ));

create policy "team_members_delete" on public.team_members
  for delete to authenticated
  using (exists (
    select 1 from public.teams t
    where t.id = team_id
    and (t.entity_id is null or t.entity_id = public.auth_entity_id())
  ));

-- Record teams: accessible to authenticated users (record-level RLS handled by parent)
create policy "record_teams_select" on public.record_teams
  for select to authenticated using (true);

create policy "record_teams_insert" on public.record_teams
  for insert to authenticated with check (true);

create policy "record_teams_update" on public.record_teams
  for update to authenticated using (true);

create policy "record_teams_delete" on public.record_teams
  for delete to authenticated using (true);

-- Drop old RLS policy on assignment_groups if it exists (now teams)
do $$
begin
  execute 'drop policy if exists "Authenticated users full access" on public.teams';
  execute 'drop policy if exists "teams_entity_select" on public.teams';
exception when others then null;
end;
$$;

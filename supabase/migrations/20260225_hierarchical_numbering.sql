-- 20260225_hierarchical_numbering.sql
-- Hierarchical record numbering system.
--
-- Format:
--   Entity:       (name serves as prefix, e.g. "GSP Fund")
--   Opportunity:  YY-EntityName-NNN           e.g. 26-GSP Fund-001
--   Project:      YY-EntityName-NNN-ProjName  e.g. 26-GSP Fund-001-Oslo
--   Lot/Job/Dispo: YY-EntityName-NNN-ProjName-LLL  e.g. 26-GSP Fund-001-Oslo-010
--     (Lot, Job, and Disposition on the same lot share the SAME number)
--   RCH Contract (3rd party): YY-ClientName-CC  e.g. 26-Yellow Capital-50
--   RCH Unit:     YY-ClientName-CC-UUU          e.g. 26-Yellow Capital-50-001
--   Matter:       MTR-YYYY-NNNN (unchanged)

-- ============================================================
-- 1. ADD record_number COLUMNS
-- ============================================================

alter table public.entities
  add column if not exists record_number text unique;

alter table public.opportunities
  add column if not exists record_number text unique;

alter table public.projects
  add column if not exists record_number text unique;

alter table public.lots
  add column if not exists record_number text unique;

alter table public.jobs
  add column if not exists record_number text unique;

alter table public.dispositions
  add column if not exists record_number text unique;

alter table public.rch_contracts
  add column if not exists record_number text unique;

-- ============================================================
-- 2. AUTO-NUMBERING FUNCTIONS
-- ============================================================

-- 2a. Entity: YY-EntityName (just the year + name)
create or replace function public.generate_entity_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.record_number is null then
    new.record_number := lpad(extract(year from now())::text, 2, '0');
    -- Use last 2 digits of year
    new.record_number := right(extract(year from now())::text, 2) || '-' || new.name;
  end if;
  return new;
end;
$$;

create trigger trg_entity_number
  before insert on public.entities
  for each row execute function public.generate_entity_number();

-- 2b. Opportunity: YY-EntityName-NNN (sequence within entity+year)
create or replace function public.generate_opportunity_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  entity_name text;
  year_prefix text;
  seq_num integer;
begin
  if new.record_number is not null then return new; end if;

  year_prefix := right(extract(year from now())::text, 2);

  -- Get entity name
  select e.name into entity_name
    from public.entities e where e.id = new.entity_id;

  if entity_name is null then
    entity_name := 'Unknown';
  end if;

  -- Count existing opportunities for this entity in this year
  select count(*) + 1 into seq_num
    from public.opportunities o
    where o.entity_id = new.entity_id
    and extract(year from o.created_at) = extract(year from now())
    and o.id != new.id;

  new.record_number := year_prefix || '-' || entity_name || '-' || lpad(seq_num::text, 3, '0');
  return new;
end;
$$;

create trigger trg_opportunity_number
  before insert on public.opportunities
  for each row execute function public.generate_opportunity_number();

-- 2c. Project: inherits opportunity number + appends project name
create or replace function public.generate_project_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  opp_number text;
begin
  if new.record_number is not null then return new; end if;

  -- Try to inherit from opportunity
  if new.opportunity_id is not null then
    select o.record_number into opp_number
      from public.opportunities o where o.id = new.opportunity_id;
  end if;

  if opp_number is not null then
    new.record_number := opp_number || '-' || coalesce(new.project_name, 'Project');
  else
    -- Standalone project (no opportunity): YY-EntityName-ProjectName
    declare
      entity_name text;
      year_prefix text;
    begin
      year_prefix := right(extract(year from now())::text, 2);
      select e.name into entity_name
        from public.entities e where e.id = new.entity_id;
      new.record_number := year_prefix || '-' || coalesce(entity_name, 'Unknown') || '-' || coalesce(new.project_name, 'Project');
    end;
  end if;

  return new;
end;
$$;

create trigger trg_project_number
  before insert on public.projects
  for each row execute function public.generate_project_number();

-- 2d. Lot: inherits project number + appends padded lot_number
create or replace function public.generate_lot_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  proj_number text;
begin
  if new.record_number is not null then return new; end if;

  select p.record_number into proj_number
    from public.projects p where p.id = new.project_id;

  if proj_number is not null then
    new.record_number := proj_number || '-' || lpad(coalesce(new.lot_number, '0'), 3, '0');
  end if;

  return new;
end;
$$;

create trigger trg_lot_number
  before insert on public.lots
  for each row execute function public.generate_lot_number();

-- 2e. Job: shares lot's record_number (lot/job/dispo are 1:1)
-- If no lot, falls back to project number + sequence
create or replace function public.generate_job_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lot_number text;
  proj_number text;
begin
  if new.record_number is not null then return new; end if;

  -- Try to inherit from lot
  if new.lot_id is not null then
    select l.record_number into lot_number
      from public.lots l where l.id = new.lot_id;
  end if;

  if lot_number is not null then
    new.record_number := lot_number;
  elsif new.project_id is not null then
    -- Fallback: project number + lot_number field
    select p.record_number into proj_number
      from public.projects p where p.id = new.project_id;
    if proj_number is not null then
      new.record_number := proj_number || '-' || lpad(coalesce(new.lot_number, '0'), 3, '0');
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_job_number
  before insert on public.jobs
  for each row execute function public.generate_job_number();

-- 2f. Disposition: shares job's record_number
create or replace function public.generate_disposition_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  job_number text;
  lot_number_val text;
begin
  if new.record_number is not null then return new; end if;

  -- Try to inherit from job
  if new.job_id is not null then
    select j.record_number into job_number
      from public.jobs j where j.id = new.job_id;
  end if;

  if job_number is not null then
    new.record_number := job_number;
  elsif new.lot_id is not null then
    -- Fallback: use lot number
    select l.record_number into lot_number_val
      from public.lots l where l.id = new.lot_id;
    new.record_number := lot_number_val;
  end if;

  return new;
end;
$$;

create trigger trg_disposition_number
  before insert on public.dispositions
  for each row execute function public.generate_disposition_number();

-- 2g. RCH Contract (3rd party): YY-ClientName-CC (annual sequence)
create or replace function public.generate_rch_contract_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  year_prefix text;
  seq_num integer;
begin
  if new.record_number is not null then return new; end if;

  year_prefix := right(extract(year from now())::text, 2);

  -- Count existing contracts this year
  select count(*) + 1 into seq_num
    from public.rch_contracts c
    where extract(year from c.created_at) = extract(year from now())
    and c.id != new.id;

  new.record_number := year_prefix || '-' || coalesce(new.client_name, 'Client') || '-' || lpad(seq_num::text, 2, '0');
  return new;
end;
$$;

create trigger trg_rch_contract_number
  before insert on public.rch_contracts
  for each row execute function public.generate_rch_contract_number();

-- ============================================================
-- 3. INDEXES
-- ============================================================

create index if not exists idx_entities_record_number on public.entities(record_number);
create index if not exists idx_opportunities_record_number on public.opportunities(record_number);
create index if not exists idx_projects_record_number on public.projects(record_number);
create index if not exists idx_lots_record_number on public.lots(record_number);
create index if not exists idx_jobs_record_number on public.jobs(record_number);
create index if not exists idx_dispositions_record_number on public.dispositions(record_number);
create index if not exists idx_rch_contracts_record_number on public.rch_contracts(record_number);

-- ============================================================
-- 4. BACKFILL existing records
-- ============================================================

-- Backfill entities
update public.entities
  set record_number = right(extract(year from created_at)::text, 2) || '-' || name
  where record_number is null;

-- Backfill opportunities
update public.opportunities o
  set record_number = (
    select right(extract(year from o.created_at)::text, 2) || '-' || coalesce(e.name, 'Unknown') || '-' ||
      lpad(
        (row_number() over (partition by o.entity_id order by o.created_at))::text,
        3, '0'
      )
    from public.entities e
    where e.id = o.entity_id
  )
  where o.record_number is null and o.entity_id is not null;

-- Backfill projects
update public.projects p
  set record_number = (
    select coalesce(opp.record_number, right(extract(year from p.created_at)::text, 2) || '-' || coalesce(e.name, 'Unknown'))
      || '-' || coalesce(p.project_name, 'Project')
    from public.entities e
    left join public.opportunities opp on opp.id = p.opportunity_id
    where e.id = p.entity_id
  )
  where p.record_number is null and p.entity_id is not null;

-- Backfill lots
update public.lots l
  set record_number = (
    select p.record_number || '-' || lpad(coalesce(l.lot_number, '0'), 3, '0')
    from public.projects p where p.id = l.project_id
  )
  where l.record_number is null and l.project_id is not null;

-- Backfill jobs from lot
update public.jobs j
  set record_number = (
    select l.record_number from public.lots l where l.id = j.lot_id
  )
  where j.record_number is null and j.lot_id is not null;

-- Backfill jobs without lot from project
update public.jobs j
  set record_number = (
    select p.record_number || '-' || lpad(coalesce(j.lot_number, '0'), 3, '0')
    from public.projects p where p.id = j.project_id
  )
  where j.record_number is null and j.project_id is not null;

-- Backfill dispositions from job
update public.dispositions d
  set record_number = (
    select j.record_number from public.jobs j where j.id = d.job_id
  )
  where d.record_number is null and d.job_id is not null;

-- Backfill RCH contracts
update public.rch_contracts c
  set record_number = right(extract(year from c.created_at)::text, 2) || '-' ||
    coalesce(c.client_name, 'Client') || '-' ||
    lpad(
      (row_number() over (order by c.created_at))::text,
      2, '0'
    )
  where c.record_number is null;

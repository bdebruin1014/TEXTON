-- 20260226_workflow_instances.sql
-- Workflow instances — concrete workflows assigned to records,
-- customized via AI chat, with executable milestones + tasks.

-- ============================================================
-- 1. workflow_instances
-- ============================================================

create table public.workflow_instances (
  id                uuid primary key default gen_random_uuid(),
  template_id       uuid references public.workflow_templates(id) on delete set null,
  entity_id         uuid references public.entities(id) on delete set null,
  record_type       text not null
    check (record_type in ('opportunity', 'project', 'job', 'disposition', 'matter', 'rch_contract')),
  record_id         uuid not null,
  name              text not null,
  status            text not null default 'active'
    check (status in ('active', 'paused', 'completed', 'cancelled')),
  chat_conversation jsonb default '[]',
  ai_customization  jsonb default '{}',
  created_by        uuid references public.user_profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_workflow_instances_record on public.workflow_instances(record_type, record_id);
create index idx_workflow_instances_template on public.workflow_instances(template_id);
create index idx_workflow_instances_entity on public.workflow_instances(entity_id);

-- ============================================================
-- 2. workflow_instance_milestones
-- ============================================================

create table public.workflow_instance_milestones (
  id            uuid primary key default gen_random_uuid(),
  instance_id   uuid not null references public.workflow_instances(id) on delete cascade,
  name          text not null,
  sort_order    integer not null default 0,
  status        text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'skipped')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_wf_milestones_instance on public.workflow_instance_milestones(instance_id);

-- ============================================================
-- 3. workflow_instance_tasks
-- ============================================================

create table public.workflow_instance_tasks (
  id                  uuid primary key default gen_random_uuid(),
  instance_id         uuid not null references public.workflow_instances(id) on delete cascade,
  milestone_id        uuid references public.workflow_instance_milestones(id) on delete set null,
  task_name           text not null,
  description         text,
  status              text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'skipped', 'blocked')),
  assigned_to_user    uuid references public.user_profiles(id) on delete set null,
  assigned_to_team    uuid references public.teams(id) on delete set null,
  assigned_role       text,
  due_date            date,
  completed_at        timestamptz,
  depends_on          uuid[] default '{}',
  sort_order          integer not null default 0,
  ai_generated        boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_wf_tasks_instance on public.workflow_instance_tasks(instance_id);
create index idx_wf_tasks_milestone on public.workflow_instance_tasks(milestone_id);
create index idx_wf_tasks_assignee on public.workflow_instance_tasks(assigned_to_user);

-- ============================================================
-- 4. Triggers
-- ============================================================

create trigger set_workflow_instances_updated_at
  before update on public.workflow_instances
  for each row execute function public.set_updated_at();

create trigger set_workflow_instance_milestones_updated_at
  before update on public.workflow_instance_milestones
  for each row execute function public.set_updated_at();

create trigger set_workflow_instance_tasks_updated_at
  before update on public.workflow_instance_tasks
  for each row execute function public.set_updated_at();

-- Auto-complete milestone when all tasks complete
create or replace function public.auto_complete_milestone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  total_tasks integer;
  done_tasks integer;
begin
  if new.status in ('completed', 'skipped') and new.milestone_id is not null then
    select count(*), count(*) filter (where status in ('completed', 'skipped'))
      into total_tasks, done_tasks
      from public.workflow_instance_tasks
      where milestone_id = new.milestone_id;

    if total_tasks > 0 and total_tasks = done_tasks then
      update public.workflow_instance_milestones
        set status = 'completed'
        where id = new.milestone_id and status != 'completed';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_auto_complete_milestone
  after update on public.workflow_instance_tasks
  for each row execute function public.auto_complete_milestone();

-- Auto-complete instance when all milestones complete
create or replace function public.auto_complete_instance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  total_ms integer;
  done_ms integer;
begin
  if new.status in ('completed', 'skipped') then
    select count(*), count(*) filter (where status in ('completed', 'skipped'))
      into total_ms, done_ms
      from public.workflow_instance_milestones
      where instance_id = new.instance_id;

    if total_ms > 0 and total_ms = done_ms then
      update public.workflow_instances
        set status = 'completed'
        where id = new.instance_id and status = 'active';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_auto_complete_instance
  after update on public.workflow_instance_milestones
  for each row execute function public.auto_complete_instance();

-- ============================================================
-- 5. RLS
-- ============================================================

alter table public.workflow_instances enable row level security;
alter table public.workflow_instance_milestones enable row level security;
alter table public.workflow_instance_tasks enable row level security;

-- Instances: entity-scoped
create policy "wf_instances_select" on public.workflow_instances
  for select to authenticated
  using (entity_id is null or entity_id = public.auth_entity_id());

create policy "wf_instances_insert" on public.workflow_instances
  for insert to authenticated
  with check (entity_id is null or entity_id = public.auth_entity_id());

create policy "wf_instances_update" on public.workflow_instances
  for update to authenticated
  using (entity_id is null or entity_id = public.auth_entity_id());

create policy "wf_instances_delete" on public.workflow_instances
  for delete to authenticated
  using (entity_id is null or entity_id = public.auth_entity_id());

-- Milestones + Tasks: accessible via instance
create policy "wf_milestones_all" on public.workflow_instance_milestones
  for all to authenticated
  using (exists (
    select 1 from public.workflow_instances wi
    where wi.id = instance_id
    and (wi.entity_id is null or wi.entity_id = public.auth_entity_id())
  ));

create policy "wf_tasks_all" on public.workflow_instance_tasks
  for all to authenticated
  using (exists (
    select 1 from public.workflow_instances wi
    where wi.id = instance_id
    and (wi.entity_id is null or wi.entity_id = public.auth_entity_id())
  ));

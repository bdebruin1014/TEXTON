-- 00010_workflows.sql
-- Workflows & Admin module: workflow_templates, workflow_milestones,
--   workflow_tasks, assignment_groups, smart_actions, transaction_types,
--   order_templates, calendar_events, cost_codes, document_templates,
--   fee_schedule, permission_groups

-- ============================================================
-- workflow_templates
-- ============================================================
create table public.workflow_templates (
  id          uuid primary key default gen_random_uuid(),
  entity_id   uuid references public.entities(id) on delete set null,
  name        text not null,
  description text,
  status      text not null default 'Active'
    check (status in ('Active','Inactive','Draft')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- workflow_milestones
-- ============================================================
create table public.workflow_milestones (
  id          uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflow_templates(id) on delete cascade,
  name        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- workflow_tasks
-- ============================================================
create table public.workflow_tasks (
  id              uuid primary key default gen_random_uuid(),
  workflow_id     uuid not null references public.workflow_templates(id) on delete cascade,
  milestone_id    uuid references public.workflow_milestones(id) on delete set null,
  task_name       text not null,
  assigned_when   text,
  assigned_to     text,
  completes_when  text,
  due_days        integer,
  from_reference  text,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- assignment_groups
-- ============================================================
create table public.assignment_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  status      text not null default 'Active'
    check (status in ('Active','Inactive')),
  members     jsonb default '[]',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- smart_actions
-- ============================================================
create table public.smart_actions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  status      text not null default 'Active'
    check (status in ('Active','Inactive')),
  trigger_event text,
  action_type   text,
  config      jsonb default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- transaction_types
-- ============================================================
create table public.transaction_types (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  status      text not null default 'Active'
    check (status in ('Active','Inactive')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- order_templates
-- ============================================================
create table public.order_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  template    jsonb default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- calendar_events
-- ============================================================
create table public.calendar_events (
  id          uuid primary key default gen_random_uuid(),
  entity_id   uuid references public.entities(id) on delete set null,
  title       text not null,
  event_type  text,
  start_date  timestamptz not null,
  end_date    timestamptz,
  record_type text,
  record_id   uuid,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- cost_codes
-- ============================================================
create table public.cost_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null,
  description text,
  category    text,
  status      text not null default 'Active'
    check (status in ('Active','Inactive')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- document_templates
-- ============================================================
create table public.document_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  template    text,
  category    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- fee_schedule
-- ============================================================
create table public.fee_schedule (
  id                    uuid primary key default gen_random_uuid(),
  entity_id             uuid references public.entities(id) on delete set null,
  -- Common fee fields (dynamic updates from frontend)
  builder_fee_pct       numeric(5,4),
  management_fee_pct    numeric(5,4),
  acquisition_fee_pct   numeric(5,4),
  disposition_fee_pct   numeric(5,4),
  development_fee_pct   numeric(5,4),
  construction_mgmt_pct numeric(5,4),
  asset_mgmt_pct        numeric(5,4),
  financing_fee_flat    numeric(15,2),
  legal_fee_flat        numeric(15,2),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ============================================================
-- permission_groups
-- ============================================================
create table public.permission_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  status      text not null default 'Active'
    check (status in ('Active','Inactive')),
  permissions jsonb default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

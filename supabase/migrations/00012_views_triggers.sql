-- 00012_views_triggers.sql
-- audit_log table, job_cost_summary VIEW,
-- updated_at triggers on all tables,
-- JE line denormalization trigger

-- ============================================================
-- audit_log
-- ============================================================
create table public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  timestamp   timestamptz not null default now(),
  action      text not null,
  table_name  text,
  user_email  text,
  record_id   uuid,
  changes     jsonb,
  created_at  timestamptz not null default now()
);

-- Enable RLS on audit_log
alter table public.audit_log enable row level security;
create policy "Authenticated users full access" on public.audit_log
  for all to authenticated using (true) with check (true);

-- ============================================================
-- job_cost_summary VIEW
-- Frontend queries: .from('job_cost_summary')
--   selecting job_name, cost_code, entity_id, budgeted, committed, invoiced, paid
-- ============================================================
create or replace view public.job_cost_summary as
select
  j.id          as job_id,
  j.job_name,
  j.entity_id,
  jbl.cost_code,
  coalesce(sum(jbl.budgeted), 0)  as budgeted,
  coalesce(sum(jbl.committed), 0) as committed,
  coalesce(sum(jbl.invoiced), 0)  as invoiced,
  coalesce(sum(jbl.paid), 0)      as paid
from public.jobs j
left join public.job_budget_lines jbl on jbl.job_id = j.id
group by j.id, j.job_name, j.entity_id, jbl.cost_code;

-- ============================================================
-- updated_at triggers on all tables that have the column
-- ============================================================
do $$
declare
  tbl text;
begin
  for tbl in
    select c.table_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.column_name = 'updated_at'
      and c.table_name in (
        select tablename from pg_tables where schemaname = 'public'
      )
    order by c.table_name
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I '
      'for each row execute function public.set_updated_at()',
      tbl
    );
  end loop;
end;
$$;

-- ============================================================
-- JE line denormalization trigger
-- When a journal_entry_lines row is inserted or updated,
-- copy transaction_date and description from the parent JE
-- and account_name/account_number from the linked account.
-- ============================================================
create or replace function public.denormalize_je_line()
returns trigger as $$
begin
  -- Copy from parent journal entry
  select je.entry_date, je.description, je.entity_id
  into new.transaction_date, new.description, new.entity_id
  from public.journal_entries je
  where je.id = new.journal_entry_id;

  -- Copy from linked account
  if new.account_id is not null then
    select coa.account_name, coa.account_number
    into new.account_name, new.account_number
    from public.chart_of_accounts coa
    where coa.id = new.account_id;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger denormalize_je_line
  before insert or update on public.journal_entry_lines
  for each row execute function public.denormalize_je_line();

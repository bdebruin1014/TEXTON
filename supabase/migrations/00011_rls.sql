-- 00011_rls.sql
-- Enable RLS on all tables and create simple authenticated-user policies.
-- Entity-scoped RLS is a later refinement; for now all authenticated
-- users have full CRUD on all rows.

-- Helper: enable RLS + create permissive all-access policy for authenticated users
do $$
declare
  tbl text;
begin
  for tbl in
    select tablename from pg_tables
    where schemaname = 'public'
      and tablename not in ('schema_migrations')
    order by tablename
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format(
      'create policy "Authenticated users full access" on public.%I '
      'for all to authenticated using (true) with check (true)',
      tbl
    );
  end loop;
end;
$$;

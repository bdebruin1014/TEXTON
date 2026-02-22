-- 20260222_entity_scoped_rls.sql
-- Replace blanket "authenticated = true" RLS policies with proper
-- entity-scoped policies.  Users can only see/modify records belonging
-- to their entity (determined via user_profiles.entity_id).
--
-- Strategy:
--   1. Helper function auth_entity_id() — cached per statement via
--      a STABLE function so Postgres evaluates it once per query.
--   2. Drop every existing blanket policy named
--      "Authenticated users full access" (from 00011 + 00014 + 00012).
--   3. Drop the blanket policies from 20260220 and 20260221 that used
--      different names (documents_all, document_folders_all, etc.).
--   4. Create entity-scoped policies for tables with entity_id columns.
--   5. Create join-based policies for child tables.
--   6. Keep global config tables open to all authenticated users.
--   7. Keep document sharing tables accessible to anon (SELECT only)
--      and authenticated users (full access).

-- ============================================================
-- 1. HELPER FUNCTION
-- ============================================================

-- Returns the entity_id of the currently authenticated user.
-- STABLE + SECURITY DEFINER ensures one lookup per statement,
-- bypasses RLS on user_profiles, and is safe inside policy checks.
create or replace function public.auth_entity_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select entity_id
  from public.user_profiles
  where user_id = auth.uid()
  limit 1;
$$;

-- Grant execute to authenticated and anon (anon will get NULL back)
grant execute on function public.auth_entity_id() to authenticated, anon;

-- ============================================================
-- 2. DROP ALL EXISTING BLANKET POLICIES
-- ============================================================

-- 2a. Drop "Authenticated users full access" from 00011_rls.sql
--     (applied to every public table that existed at that time)
--     and from 00014_corrective_schema.sql (applied to 24 new tables).
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
    -- Attempt to drop; ignore if it doesn't exist on this table
    begin
      execute format(
        'drop policy if exists "Authenticated users full access" on public.%I',
        tbl
      );
    exception when undefined_object then
      null;
    end;
  end loop;
end;
$$;

-- 2b. Drop blanket policies from 00012_views_triggers.sql (audit_log)
drop policy if exists "Authenticated users full access" on public.audit_log;

-- 2c. Drop blanket policies from 20260220_document_management.sql
drop policy if exists "document_folders_all" on public.document_folders;
drop policy if exists "documents_all" on public.documents;
drop policy if exists "document_activity_all" on public.document_activity;

-- 2d. Drop blanket authenticated policies from 20260221_document_sharing.sql
drop policy if exists "shares_access" on public.document_shares;
drop policy if exists "share_items_access" on public.document_share_items;
drop policy if exists "share_log_access" on public.document_share_access_log;
drop policy if exists "upload_requests_access" on public.upload_requests;
drop policy if exists "upload_request_items_access" on public.upload_request_items;
drop policy if exists "upload_request_log_access" on public.upload_request_access_log;

-- 2e. Drop anon policies from 20260221 (we will recreate them below)
drop policy if exists "shares_public_read" on public.document_shares;
drop policy if exists "share_items_public_read" on public.document_share_items;
drop policy if exists "share_log_public_insert" on public.document_share_access_log;
drop policy if exists "upload_requests_public_read" on public.upload_requests;
drop policy if exists "upload_request_items_public_read" on public.upload_request_items;
drop policy if exists "upload_request_items_public_update" on public.upload_request_items;
drop policy if exists "upload_request_log_public_insert" on public.upload_request_access_log;

-- NOTE: We intentionally do NOT drop the folder_templates / folder_template_items
-- policies from 20260220 (admin-only write + authenticated read). Those are fine.

-- ============================================================
-- 3. ENTITY-SCOPED POLICIES — Tables with direct entity_id
-- ============================================================
-- These tables have their own entity_id column.  The policy simply
-- checks entity_id = auth_entity_id().

-- ---- entities ----
-- Users can only see their own entity
drop policy if exists "entity_scope" on public.entities;
create policy "entity_scope" on public.entities
  for all to authenticated
  using (id = public.auth_entity_id())
  with check (id = public.auth_entity_id());

-- ---- user_profiles ----
-- Users see profiles within their entity
drop policy if exists "entity_scope" on public.user_profiles;
create policy "entity_scope" on public.user_profiles
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ---- opportunities ----
drop policy if exists "entity_scope" on public.opportunities;
create policy "entity_scope" on public.opportunities
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ---- projects ----
drop policy if exists "entity_scope" on public.projects;
create policy "entity_scope" on public.projects
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ---- jobs ----
drop policy if exists "entity_scope" on public.jobs;
create policy "entity_scope" on public.jobs
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ---- dispositions ----
drop policy if exists "entity_scope" on public.dispositions;
create policy "entity_scope" on public.dispositions
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ---- subcontracts ----
drop policy if exists "entity_scope" on public.subcontracts;
create policy "entity_scope" on public.subcontracts
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ---- companies ----
drop policy if exists "entity_scope" on public.companies;
create policy "entity_scope" on public.companies
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ---- employees ----
drop policy if exists "entity_scope" on public.employees;
create policy "entity_scope" on public.employees
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ---- customers ----
drop policy if exists "entity_scope" on public.customers;
create policy "entity_scope" on public.customers
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ---- vendors ----
drop policy if exists "entity_scope" on public.vendors;
create policy "entity_scope" on public.vendors
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ---- chart_of_accounts ----
drop policy if exists "entity_scope" on public.chart_of_accounts;
create policy "entity_scope" on public.chart_of_accounts
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ---- journal_entries ----
drop policy if exists "entity_scope" on public.journal_entries;
create policy "entity_scope" on public.journal_entries
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ---- journal_entry_lines ----
drop policy if exists "entity_scope" on public.journal_entry_lines;
create policy "entity_scope" on public.journal_entry_lines
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ---- invoices ----
drop policy if exists "entity_scope" on public.invoices;
create policy "entity_scope" on public.invoices
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ---- bills ----
drop policy if exists "entity_scope" on public.bills;
create policy "entity_scope" on public.bills
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ---- receivables ----
drop policy if exists "entity_scope" on public.receivables;
create policy "entity_scope" on public.receivables
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ---- bank_accounts ----
drop policy if exists "entity_scope" on public.bank_accounts;
create policy "entity_scope" on public.bank_accounts
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ---- batch_payments ----
drop policy if exists "entity_scope" on public.batch_payments;
create policy "entity_scope" on public.batch_payments
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ---- reconciliations ----
drop policy if exists "entity_scope" on public.reconciliations;
create policy "entity_scope" on public.reconciliations
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ---- period_close ----
drop policy if exists "entity_scope" on public.period_close;
create policy "entity_scope" on public.period_close
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ---- purchase_orders ----
drop policy if exists "entity_scope" on public.purchase_orders;
create policy "entity_scope" on public.purchase_orders
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ---- estimates ----
drop policy if exists "entity_scope" on public.estimates;
create policy "entity_scope" on public.estimates
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ---- funds ----
drop policy if exists "entity_scope" on public.funds;
create policy "entity_scope" on public.funds
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ---- deal_sheets ----
drop policy if exists "entity_scope" on public.deal_sheets;
create policy "entity_scope" on public.deal_sheets
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ---- document_folders ----
drop policy if exists "entity_scope" on public.document_folders;
create policy "entity_scope" on public.document_folders
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ---- documents (from 20260220_document_management) ----
drop policy if exists "entity_scope" on public.documents;
create policy "entity_scope" on public.documents
  for all to authenticated
  using (entity_id = public.auth_entity_id())
  with check (entity_id = public.auth_entity_id());

-- ============================================================
-- 4. JOIN-BASED POLICIES — Child tables scoped via parent
-- ============================================================

-- -------------------------------------------------------
-- 4a. Children of opportunities (via opportunities.entity_id)
-- -------------------------------------------------------

-- parcels: can belong to opportunity or project; scope via either
drop policy if exists "entity_scope" on public.parcels;
create policy "entity_scope" on public.parcels
  for all to authenticated
  using (
    exists (
      select 1 from public.opportunities o
      where o.id = parcels.opportunity_id
        and o.entity_id = public.auth_entity_id()
    )
    or exists (
      select 1 from public.projects p
      where p.id = parcels.project_id
        and p.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.opportunities o
      where o.id = parcels.opportunity_id
        and o.entity_id = public.auth_entity_id()
    )
    or exists (
      select 1 from public.projects p
      where p.id = parcels.project_id
        and p.entity_id = public.auth_entity_id()
    )
  );

-- deal_analyses
drop policy if exists "entity_scope" on public.deal_analyses;
create policy "entity_scope" on public.deal_analyses
  for all to authenticated
  using (
    exists (
      select 1 from public.opportunities o
      where o.id = deal_analyses.opportunity_id
        and o.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.opportunities o
      where o.id = deal_analyses.opportunity_id
        and o.entity_id = public.auth_entity_id()
    )
  );

-- due_diligence_items: can belong to opportunity or project
drop policy if exists "entity_scope" on public.due_diligence_items;
create policy "entity_scope" on public.due_diligence_items
  for all to authenticated
  using (
    exists (
      select 1 from public.opportunities o
      where o.id = due_diligence_items.opportunity_id
        and o.entity_id = public.auth_entity_id()
    )
    or exists (
      select 1 from public.projects p
      where p.id = due_diligence_items.project_id
        and p.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.opportunities o
      where o.id = due_diligence_items.opportunity_id
        and o.entity_id = public.auth_entity_id()
    )
    or exists (
      select 1 from public.projects p
      where p.id = due_diligence_items.project_id
        and p.entity_id = public.auth_entity_id()
    )
  );

-- comparable_sales
drop policy if exists "entity_scope" on public.comparable_sales;
create policy "entity_scope" on public.comparable_sales
  for all to authenticated
  using (
    exists (
      select 1 from public.opportunities o
      where o.id = comparable_sales.opportunity_id
        and o.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.opportunities o
      where o.id = comparable_sales.opportunity_id
        and o.entity_id = public.auth_entity_id()
    )
  );

-- counter_offers
drop policy if exists "entity_scope" on public.counter_offers;
create policy "entity_scope" on public.counter_offers
  for all to authenticated
  using (
    exists (
      select 1 from public.opportunities o
      where o.id = counter_offers.opportunity_id
        and o.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.opportunities o
      where o.id = counter_offers.opportunity_id
        and o.entity_id = public.auth_entity_id()
    )
  );

-- -------------------------------------------------------
-- 4b. Children of projects (via projects.entity_id)
-- -------------------------------------------------------

-- floor_plans (project_id is nullable; if null, treat as global config)
drop policy if exists "entity_scope" on public.floor_plans;
create policy "entity_scope" on public.floor_plans
  for all to authenticated
  using (
    project_id is null
    or exists (
      select 1 from public.projects p
      where p.id = floor_plans.project_id
        and p.entity_id = public.auth_entity_id()
    )
  )
  with check (
    project_id is null
    or exists (
      select 1 from public.projects p
      where p.id = floor_plans.project_id
        and p.entity_id = public.auth_entity_id()
    )
  );

-- lots
drop policy if exists "entity_scope" on public.lots;
create policy "entity_scope" on public.lots
  for all to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = lots.project_id
        and p.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = lots.project_id
        and p.entity_id = public.auth_entity_id()
    )
  );

-- lot_takedowns
drop policy if exists "entity_scope" on public.lot_takedowns;
create policy "entity_scope" on public.lot_takedowns
  for all to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = lot_takedowns.project_id
        and p.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = lot_takedowns.project_id
        and p.entity_id = public.auth_entity_id()
    )
  );

-- budget_lines
drop policy if exists "entity_scope" on public.budget_lines;
create policy "entity_scope" on public.budget_lines
  for all to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = budget_lines.project_id
        and p.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = budget_lines.project_id
        and p.entity_id = public.auth_entity_id()
    )
  );

-- horizontal_line_items
drop policy if exists "entity_scope" on public.horizontal_line_items;
create policy "entity_scope" on public.horizontal_line_items
  for all to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = horizontal_line_items.project_id
        and p.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = horizontal_line_items.project_id
        and p.entity_id = public.auth_entity_id()
    )
  );

-- milestones
drop policy if exists "entity_scope" on public.milestones;
create policy "entity_scope" on public.milestones
  for all to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = milestones.project_id
        and p.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = milestones.project_id
        and p.entity_id = public.auth_entity_id()
    )
  );

-- closeout_items
drop policy if exists "entity_scope" on public.closeout_items;
create policy "entity_scope" on public.closeout_items
  for all to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = closeout_items.project_id
        and p.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = closeout_items.project_id
        and p.entity_id = public.auth_entity_id()
    )
  );

-- insurance_certificates
drop policy if exists "entity_scope" on public.insurance_certificates;
create policy "entity_scope" on public.insurance_certificates
  for all to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = insurance_certificates.project_id
        and p.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = insurance_certificates.project_id
        and p.entity_id = public.auth_entity_id()
    )
  );

-- draw_requests
drop policy if exists "entity_scope" on public.draw_requests;
create policy "entity_scope" on public.draw_requests
  for all to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = draw_requests.project_id
        and p.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = draw_requests.project_id
        and p.entity_id = public.auth_entity_id()
    )
  );

-- project_investors
drop policy if exists "entity_scope" on public.project_investors;
create policy "entity_scope" on public.project_investors
  for all to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_investors.project_id
        and p.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_investors.project_id
        and p.entity_id = public.auth_entity_id()
    )
  );

-- project_components
drop policy if exists "entity_scope" on public.project_components;
create policy "entity_scope" on public.project_components
  for all to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_components.project_id
        and p.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_components.project_id
        and p.entity_id = public.auth_entity_id()
    )
  );

-- project_plan_catalog
drop policy if exists "entity_scope" on public.project_plan_catalog;
create policy "entity_scope" on public.project_plan_catalog
  for all to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_plan_catalog.project_id
        and p.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_plan_catalog.project_id
        and p.entity_id = public.auth_entity_id()
    )
  );

-- project_upgrade_catalog
drop policy if exists "entity_scope" on public.project_upgrade_catalog;
create policy "entity_scope" on public.project_upgrade_catalog
  for all to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_upgrade_catalog.project_id
        and p.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_upgrade_catalog.project_id
        and p.entity_id = public.auth_entity_id()
    )
  );

-- project_elevation_options (grandchild: -> project_plan_catalog -> projects)
drop policy if exists "entity_scope" on public.project_elevation_options;
create policy "entity_scope" on public.project_elevation_options
  for all to authenticated
  using (
    exists (
      select 1 from public.project_plan_catalog ppc
      join public.projects p on p.id = ppc.project_id
      where ppc.id = project_elevation_options.plan_catalog_id
        and p.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.project_plan_catalog ppc
      join public.projects p on p.id = ppc.project_id
      where ppc.id = project_elevation_options.plan_catalog_id
        and p.entity_id = public.auth_entity_id()
    )
  );

-- -------------------------------------------------------
-- 4c. Children of jobs (via jobs.entity_id)
-- -------------------------------------------------------

-- job_budget_lines
drop policy if exists "entity_scope" on public.job_budget_lines;
create policy "entity_scope" on public.job_budget_lines
  for all to authenticated
  using (
    exists (
      select 1 from public.jobs j
      where j.id = job_budget_lines.job_id
        and j.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.jobs j
      where j.id = job_budget_lines.job_id
        and j.entity_id = public.auth_entity_id()
    )
  );

-- job_milestones
drop policy if exists "entity_scope" on public.job_milestones;
create policy "entity_scope" on public.job_milestones
  for all to authenticated
  using (
    exists (
      select 1 from public.jobs j
      where j.id = job_milestones.job_id
        and j.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.jobs j
      where j.id = job_milestones.job_id
        and j.entity_id = public.auth_entity_id()
    )
  );

-- daily_logs
drop policy if exists "entity_scope" on public.daily_logs;
create policy "entity_scope" on public.daily_logs
  for all to authenticated
  using (
    exists (
      select 1 from public.jobs j
      where j.id = daily_logs.job_id
        and j.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.jobs j
      where j.id = daily_logs.job_id
        and j.entity_id = public.auth_entity_id()
    )
  );

-- change_orders
drop policy if exists "entity_scope" on public.change_orders;
create policy "entity_scope" on public.change_orders
  for all to authenticated
  using (
    exists (
      select 1 from public.jobs j
      where j.id = change_orders.job_id
        and j.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.jobs j
      where j.id = change_orders.job_id
        and j.entity_id = public.auth_entity_id()
    )
  );

-- inspections
drop policy if exists "entity_scope" on public.inspections;
create policy "entity_scope" on public.inspections
  for all to authenticated
  using (
    exists (
      select 1 from public.jobs j
      where j.id = inspections.job_id
        and j.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.jobs j
      where j.id = inspections.job_id
        and j.entity_id = public.auth_entity_id()
    )
  );

-- permits
drop policy if exists "entity_scope" on public.permits;
create policy "entity_scope" on public.permits
  for all to authenticated
  using (
    exists (
      select 1 from public.jobs j
      where j.id = permits.job_id
        and j.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.jobs j
      where j.id = permits.job_id
        and j.entity_id = public.auth_entity_id()
    )
  );

-- punch_list_items
drop policy if exists "entity_scope" on public.punch_list_items;
create policy "entity_scope" on public.punch_list_items
  for all to authenticated
  using (
    exists (
      select 1 from public.jobs j
      where j.id = punch_list_items.job_id
        and j.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.jobs j
      where j.id = punch_list_items.job_id
        and j.entity_id = public.auth_entity_id()
    )
  );

-- selections
drop policy if exists "entity_scope" on public.selections;
create policy "entity_scope" on public.selections
  for all to authenticated
  using (
    exists (
      select 1 from public.jobs j
      where j.id = selections.job_id
        and j.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.jobs j
      where j.id = selections.job_id
        and j.entity_id = public.auth_entity_id()
    )
  );

-- warranty_claims
drop policy if exists "entity_scope" on public.warranty_claims;
create policy "entity_scope" on public.warranty_claims
  for all to authenticated
  using (
    exists (
      select 1 from public.jobs j
      where j.id = warranty_claims.job_id
        and j.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.jobs j
      where j.id = warranty_claims.job_id
        and j.entity_id = public.auth_entity_id()
    )
  );

-- job_photos
drop policy if exists "entity_scope" on public.job_photos;
create policy "entity_scope" on public.job_photos
  for all to authenticated
  using (
    exists (
      select 1 from public.jobs j
      where j.id = job_photos.job_id
        and j.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.jobs j
      where j.id = job_photos.job_id
        and j.entity_id = public.auth_entity_id()
    )
  );

-- job_files
drop policy if exists "entity_scope" on public.job_files;
create policy "entity_scope" on public.job_files
  for all to authenticated
  using (
    exists (
      select 1 from public.jobs j
      where j.id = job_files.job_id
        and j.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.jobs j
      where j.id = job_files.job_id
        and j.entity_id = public.auth_entity_id()
    )
  );

-- job_handoffs
drop policy if exists "entity_scope" on public.job_handoffs;
create policy "entity_scope" on public.job_handoffs
  for all to authenticated
  using (
    exists (
      select 1 from public.jobs j
      where j.id = job_handoffs.job_id
        and j.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.jobs j
      where j.id = job_handoffs.job_id
        and j.entity_id = public.auth_entity_id()
    )
  );

-- job_handoff_items (grandchild: -> job_handoffs -> jobs)
drop policy if exists "entity_scope" on public.job_handoff_items;
create policy "entity_scope" on public.job_handoff_items
  for all to authenticated
  using (
    exists (
      select 1 from public.job_handoffs jh
      join public.jobs j on j.id = jh.job_id
      where jh.id = job_handoff_items.handoff_id
        and j.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.job_handoffs jh
      join public.jobs j on j.id = jh.job_id
      where jh.id = job_handoff_items.handoff_id
        and j.entity_id = public.auth_entity_id()
    )
  );

-- -------------------------------------------------------
-- 4d. Children of dispositions (via dispositions.entity_id)
-- -------------------------------------------------------

-- disposition_options
drop policy if exists "entity_scope" on public.disposition_options;
create policy "entity_scope" on public.disposition_options
  for all to authenticated
  using (
    exists (
      select 1 from public.dispositions d
      where d.id = disposition_options.disposition_id
        and d.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.dispositions d
      where d.id = disposition_options.disposition_id
        and d.entity_id = public.auth_entity_id()
    )
  );

-- offers
drop policy if exists "entity_scope" on public.offers;
create policy "entity_scope" on public.offers
  for all to authenticated
  using (
    exists (
      select 1 from public.dispositions d
      where d.id = offers.disposition_id
        and d.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.dispositions d
      where d.id = offers.disposition_id
        and d.entity_id = public.auth_entity_id()
    )
  );

-- showings
drop policy if exists "entity_scope" on public.showings;
create policy "entity_scope" on public.showings
  for all to authenticated
  using (
    exists (
      select 1 from public.dispositions d
      where d.id = showings.disposition_id
        and d.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.dispositions d
      where d.id = showings.disposition_id
        and d.entity_id = public.auth_entity_id()
    )
  );

-- listing_photos
drop policy if exists "entity_scope" on public.listing_photos;
create policy "entity_scope" on public.listing_photos
  for all to authenticated
  using (
    exists (
      select 1 from public.dispositions d
      where d.id = listing_photos.disposition_id
        and d.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.dispositions d
      where d.id = listing_photos.disposition_id
        and d.entity_id = public.auth_entity_id()
    )
  );

-- disposition_files
drop policy if exists "entity_scope" on public.disposition_files;
create policy "entity_scope" on public.disposition_files
  for all to authenticated
  using (
    exists (
      select 1 from public.dispositions d
      where d.id = disposition_files.disposition_id
        and d.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.dispositions d
      where d.id = disposition_files.disposition_id
        and d.entity_id = public.auth_entity_id()
    )
  );

-- -------------------------------------------------------
-- 4e. Children of companies (via companies.entity_id)
-- -------------------------------------------------------

-- contacts
drop policy if exists "entity_scope" on public.contacts;
create policy "entity_scope" on public.contacts
  for all to authenticated
  using (
    exists (
      select 1 from public.companies c
      where c.id = contacts.company_id
        and c.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.companies c
      where c.id = contacts.company_id
        and c.entity_id = public.auth_entity_id()
    )
  );

-- contact_assignments (grandchild: -> contacts -> companies)
drop policy if exists "entity_scope" on public.contact_assignments;
create policy "entity_scope" on public.contact_assignments
  for all to authenticated
  using (
    exists (
      select 1 from public.contacts ct
      join public.companies c on c.id = ct.company_id
      where ct.id = contact_assignments.contact_id
        and c.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.contacts ct
      join public.companies c on c.id = ct.company_id
      where ct.id = contact_assignments.contact_id
        and c.entity_id = public.auth_entity_id()
    )
  );

-- -------------------------------------------------------
-- 4f. Children of funds (via funds.entity_id)
-- -------------------------------------------------------

-- investments
drop policy if exists "entity_scope" on public.investments;
create policy "entity_scope" on public.investments
  for all to authenticated
  using (
    exists (
      select 1 from public.funds f
      where f.id = investments.fund_id
        and f.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.funds f
      where f.id = investments.fund_id
        and f.entity_id = public.auth_entity_id()
    )
  );

-- capital_calls
drop policy if exists "entity_scope" on public.capital_calls;
create policy "entity_scope" on public.capital_calls
  for all to authenticated
  using (
    exists (
      select 1 from public.funds f
      where f.id = capital_calls.fund_id
        and f.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.funds f
      where f.id = capital_calls.fund_id
        and f.entity_id = public.auth_entity_id()
    )
  );

-- distributions
drop policy if exists "entity_scope" on public.distributions;
create policy "entity_scope" on public.distributions
  for all to authenticated
  using (
    exists (
      select 1 from public.funds f
      where f.id = distributions.fund_id
        and f.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.funds f
      where f.id = distributions.fund_id
        and f.entity_id = public.auth_entity_id()
    )
  );

-- -------------------------------------------------------
-- 4g. Children of deal_sheets (via deal_sheets.entity_id)
-- -------------------------------------------------------

-- deal_sheet_site_work
drop policy if exists "entity_scope" on public.deal_sheet_site_work;
create policy "entity_scope" on public.deal_sheet_site_work
  for all to authenticated
  using (
    exists (
      select 1 from public.deal_sheets ds
      where ds.id = deal_sheet_site_work.deal_sheet_id
        and ds.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.deal_sheets ds
      where ds.id = deal_sheet_site_work.deal_sheet_id
        and ds.entity_id = public.auth_entity_id()
    )
  );

-- deal_sheet_comps
drop policy if exists "entity_scope" on public.deal_sheet_comps;
create policy "entity_scope" on public.deal_sheet_comps
  for all to authenticated
  using (
    exists (
      select 1 from public.deal_sheets ds
      where ds.id = deal_sheet_comps.deal_sheet_id
        and ds.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.deal_sheets ds
      where ds.id = deal_sheet_comps.deal_sheet_id
        and ds.entity_id = public.auth_entity_id()
    )
  );

-- deal_sheet_upgrades
drop policy if exists "entity_scope" on public.deal_sheet_upgrades;
create policy "entity_scope" on public.deal_sheet_upgrades
  for all to authenticated
  using (
    exists (
      select 1 from public.deal_sheets ds
      where ds.id = deal_sheet_upgrades.deal_sheet_id
        and ds.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.deal_sheets ds
      where ds.id = deal_sheet_upgrades.deal_sheet_id
        and ds.entity_id = public.auth_entity_id()
    )
  );

-- deal_sheet_checklist
drop policy if exists "entity_scope" on public.deal_sheet_checklist;
create policy "entity_scope" on public.deal_sheet_checklist
  for all to authenticated
  using (
    exists (
      select 1 from public.deal_sheets ds
      where ds.id = deal_sheet_checklist.deal_sheet_id
        and ds.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.deal_sheets ds
      where ds.id = deal_sheet_checklist.deal_sheet_id
        and ds.entity_id = public.auth_entity_id()
    )
  );

-- -------------------------------------------------------
-- 4h. Children of floor_plans (via floor_plans -> projects)
-- -------------------------------------------------------

-- sticks_bricks_items
drop policy if exists "entity_scope" on public.sticks_bricks_items;
create policy "entity_scope" on public.sticks_bricks_items
  for all to authenticated
  using (
    exists (
      select 1 from public.floor_plans fp
      join public.projects p on p.id = fp.project_id
      where fp.id = sticks_bricks_items.floor_plan_id
        and p.entity_id = public.auth_entity_id()
    )
    -- Also allow if floor_plan has no project (global template)
    or exists (
      select 1 from public.floor_plans fp
      where fp.id = sticks_bricks_items.floor_plan_id
        and fp.project_id is null
    )
  )
  with check (
    exists (
      select 1 from public.floor_plans fp
      join public.projects p on p.id = fp.project_id
      where fp.id = sticks_bricks_items.floor_plan_id
        and p.entity_id = public.auth_entity_id()
    )
    or exists (
      select 1 from public.floor_plans fp
      where fp.id = sticks_bricks_items.floor_plan_id
        and fp.project_id is null
    )
  );

-- -------------------------------------------------------
-- 4i. RCH Contracts (uses owner_entity_id instead of entity_id)
-- -------------------------------------------------------

-- rch_contracts
drop policy if exists "entity_scope" on public.rch_contracts;
create policy "entity_scope" on public.rch_contracts
  for all to authenticated
  using (owner_entity_id = public.auth_entity_id())
  with check (owner_entity_id = public.auth_entity_id());

-- rch_contract_units
drop policy if exists "entity_scope" on public.rch_contract_units;
create policy "entity_scope" on public.rch_contract_units
  for all to authenticated
  using (
    exists (
      select 1 from public.rch_contracts rc
      where rc.id = rch_contract_units.contract_id
        and rc.owner_entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.rch_contracts rc
      where rc.id = rch_contract_units.contract_id
        and rc.owner_entity_id = public.auth_entity_id()
    )
  );

-- rch_contract_draws
drop policy if exists "entity_scope" on public.rch_contract_draws;
create policy "entity_scope" on public.rch_contract_draws
  for all to authenticated
  using (
    exists (
      select 1 from public.rch_contracts rc
      where rc.id = rch_contract_draws.contract_id
        and rc.owner_entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.rch_contracts rc
      where rc.id = rch_contract_draws.contract_id
        and rc.owner_entity_id = public.auth_entity_id()
    )
  );

-- -------------------------------------------------------
-- 4j. Workflow children (via workflow_templates.entity_id)
--     Note: workflow_templates is listed as global config by the user,
--     but its children should still scope through the parent.
--     Since workflow_templates is open to all authenticated, the
--     children effectively inherit the same openness.
-- -------------------------------------------------------

-- workflow_milestones
drop policy if exists "entity_scope" on public.workflow_milestones;
create policy "entity_scope" on public.workflow_milestones
  for all to authenticated
  using (true)
  with check (true);

-- workflow_tasks
drop policy if exists "entity_scope" on public.workflow_tasks;
create policy "entity_scope" on public.workflow_tasks
  for all to authenticated
  using (true)
  with check (true);

-- -------------------------------------------------------
-- 4k. E-sign children
-- -------------------------------------------------------

-- esign_documents: polymorphic record_type/record_id makes it hard to
-- scope generically. Treat as accessible to all authenticated users
-- since the parent esign_templates is global config.
drop policy if exists "entity_scope" on public.esign_documents;
create policy "entity_scope" on public.esign_documents
  for all to authenticated
  using (true)
  with check (true);

-- esign_signers
drop policy if exists "entity_scope" on public.esign_signers;
create policy "entity_scope" on public.esign_signers
  for all to authenticated
  using (true)
  with check (true);

-- -------------------------------------------------------
-- 4l. Document activity (via documents or document_folders entity_id)
-- -------------------------------------------------------

-- document_activity references either a document_id or folder_id.
-- Scope via the document's or folder's entity_id.
drop policy if exists "entity_scope" on public.document_activity;
create policy "entity_scope" on public.document_activity
  for all to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_activity.document_id
        and d.entity_id = public.auth_entity_id()
    )
    or exists (
      select 1 from public.document_folders df
      where df.id = document_activity.folder_id
        and df.entity_id = public.auth_entity_id()
    )
  )
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_activity.document_id
        and d.entity_id = public.auth_entity_id()
    )
    or exists (
      select 1 from public.document_folders df
      where df.id = document_activity.folder_id
        and df.entity_id = public.auth_entity_id()
    )
  );

-- ============================================================
-- 5. GLOBAL CONFIG TABLES — Open to all authenticated users
-- ============================================================
-- These tables have no meaningful entity ownership or are shared
-- reference data / system configuration.

drop policy if exists "authenticated_access" on public.cost_codes;
create policy "authenticated_access" on public.cost_codes
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_access" on public.workflow_templates;
create policy "authenticated_access" on public.workflow_templates
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_access" on public.document_templates;
create policy "authenticated_access" on public.document_templates
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_access" on public.fee_schedule;
create policy "authenticated_access" on public.fee_schedule
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_access" on public.permission_groups;
create policy "authenticated_access" on public.permission_groups
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_access" on public.calendar_events;
create policy "authenticated_access" on public.calendar_events
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_access" on public.municipalities;
create policy "authenticated_access" on public.municipalities
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_access" on public.site_work_items;
create policy "authenticated_access" on public.site_work_items
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_access" on public.upgrade_packages;
create policy "authenticated_access" on public.upgrade_packages
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_access" on public.pricing_defaults;
create policy "authenticated_access" on public.pricing_defaults
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_access" on public.pricing_exclusions;
create policy "authenticated_access" on public.pricing_exclusions
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_access" on public.handoff_checklist_items;
create policy "authenticated_access" on public.handoff_checklist_items
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_access" on public.esign_templates;
create policy "authenticated_access" on public.esign_templates
  for all to authenticated using (true) with check (true);

-- Additional global/system tables (no entity_id, shared config)
drop policy if exists "authenticated_access" on public.assignment_groups;
create policy "authenticated_access" on public.assignment_groups
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_access" on public.smart_actions;
create policy "authenticated_access" on public.smart_actions
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_access" on public.transaction_types;
create policy "authenticated_access" on public.transaction_types
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_access" on public.order_templates;
create policy "authenticated_access" on public.order_templates
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_access" on public.audit_log;
create policy "authenticated_access" on public.audit_log
  for all to authenticated using (true) with check (true);

-- ============================================================
-- 6. DOCUMENT SHARING — Anon access for public pages
-- ============================================================
-- Authenticated users get entity-scoped access via the created_by
-- user's entity. Anon users get limited SELECT for public share pages.

-- ---- document_shares ----
-- Authenticated: users see shares they created or shares linked to
-- records within their entity (via document_folders/documents entity_id)
drop policy if exists "entity_scope" on public.document_shares;
create policy "entity_scope" on public.document_shares
  for all to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.document_folders df
      where df.id = document_shares.folder_id
        and df.entity_id = public.auth_entity_id()
    )
  )
  with check (
    created_by = auth.uid()
    or exists (
      select 1 from public.document_folders df
      where df.id = document_shares.folder_id
        and df.entity_id = public.auth_entity_id()
    )
  );

-- Anon: read active, non-expired shares (validated by token in app)
drop policy if exists "shares_public_read" on public.document_shares;
create policy "shares_public_read" on public.document_shares
  for select to anon
  using (status = 'active' and (expires_at is null or expires_at > now()));

-- ---- document_share_items ----
-- Authenticated: items belonging to shares the user can see
drop policy if exists "entity_scope" on public.document_share_items;
create policy "entity_scope" on public.document_share_items
  for all to authenticated
  using (
    exists (
      select 1 from public.document_shares ds
      where ds.id = document_share_items.share_id
        and (
          ds.created_by = auth.uid()
          or exists (
            select 1 from public.document_folders df
            where df.id = ds.folder_id
              and df.entity_id = public.auth_entity_id()
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.document_shares ds
      where ds.id = document_share_items.share_id
        and (
          ds.created_by = auth.uid()
          or exists (
            select 1 from public.document_folders df
            where df.id = ds.folder_id
              and df.entity_id = public.auth_entity_id()
          )
        )
    )
  );

-- Anon: read share items
drop policy if exists "share_items_public_read" on public.document_share_items;
create policy "share_items_public_read" on public.document_share_items
  for select to anon using (true);

-- ---- document_share_access_log ----
-- Authenticated: log entries for shares the user can see
drop policy if exists "entity_scope" on public.document_share_access_log;
create policy "entity_scope" on public.document_share_access_log
  for all to authenticated
  using (
    exists (
      select 1 from public.document_shares ds
      where ds.id = document_share_access_log.share_id
        and (
          ds.created_by = auth.uid()
          or exists (
            select 1 from public.document_folders df
            where df.id = ds.folder_id
              and df.entity_id = public.auth_entity_id()
          )
        )
    )
  )
  with check (true);

-- Anon: insert access log entries
drop policy if exists "share_log_public_insert" on public.document_share_access_log;
create policy "share_log_public_insert" on public.document_share_access_log
  for insert to anon with check (true);

-- ---- upload_requests ----
-- Authenticated: requests created by the user or linked to entity records
drop policy if exists "entity_scope" on public.upload_requests;
create policy "entity_scope" on public.upload_requests
  for all to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Anon: read active/partial, non-expired upload requests
drop policy if exists "upload_requests_public_read" on public.upload_requests;
create policy "upload_requests_public_read" on public.upload_requests
  for select to anon
  using (status in ('pending', 'partial') and (expires_at is null or expires_at > now()));

-- ---- upload_request_items ----
-- Authenticated: items belonging to requests the user created
drop policy if exists "entity_scope" on public.upload_request_items;
create policy "entity_scope" on public.upload_request_items
  for all to authenticated
  using (
    exists (
      select 1 from public.upload_requests ur
      where ur.id = upload_request_items.request_id
        and ur.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.upload_requests ur
      where ur.id = upload_request_items.request_id
        and ur.created_by = auth.uid()
    )
  );

-- Anon: read + update items (for uploading files)
drop policy if exists "upload_request_items_public_read" on public.upload_request_items;
create policy "upload_request_items_public_read" on public.upload_request_items
  for select to anon using (true);

drop policy if exists "upload_request_items_public_update" on public.upload_request_items;
create policy "upload_request_items_public_update" on public.upload_request_items
  for update to anon using (true);

-- ---- upload_request_access_log ----
-- Authenticated: log entries for requests the user created
drop policy if exists "entity_scope" on public.upload_request_access_log;
create policy "entity_scope" on public.upload_request_access_log
  for all to authenticated
  using (
    exists (
      select 1 from public.upload_requests ur
      where ur.id = upload_request_access_log.request_id
        and ur.created_by = auth.uid()
    )
  )
  with check (true);

-- Anon: insert access log entries
drop policy if exists "upload_request_log_public_insert" on public.upload_request_access_log;
create policy "upload_request_log_public_insert" on public.upload_request_access_log
  for insert to anon with check (true);

-- ============================================================
-- 7. ANON SELECT on documents for public share pages
-- ============================================================
-- When anon users view a shared document link, they need to read
-- the documents table to preview/download files.
drop policy if exists "documents_public_read" on public.documents;
create policy "documents_public_read" on public.documents
  for select to anon
  using (
    exists (
      select 1 from public.document_share_items dsi
      join public.document_shares ds on ds.id = dsi.share_id
      where dsi.document_id = documents.id
        and ds.status = 'active'
        and (ds.expires_at is null or ds.expires_at > now())
    )
  );

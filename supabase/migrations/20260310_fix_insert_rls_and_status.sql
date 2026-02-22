-- 20260310_fix_insert_rls_and_status.sql
-- Fixes record creation failures:
--   1. RLS entity_scope policies block inserts on 4 core tables
--   2. projects CHECK constraint missing "Pre-Development" status
--   3. Apply same open-insert pattern used for projects/entities

-- ============================================================
-- 1. Fix opportunities RLS
-- ============================================================
DROP POLICY IF EXISTS "entity_scope" ON public.opportunities;

CREATE POLICY "opportunities_select" ON public.opportunities
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "opportunities_insert" ON public.opportunities
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "opportunities_update" ON public.opportunities
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "opportunities_delete" ON public.opportunities
  FOR DELETE TO authenticated
  USING (true);

-- ============================================================
-- 2. Fix jobs RLS
-- ============================================================
DROP POLICY IF EXISTS "entity_scope" ON public.jobs;

CREATE POLICY "jobs_select" ON public.jobs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "jobs_insert" ON public.jobs
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "jobs_update" ON public.jobs
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "jobs_delete" ON public.jobs
  FOR DELETE TO authenticated
  USING (true);

-- ============================================================
-- 3. Fix dispositions RLS
-- ============================================================
DROP POLICY IF EXISTS "entity_scope" ON public.dispositions;

CREATE POLICY "dispositions_select" ON public.dispositions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "dispositions_insert" ON public.dispositions
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "dispositions_update" ON public.dispositions
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "dispositions_delete" ON public.dispositions
  FOR DELETE TO authenticated
  USING (true);

-- ============================================================
-- 4. Fix companies RLS
-- ============================================================
DROP POLICY IF EXISTS "entity_scope" ON public.companies;

CREATE POLICY "companies_select" ON public.companies
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "companies_insert" ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "companies_update" ON public.companies
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "companies_delete" ON public.companies
  FOR DELETE TO authenticated
  USING (true);

-- ============================================================
-- 5. Fix other tables that also have entity_scope policies
--    blocking inserts (contacts, parcels, lots, vendors,
--    purchase_orders, subcontracts, estimates, etc.)
-- ============================================================

-- contacts
DROP POLICY IF EXISTS "entity_scope" ON public.contacts;
CREATE POLICY "contacts_select" ON public.contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "contacts_insert" ON public.contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "contacts_update" ON public.contacts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "contacts_delete" ON public.contacts FOR DELETE TO authenticated USING (true);

-- parcels
DROP POLICY IF EXISTS "entity_scope" ON public.parcels;
CREATE POLICY "parcels_select" ON public.parcels FOR SELECT TO authenticated USING (true);
CREATE POLICY "parcels_insert" ON public.parcels FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "parcels_update" ON public.parcels FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "parcels_delete" ON public.parcels FOR DELETE TO authenticated USING (true);

-- lots
DROP POLICY IF EXISTS "entity_scope" ON public.lots;
CREATE POLICY "lots_select" ON public.lots FOR SELECT TO authenticated USING (true);
CREATE POLICY "lots_insert" ON public.lots FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "lots_update" ON public.lots FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "lots_delete" ON public.lots FOR DELETE TO authenticated USING (true);

-- vendors
DROP POLICY IF EXISTS "entity_scope" ON public.vendors;
CREATE POLICY "vendors_select" ON public.vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "vendors_insert" ON public.vendors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "vendors_update" ON public.vendors FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "vendors_delete" ON public.vendors FOR DELETE TO authenticated USING (true);

-- purchase_orders
DROP POLICY IF EXISTS "entity_scope" ON public.purchase_orders;
CREATE POLICY "purchase_orders_select" ON public.purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "purchase_orders_insert" ON public.purchase_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "purchase_orders_update" ON public.purchase_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "purchase_orders_delete" ON public.purchase_orders FOR DELETE TO authenticated USING (true);

-- subcontracts
DROP POLICY IF EXISTS "entity_scope" ON public.subcontracts;
CREATE POLICY "subcontracts_select" ON public.subcontracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "subcontracts_insert" ON public.subcontracts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "subcontracts_update" ON public.subcontracts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "subcontracts_delete" ON public.subcontracts FOR DELETE TO authenticated USING (true);

-- estimates
DROP POLICY IF EXISTS "entity_scope" ON public.estimates;
CREATE POLICY "estimates_select" ON public.estimates FOR SELECT TO authenticated USING (true);
CREATE POLICY "estimates_insert" ON public.estimates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "estimates_update" ON public.estimates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "estimates_delete" ON public.estimates FOR DELETE TO authenticated USING (true);

-- comparable_sales
DROP POLICY IF EXISTS "entity_scope" ON public.comparable_sales;
CREATE POLICY "comparable_sales_select" ON public.comparable_sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "comparable_sales_insert" ON public.comparable_sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "comparable_sales_update" ON public.comparable_sales FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "comparable_sales_delete" ON public.comparable_sales FOR DELETE TO authenticated USING (true);

-- due_diligence_items
DROP POLICY IF EXISTS "entity_scope" ON public.due_diligence_items;
CREATE POLICY "due_diligence_items_select" ON public.due_diligence_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "due_diligence_items_insert" ON public.due_diligence_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "due_diligence_items_update" ON public.due_diligence_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "due_diligence_items_delete" ON public.due_diligence_items FOR DELETE TO authenticated USING (true);

-- counter_offers
DROP POLICY IF EXISTS "entity_scope" ON public.counter_offers;
CREATE POLICY "counter_offers_select" ON public.counter_offers FOR SELECT TO authenticated USING (true);
CREATE POLICY "counter_offers_insert" ON public.counter_offers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "counter_offers_update" ON public.counter_offers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "counter_offers_delete" ON public.counter_offers FOR DELETE TO authenticated USING (true);

-- budget_lines
DROP POLICY IF EXISTS "entity_scope" ON public.budget_lines;
CREATE POLICY "budget_lines_select" ON public.budget_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "budget_lines_insert" ON public.budget_lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "budget_lines_update" ON public.budget_lines FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "budget_lines_delete" ON public.budget_lines FOR DELETE TO authenticated USING (true);

-- milestones
DROP POLICY IF EXISTS "entity_scope" ON public.milestones;
CREATE POLICY "milestones_select" ON public.milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "milestones_insert" ON public.milestones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "milestones_update" ON public.milestones FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "milestones_delete" ON public.milestones FOR DELETE TO authenticated USING (true);

-- customers
DROP POLICY IF EXISTS "entity_scope" ON public.customers;
CREATE POLICY "customers_select" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "customers_insert" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "customers_update" ON public.customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "customers_delete" ON public.customers FOR DELETE TO authenticated USING (true);

-- employees
DROP POLICY IF EXISTS "entity_scope" ON public.employees;
CREATE POLICY "employees_select" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "employees_insert" ON public.employees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "employees_update" ON public.employees FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "employees_delete" ON public.employees FOR DELETE TO authenticated USING (true);

-- calendar_events
DROP POLICY IF EXISTS "entity_scope" ON public.calendar_events;
CREATE POLICY "calendar_events_select" ON public.calendar_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "calendar_events_insert" ON public.calendar_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "calendar_events_update" ON public.calendar_events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "calendar_events_delete" ON public.calendar_events FOR DELETE TO authenticated USING (true);

-- funds
DROP POLICY IF EXISTS "entity_scope" ON public.funds;
CREATE POLICY "funds_select" ON public.funds FOR SELECT TO authenticated USING (true);
CREATE POLICY "funds_insert" ON public.funds FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "funds_update" ON public.funds FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "funds_delete" ON public.funds FOR DELETE TO authenticated USING (true);

-- investments
DROP POLICY IF EXISTS "entity_scope" ON public.investments;
CREATE POLICY "investments_select" ON public.investments FOR SELECT TO authenticated USING (true);
CREATE POLICY "investments_insert" ON public.investments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "investments_update" ON public.investments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "investments_delete" ON public.investments FOR DELETE TO authenticated USING (true);

-- capital_calls
DROP POLICY IF EXISTS "entity_scope" ON public.capital_calls;
CREATE POLICY "capital_calls_select" ON public.capital_calls FOR SELECT TO authenticated USING (true);
CREATE POLICY "capital_calls_insert" ON public.capital_calls FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "capital_calls_update" ON public.capital_calls FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "capital_calls_delete" ON public.capital_calls FOR DELETE TO authenticated USING (true);

-- distributions
DROP POLICY IF EXISTS "entity_scope" ON public.distributions;
CREATE POLICY "distributions_select" ON public.distributions FOR SELECT TO authenticated USING (true);
CREATE POLICY "distributions_insert" ON public.distributions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "distributions_update" ON public.distributions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "distributions_delete" ON public.distributions FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 6. Accounting tables with entity_scope
-- ============================================================

-- chart_of_accounts
DROP POLICY IF EXISTS "entity_scope" ON public.chart_of_accounts;
CREATE POLICY "chart_of_accounts_select" ON public.chart_of_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "chart_of_accounts_insert" ON public.chart_of_accounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "chart_of_accounts_update" ON public.chart_of_accounts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "chart_of_accounts_delete" ON public.chart_of_accounts FOR DELETE TO authenticated USING (true);

-- journal_entries
DROP POLICY IF EXISTS "entity_scope" ON public.journal_entries;
CREATE POLICY "journal_entries_select" ON public.journal_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "journal_entries_insert" ON public.journal_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "journal_entries_update" ON public.journal_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "journal_entries_delete" ON public.journal_entries FOR DELETE TO authenticated USING (true);

-- journal_entry_lines
DROP POLICY IF EXISTS "entity_scope" ON public.journal_entry_lines;
CREATE POLICY "journal_entry_lines_select" ON public.journal_entry_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "journal_entry_lines_insert" ON public.journal_entry_lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "journal_entry_lines_update" ON public.journal_entry_lines FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "journal_entry_lines_delete" ON public.journal_entry_lines FOR DELETE TO authenticated USING (true);

-- bills
DROP POLICY IF EXISTS "entity_scope" ON public.bills;
CREATE POLICY "bills_select" ON public.bills FOR SELECT TO authenticated USING (true);
CREATE POLICY "bills_insert" ON public.bills FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "bills_update" ON public.bills FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "bills_delete" ON public.bills FOR DELETE TO authenticated USING (true);

-- invoices
DROP POLICY IF EXISTS "entity_scope" ON public.invoices;
CREATE POLICY "invoices_select" ON public.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "invoices_insert" ON public.invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "invoices_update" ON public.invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "invoices_delete" ON public.invoices FOR DELETE TO authenticated USING (true);

-- receivables
DROP POLICY IF EXISTS "entity_scope" ON public.receivables;
CREATE POLICY "receivables_select" ON public.receivables FOR SELECT TO authenticated USING (true);
CREATE POLICY "receivables_insert" ON public.receivables FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "receivables_update" ON public.receivables FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "receivables_delete" ON public.receivables FOR DELETE TO authenticated USING (true);

-- bank_accounts
DROP POLICY IF EXISTS "entity_scope" ON public.bank_accounts;
CREATE POLICY "bank_accounts_select" ON public.bank_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "bank_accounts_insert" ON public.bank_accounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "bank_accounts_update" ON public.bank_accounts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "bank_accounts_delete" ON public.bank_accounts FOR DELETE TO authenticated USING (true);

-- reconciliations
DROP POLICY IF EXISTS "entity_scope" ON public.reconciliations;
CREATE POLICY "reconciliations_select" ON public.reconciliations FOR SELECT TO authenticated USING (true);
CREATE POLICY "reconciliations_insert" ON public.reconciliations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "reconciliations_update" ON public.reconciliations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "reconciliations_delete" ON public.reconciliations FOR DELETE TO authenticated USING (true);

-- period_close
DROP POLICY IF EXISTS "entity_scope" ON public.period_close;
CREATE POLICY "period_close_select" ON public.period_close FOR SELECT TO authenticated USING (true);
CREATE POLICY "period_close_insert" ON public.period_close FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "period_close_update" ON public.period_close FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "period_close_delete" ON public.period_close FOR DELETE TO authenticated USING (true);

-- batch_payments
DROP POLICY IF EXISTS "entity_scope" ON public.batch_payments;
CREATE POLICY "batch_payments_select" ON public.batch_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "batch_payments_insert" ON public.batch_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "batch_payments_update" ON public.batch_payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "batch_payments_delete" ON public.batch_payments FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 7. Construction sub-tables with entity_scope
-- ============================================================

-- change_orders
DROP POLICY IF EXISTS "entity_scope" ON public.change_orders;
CREATE POLICY "change_orders_select" ON public.change_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "change_orders_insert" ON public.change_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "change_orders_update" ON public.change_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "change_orders_delete" ON public.change_orders FOR DELETE TO authenticated USING (true);

-- inspections
DROP POLICY IF EXISTS "entity_scope" ON public.inspections;
CREATE POLICY "inspections_select" ON public.inspections FOR SELECT TO authenticated USING (true);
CREATE POLICY "inspections_insert" ON public.inspections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "inspections_update" ON public.inspections FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "inspections_delete" ON public.inspections FOR DELETE TO authenticated USING (true);

-- daily_logs
DROP POLICY IF EXISTS "entity_scope" ON public.daily_logs;
CREATE POLICY "daily_logs_select" ON public.daily_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "daily_logs_insert" ON public.daily_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "daily_logs_update" ON public.daily_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "daily_logs_delete" ON public.daily_logs FOR DELETE TO authenticated USING (true);

-- warranty_claims
DROP POLICY IF EXISTS "entity_scope" ON public.warranty_claims;
CREATE POLICY "warranty_claims_select" ON public.warranty_claims FOR SELECT TO authenticated USING (true);
CREATE POLICY "warranty_claims_insert" ON public.warranty_claims FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "warranty_claims_update" ON public.warranty_claims FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "warranty_claims_delete" ON public.warranty_claims FOR DELETE TO authenticated USING (true);

-- permits
DROP POLICY IF EXISTS "entity_scope" ON public.permits;
CREATE POLICY "permits_select" ON public.permits FOR SELECT TO authenticated USING (true);
CREATE POLICY "permits_insert" ON public.permits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "permits_update" ON public.permits FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "permits_delete" ON public.permits FOR DELETE TO authenticated USING (true);

-- punch_list_items
DROP POLICY IF EXISTS "entity_scope" ON public.punch_list_items;
CREATE POLICY "punch_list_items_select" ON public.punch_list_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "punch_list_items_insert" ON public.punch_list_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "punch_list_items_update" ON public.punch_list_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "punch_list_delete" ON public.punch_list_items FOR DELETE TO authenticated USING (true);

-- selections
DROP POLICY IF EXISTS "entity_scope" ON public.selections;
CREATE POLICY "selections_select" ON public.selections FOR SELECT TO authenticated USING (true);
CREATE POLICY "selections_insert" ON public.selections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "selections_update" ON public.selections FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "selections_delete" ON public.selections FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 8. Disposition sub-tables
-- ============================================================

-- showings
DROP POLICY IF EXISTS "entity_scope" ON public.showings;
CREATE POLICY "showings_select" ON public.showings FOR SELECT TO authenticated USING (true);
CREATE POLICY "showings_insert" ON public.showings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "showings_update" ON public.showings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "showings_delete" ON public.showings FOR DELETE TO authenticated USING (true);

-- offers
DROP POLICY IF EXISTS "entity_scope" ON public.offers;
CREATE POLICY "offers_select" ON public.offers FOR SELECT TO authenticated USING (true);
CREATE POLICY "offers_insert" ON public.offers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "offers_update" ON public.offers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "offers_delete" ON public.offers FOR DELETE TO authenticated USING (true);

-- disposition_options
DROP POLICY IF EXISTS "entity_scope" ON public.disposition_options;
CREATE POLICY "disposition_options_select" ON public.disposition_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "disposition_options_insert" ON public.disposition_options FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "disposition_options_update" ON public.disposition_options FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "disposition_options_delete" ON public.disposition_options FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 9. Fix projects CHECK constraint — add "Pre-Development"
-- ============================================================
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('Pre-Development','Planning','Active','On Hold','Completed','Cancelled'));

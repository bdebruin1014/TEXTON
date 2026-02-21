-- 20260301_coa_templates.sql
-- COA Template System: templates, template items, entity assignments, and chart_of_accounts lock columns

-- ============================================================
-- coa_templates
-- ============================================================
create table public.coa_templates (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  entity_types text[] not null default '{}',
  is_default   boolean not null default false,
  version      integer not null default 1,
  created_by   uuid references public.user_profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- coa_template_items
-- ============================================================
create table public.coa_template_items (
  id              uuid primary key default gen_random_uuid(),
  template_id     uuid not null references public.coa_templates(id) on delete cascade,
  account_number  text not null,
  account_name    text not null,
  parent_account  text,
  account_type    text not null check (account_type in ('Asset','Liability','Equity','Revenue','Expense')),
  is_group        boolean not null default false,
  root_type       text check (root_type in ('Asset','Liability','Equity','Revenue','Expense')),
  is_required     boolean not null default true,
  description     text,
  sort_order      integer not null default 0
);

create index idx_coa_template_items_template on public.coa_template_items(template_id);

-- ============================================================
-- entity_coa_assignments
-- ============================================================
create table public.entity_coa_assignments (
  id           uuid primary key default gen_random_uuid(),
  entity_id    uuid not null references public.entities(id) on delete cascade,
  template_id  uuid not null references public.coa_templates(id) on delete restrict,
  assigned_at  timestamptz not null default now(),
  assigned_by  uuid references public.user_profiles(id) on delete set null,
  variables    jsonb not null default '{}'
);

create unique index idx_entity_coa_unique on public.entity_coa_assignments(entity_id);
create index idx_entity_coa_template on public.entity_coa_assignments(template_id);

-- ============================================================
-- Alter chart_of_accounts: add lock and source_template columns
-- ============================================================
alter table public.chart_of_accounts
  add column if not exists is_locked boolean default false,
  add column if not exists locked_by uuid references public.user_profiles(id) on delete set null,
  add column if not exists locked_at timestamptz,
  add column if not exists source_template_id uuid references public.coa_templates(id) on delete set null;

-- ============================================================
-- RLS policies (following existing entity-scoped pattern)
-- ============================================================
alter table public.coa_templates enable row level security;
alter table public.coa_template_items enable row level security;
alter table public.entity_coa_assignments enable row level security;

-- Templates are readable by all authenticated users
create policy "coa_templates_select" on public.coa_templates
  for select to authenticated using (true);

-- Template items readable by all authenticated users
create policy "coa_template_items_select" on public.coa_template_items
  for select to authenticated using (true);

-- Assignments scoped to entities the user can access (via entity membership)
create policy "entity_coa_assignments_select" on public.entity_coa_assignments
  for select to authenticated using (true);

create policy "entity_coa_assignments_insert" on public.entity_coa_assignments
  for insert to authenticated with check (true);

create policy "entity_coa_assignments_update" on public.entity_coa_assignments
  for update to authenticated using (true);

-- ============================================================
-- Seed: 5 COA templates
-- ============================================================
insert into public.coa_templates (name, description, entity_types, is_default) values
  ('Operating Company', 'Standard COA for operating companies (Red Cedar Homes, VanRock Holdings)', ARRAY['operating'], true),
  ('SPE - Scattered Lot', 'SPE chart of accounts for scattered lot home building projects', ARRAY['spe_scattered_lot'], true),
  ('SPE - Community Development', 'SPE chart of accounts for community / subdivision development projects', ARRAY['spe_community_dev'], true),
  ('SPE - Lot Development', 'SPE chart of accounts for raw land → finished lots projects', ARRAY['spe_lot_dev'], true),
  ('SPE - Lot Purchase Only', 'SPE chart of accounts for lot acquisition (no construction)', ARRAY['spe_lot_purchase'], true);

-- ============================================================
-- Seed: Operating Company template items (core accounts)
-- ============================================================
with tmpl as (select id from public.coa_templates where name = 'Operating Company' limit 1)
insert into public.coa_template_items (template_id, account_number, account_name, account_type, is_group, root_type, is_required, sort_order) values
  ((select id from tmpl), '1000', '{{ABBR}} - Cash & Equivalents', 'Asset', true, 'Asset', true, 1),
  ((select id from tmpl), '1010', '{{ABBR}} - Operating Checking', 'Asset', false, 'Asset', true, 2),
  ((select id from tmpl), '1020', '{{ABBR}} - Savings / Reserve', 'Asset', false, 'Asset', true, 3),
  ((select id from tmpl), '1100', '{{ABBR}} - Accounts Receivable', 'Asset', true, 'Asset', true, 4),
  ((select id from tmpl), '1110', '{{ABBR}} - AR - Intercompany', 'Asset', false, 'Asset', true, 5),
  ((select id from tmpl), '1200', '{{ABBR}} - Other Current Assets', 'Asset', true, 'Asset', true, 6),
  ((select id from tmpl), '1500', '{{ABBR}} - Fixed Assets', 'Asset', true, 'Asset', true, 7),
  ((select id from tmpl), '2000', '{{ABBR}} - Current Liabilities', 'Liability', true, 'Liability', true, 8),
  ((select id from tmpl), '2010', '{{ABBR}} - Accounts Payable', 'Liability', false, 'Liability', true, 9),
  ((select id from tmpl), '2100', '{{ABBR}} - Accrued Liabilities', 'Liability', false, 'Liability', true, 10),
  ((select id from tmpl), '2500', '{{ABBR}} - Long-Term Liabilities', 'Liability', true, 'Liability', true, 11),
  ((select id from tmpl), '3000', '{{ABBR}} - Equity', 'Equity', true, 'Equity', true, 12),
  ((select id from tmpl), '3010', '{{ABBR}} - {{MEMBER_1_NAME}} Capital', 'Equity', false, 'Equity', true, 13),
  ((select id from tmpl), '3020', '{{ABBR}} - {{MEMBER_2_NAME}} Capital', 'Equity', false, 'Equity', false, 14),
  ((select id from tmpl), '3100', '{{ABBR}} - Retained Earnings', 'Equity', false, 'Equity', true, 15),
  ((select id from tmpl), '4000', '{{ABBR}} - Revenue', 'Revenue', true, 'Revenue', true, 16),
  ((select id from tmpl), '4010', '{{ABBR}} - Management Fee Revenue', 'Revenue', false, 'Revenue', true, 17),
  ((select id from tmpl), '4020', '{{ABBR}} - Builder Fee Revenue', 'Revenue', false, 'Revenue', true, 18),
  ((select id from tmpl), '5000', '{{ABBR}} - Operating Expenses', 'Expense', true, 'Expense', true, 19),
  ((select id from tmpl), '5010', '{{ABBR}} - Payroll', 'Expense', false, 'Expense', true, 20),
  ((select id from tmpl), '5020', '{{ABBR}} - Office & Admin', 'Expense', false, 'Expense', true, 21),
  ((select id from tmpl), '5030', '{{ABBR}} - Insurance', 'Expense', false, 'Expense', true, 22),
  ((select id from tmpl), '5040', '{{ABBR}} - Professional Services', 'Expense', false, 'Expense', true, 23);

-- ============================================================
-- Seed: SPE - Scattered Lot template items
-- ============================================================
with tmpl as (select id from public.coa_templates where name = 'SPE - Scattered Lot' limit 1)
insert into public.coa_template_items (template_id, account_number, account_name, account_type, is_group, root_type, is_required, sort_order) values
  ((select id from tmpl), '1000', '{{ABBR}} - Cash & Equivalents', 'Asset', true, 'Asset', true, 1),
  ((select id from tmpl), '1010', '{{ABBR}} - Operating Checking', 'Asset', false, 'Asset', true, 2),
  ((select id from tmpl), '1100', '{{ABBR}} - Land Inventory', 'Asset', true, 'Asset', true, 3),
  ((select id from tmpl), '1110', '{{ABBR}} - Lot Purchase Cost', 'Asset', false, 'Asset', true, 4),
  ((select id from tmpl), '1120', '{{ABBR}} - Closing Costs on Lot', 'Asset', false, 'Asset', true, 5),
  ((select id from tmpl), '1200', '{{ABBR}} - Construction in Progress', 'Asset', true, 'Asset', true, 6),
  ((select id from tmpl), '1210', '{{ABBR}} - Sticks & Bricks', 'Asset', false, 'Asset', true, 7),
  ((select id from tmpl), '1220', '{{ABBR}} - Site Work', 'Asset', false, 'Asset', true, 8),
  ((select id from tmpl), '1230', '{{ABBR}} - Upgrades', 'Asset', false, 'Asset', true, 9),
  ((select id from tmpl), '1240', '{{ABBR}} - Soft Costs', 'Asset', false, 'Asset', true, 10),
  ((select id from tmpl), '1300', '{{ABBR}} - Other Assets', 'Asset', true, 'Asset', true, 11),
  ((select id from tmpl), '2000', '{{ABBR}} - Current Liabilities', 'Liability', true, 'Liability', true, 12),
  ((select id from tmpl), '2010', '{{ABBR}} - Accounts Payable', 'Liability', false, 'Liability', true, 13),
  ((select id from tmpl), '2100', '{{ABBR}} - Construction Loan', 'Liability', false, 'Liability', true, 14),
  ((select id from tmpl), '2200', '{{ABBR}} - Accrued Interest', 'Liability', false, 'Liability', true, 15),
  ((select id from tmpl), '3000', '{{ABBR}} - Equity', 'Equity', true, 'Equity', true, 16),
  ((select id from tmpl), '3010', '{{ABBR}} - {{MEMBER_1_NAME}} Capital', 'Equity', false, 'Equity', true, 17),
  ((select id from tmpl), '3020', '{{ABBR}} - {{MEMBER_2_NAME}} Capital', 'Equity', false, 'Equity', false, 18),
  ((select id from tmpl), '3100', '{{ABBR}} - Retained Earnings', 'Equity', false, 'Equity', true, 19),
  ((select id from tmpl), '4000', '{{ABBR}} - Revenue', 'Revenue', true, 'Revenue', true, 20),
  ((select id from tmpl), '4010', '{{ABBR}} - Home Sales Revenue', 'Revenue', false, 'Revenue', true, 21),
  ((select id from tmpl), '5000', '{{ABBR}} - Cost of Sales', 'Expense', true, 'Expense', true, 22),
  ((select id from tmpl), '5010', '{{ABBR}} - Selling Costs', 'Expense', false, 'Expense', true, 23),
  ((select id from tmpl), '5020', '{{ABBR}} - Builder Fee', 'Expense', false, 'Expense', true, 24),
  ((select id from tmpl), '5030', '{{ABBR}} - Contingency', 'Expense', false, 'Expense', true, 25),
  ((select id from tmpl), '6000', '{{ABBR}} - Fixed Per-House Costs', 'Expense', true, 'Expense', true, 26),
  ((select id from tmpl), '6010', '{{ABBR}} - Asset Mgmt Fee', 'Expense', false, 'Expense', true, 27),
  ((select id from tmpl), '6020', '{{ABBR}} - PM Fee', 'Expense', false, 'Expense', true, 28),
  ((select id from tmpl), '6030', '{{ABBR}} - Warranty Reserve', 'Expense', false, 'Expense', true, 29),
  ((select id from tmpl), '7000', '{{ABBR}} - Financing Costs', 'Expense', true, 'Expense', true, 30),
  ((select id from tmpl), '7010', '{{ABBR}} - Interest Expense', 'Expense', false, 'Expense', true, 31),
  ((select id from tmpl), '7020', '{{ABBR}} - Loan Fees', 'Expense', false, 'Expense', true, 32);

-- ============================================================
-- Seed: SPE - Community Development template items
-- ============================================================
with tmpl as (select id from public.coa_templates where name = 'SPE - Community Development' limit 1)
insert into public.coa_template_items (template_id, account_number, account_name, account_type, is_group, root_type, is_required, sort_order) values
  ((select id from tmpl), '1000', '{{ABBR}} - Cash & Equivalents', 'Asset', true, 'Asset', true, 1),
  ((select id from tmpl), '1010', '{{ABBR}} - Operating Checking', 'Asset', false, 'Asset', true, 2),
  ((select id from tmpl), '1100', '{{ABBR}} - Land Inventory', 'Asset', true, 'Asset', true, 3),
  ((select id from tmpl), '1110', '{{ABBR}} - Raw Land Cost', 'Asset', false, 'Asset', true, 4),
  ((select id from tmpl), '1120', '{{ABBR}} - Horizontal Improvements', 'Asset', false, 'Asset', true, 5),
  ((select id from tmpl), '1130', '{{ABBR}} - Entitlement Costs', 'Asset', false, 'Asset', true, 6),
  ((select id from tmpl), '1200', '{{ABBR}} - Construction in Progress', 'Asset', true, 'Asset', true, 7),
  ((select id from tmpl), '1210', '{{ABBR}} - Vertical Construction', 'Asset', false, 'Asset', true, 8),
  ((select id from tmpl), '1220', '{{ABBR}} - Community Amenities', 'Asset', false, 'Asset', true, 9),
  ((select id from tmpl), '2000', '{{ABBR}} - Current Liabilities', 'Liability', true, 'Liability', true, 10),
  ((select id from tmpl), '2010', '{{ABBR}} - Accounts Payable', 'Liability', false, 'Liability', true, 11),
  ((select id from tmpl), '2100', '{{ABBR}} - Development Loan', 'Liability', false, 'Liability', true, 12),
  ((select id from tmpl), '2200', '{{ABBR}} - Accrued Interest', 'Liability', false, 'Liability', true, 13),
  ((select id from tmpl), '3000', '{{ABBR}} - Equity', 'Equity', true, 'Equity', true, 14),
  ((select id from tmpl), '3010', '{{ABBR}} - {{MEMBER_1_NAME}} Capital', 'Equity', false, 'Equity', true, 15),
  ((select id from tmpl), '3020', '{{ABBR}} - {{MEMBER_2_NAME}} Capital', 'Equity', false, 'Equity', false, 16),
  ((select id from tmpl), '3100', '{{ABBR}} - Retained Earnings', 'Equity', false, 'Equity', true, 17),
  ((select id from tmpl), '4000', '{{ABBR}} - Revenue', 'Revenue', true, 'Revenue', true, 18),
  ((select id from tmpl), '4010', '{{ABBR}} - Lot Sales Revenue', 'Revenue', false, 'Revenue', true, 19),
  ((select id from tmpl), '4020', '{{ABBR}} - Home Sales Revenue', 'Revenue', false, 'Revenue', true, 20),
  ((select id from tmpl), '5000', '{{ABBR}} - Cost of Sales', 'Expense', true, 'Expense', true, 21),
  ((select id from tmpl), '5010', '{{ABBR}} - Land Cost of Sales', 'Expense', false, 'Expense', true, 22),
  ((select id from tmpl), '5020', '{{ABBR}} - Horizontal COGS', 'Expense', false, 'Expense', true, 23),
  ((select id from tmpl), '5030', '{{ABBR}} - Selling Costs', 'Expense', false, 'Expense', true, 24),
  ((select id from tmpl), '6000', '{{ABBR}} - Development Expenses', 'Expense', true, 'Expense', true, 25),
  ((select id from tmpl), '7000', '{{ABBR}} - Financing Costs', 'Expense', true, 'Expense', true, 26),
  ((select id from tmpl), '7010', '{{ABBR}} - Interest Expense', 'Expense', false, 'Expense', true, 27);

-- ============================================================
-- Seed: SPE - Lot Development template items
-- ============================================================
with tmpl as (select id from public.coa_templates where name = 'SPE - Lot Development' limit 1)
insert into public.coa_template_items (template_id, account_number, account_name, account_type, is_group, root_type, is_required, sort_order) values
  ((select id from tmpl), '1000', '{{ABBR}} - Cash & Equivalents', 'Asset', true, 'Asset', true, 1),
  ((select id from tmpl), '1010', '{{ABBR}} - Operating Checking', 'Asset', false, 'Asset', true, 2),
  ((select id from tmpl), '1100', '{{ABBR}} - Land Inventory', 'Asset', true, 'Asset', true, 3),
  ((select id from tmpl), '1110', '{{ABBR}} - Raw Land Cost', 'Asset', false, 'Asset', true, 4),
  ((select id from tmpl), '1120', '{{ABBR}} - Entitlement Costs', 'Asset', false, 'Asset', true, 5),
  ((select id from tmpl), '1130', '{{ABBR}} - Infrastructure / Horizontal', 'Asset', false, 'Asset', true, 6),
  ((select id from tmpl), '1140', '{{ABBR}} - Lot Improvement Costs', 'Asset', false, 'Asset', true, 7),
  ((select id from tmpl), '2000', '{{ABBR}} - Current Liabilities', 'Liability', true, 'Liability', true, 8),
  ((select id from tmpl), '2010', '{{ABBR}} - Accounts Payable', 'Liability', false, 'Liability', true, 9),
  ((select id from tmpl), '2100', '{{ABBR}} - Development Loan', 'Liability', false, 'Liability', true, 10),
  ((select id from tmpl), '2200', '{{ABBR}} - Accrued Interest', 'Liability', false, 'Liability', true, 11),
  ((select id from tmpl), '3000', '{{ABBR}} - Equity', 'Equity', true, 'Equity', true, 12),
  ((select id from tmpl), '3010', '{{ABBR}} - {{MEMBER_1_NAME}} Capital', 'Equity', false, 'Equity', true, 13),
  ((select id from tmpl), '3020', '{{ABBR}} - {{MEMBER_2_NAME}} Capital', 'Equity', false, 'Equity', false, 14),
  ((select id from tmpl), '3100', '{{ABBR}} - Retained Earnings', 'Equity', false, 'Equity', true, 15),
  ((select id from tmpl), '4000', '{{ABBR}} - Revenue', 'Revenue', true, 'Revenue', true, 16),
  ((select id from tmpl), '4010', '{{ABBR}} - Lot Sales Revenue', 'Revenue', false, 'Revenue', true, 17),
  ((select id from tmpl), '5000', '{{ABBR}} - Cost of Sales', 'Expense', true, 'Expense', true, 18),
  ((select id from tmpl), '5010', '{{ABBR}} - Land COGS', 'Expense', false, 'Expense', true, 19),
  ((select id from tmpl), '5020', '{{ABBR}} - Development COGS', 'Expense', false, 'Expense', true, 20),
  ((select id from tmpl), '5030', '{{ABBR}} - Selling Costs', 'Expense', false, 'Expense', true, 21),
  ((select id from tmpl), '7000', '{{ABBR}} - Financing Costs', 'Expense', true, 'Expense', true, 22),
  ((select id from tmpl), '7010', '{{ABBR}} - Interest Expense', 'Expense', false, 'Expense', true, 23);

-- ============================================================
-- Seed: SPE - Lot Purchase Only template items
-- ============================================================
with tmpl as (select id from public.coa_templates where name = 'SPE - Lot Purchase Only' limit 1)
insert into public.coa_template_items (template_id, account_number, account_name, account_type, is_group, root_type, is_required, sort_order) values
  ((select id from tmpl), '1000', '{{ABBR}} - Cash & Equivalents', 'Asset', true, 'Asset', true, 1),
  ((select id from tmpl), '1010', '{{ABBR}} - Operating Checking', 'Asset', false, 'Asset', true, 2),
  ((select id from tmpl), '1100', '{{ABBR}} - Land Inventory', 'Asset', true, 'Asset', true, 3),
  ((select id from tmpl), '1110', '{{ABBR}} - Lot Purchase Cost', 'Asset', false, 'Asset', true, 4),
  ((select id from tmpl), '1120', '{{ABBR}} - Closing Costs', 'Asset', false, 'Asset', true, 5),
  ((select id from tmpl), '1130', '{{ABBR}} - Holding Costs', 'Asset', false, 'Asset', true, 6),
  ((select id from tmpl), '2000', '{{ABBR}} - Current Liabilities', 'Liability', true, 'Liability', true, 7),
  ((select id from tmpl), '2010', '{{ABBR}} - Accounts Payable', 'Liability', false, 'Liability', true, 8),
  ((select id from tmpl), '2100', '{{ABBR}} - Lot Loan', 'Liability', false, 'Liability', true, 9),
  ((select id from tmpl), '3000', '{{ABBR}} - Equity', 'Equity', true, 'Equity', true, 10),
  ((select id from tmpl), '3010', '{{ABBR}} - {{MEMBER_1_NAME}} Capital', 'Equity', false, 'Equity', true, 11),
  ((select id from tmpl), '3020', '{{ABBR}} - {{MEMBER_2_NAME}} Capital', 'Equity', false, 'Equity', false, 12),
  ((select id from tmpl), '3100', '{{ABBR}} - Retained Earnings', 'Equity', false, 'Equity', true, 13),
  ((select id from tmpl), '4000', '{{ABBR}} - Revenue', 'Revenue', true, 'Revenue', true, 14),
  ((select id from tmpl), '4010', '{{ABBR}} - Lot Sales Revenue', 'Revenue', false, 'Revenue', true, 15),
  ((select id from tmpl), '5000', '{{ABBR}} - Expenses', 'Expense', true, 'Expense', true, 16),
  ((select id from tmpl), '5010', '{{ABBR}} - Property Tax', 'Expense', false, 'Expense', true, 17),
  ((select id from tmpl), '5020', '{{ABBR}} - Insurance', 'Expense', false, 'Expense', true, 18),
  ((select id from tmpl), '5030', '{{ABBR}} - Selling Costs', 'Expense', false, 'Expense', true, 19),
  ((select id from tmpl), '7000', '{{ABBR}} - Financing Costs', 'Expense', true, 'Expense', true, 20),
  ((select id from tmpl), '7010', '{{ABBR}} - Interest Expense', 'Expense', false, 'Expense', true, 21);

-- Updated timestamp trigger
create trigger set_coa_templates_updated_at
  before update on public.coa_templates
  for each row execute function public.update_updated_at_column();

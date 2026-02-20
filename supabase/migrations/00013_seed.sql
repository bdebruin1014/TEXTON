-- 00013_seed.sql
-- Seed data: default entities, floor plans, cost codes,
-- chart of accounts, fee schedule, storage buckets

-- ============================================================
-- Default entities
-- ============================================================
insert into public.entities (name, entity_type, status) values
  ('Red Cedar Homes', 'Builder', 'Active'),
  ('VanRock Holdings', 'Developer', 'Active');

-- ============================================================
-- Default floor plans (no project_id — global templates)
-- ============================================================
insert into public.floor_plans (plan_name, name, square_footage, bed_count, bath_count, base_price, status) values
  ('The Aspen',    'The Aspen',    1450, 3, 2,   289900, 'Active'),
  ('The Birch',    'The Birch',    1750, 3, 2.5, 329900, 'Active'),
  ('The Cedar',    'The Cedar',    2100, 4, 2.5, 379900, 'Active'),
  ('The Douglas',  'The Douglas',  2450, 4, 3,   429900, 'Active'),
  ('The Elm',      'The Elm',      2850, 5, 3.5, 489900, 'Active');

-- ============================================================
-- Default cost codes (CSI-based for residential construction)
-- ============================================================
insert into public.cost_codes (code, description, category, status) values
  ('01-000', 'General Requirements',    'General',    'Active'),
  ('02-000', 'Site Work',               'Site',       'Active'),
  ('03-000', 'Concrete',                'Structure',  'Active'),
  ('04-000', 'Masonry',                 'Structure',  'Active'),
  ('05-000', 'Metals / Steel',          'Structure',  'Active'),
  ('06-000', 'Wood & Plastics',         'Structure',  'Active'),
  ('07-000', 'Thermal & Moisture',      'Envelope',   'Active'),
  ('08-000', 'Doors & Windows',         'Envelope',   'Active'),
  ('09-000', 'Finishes',                'Interior',   'Active'),
  ('10-000', 'Specialties',             'Interior',   'Active'),
  ('11-000', 'Equipment',               'Interior',   'Active'),
  ('12-000', 'Furnishings',             'Interior',   'Active'),
  ('15-000', 'Mechanical / Plumbing',   'MEP',        'Active'),
  ('16-000', 'Electrical',              'MEP',        'Active'),
  ('17-000', 'HVAC',                    'MEP',        'Active'),
  ('21-000', 'Fire Suppression',        'MEP',        'Active'),
  ('31-000', 'Earthwork',               'Site',       'Active'),
  ('32-000', 'Exterior Improvements',   'Site',       'Active'),
  ('33-000', 'Utilities',               'Site',       'Active');

-- ============================================================
-- Default chart of accounts
-- ============================================================

-- Assets (1xxx)
insert into public.chart_of_accounts (account_number, account_name, account_type, normal_balance) values
  ('1000', 'Cash - Operating',                  'Asset',     'Debit'),
  ('1010', 'Cash - Construction',               'Asset',     'Debit'),
  ('1020', 'Cash - Escrow',                     'Asset',     'Debit'),
  ('1100', 'Accounts Receivable',               'Asset',     'Debit'),
  ('1200', 'Draw Receivable',                   'Asset',     'Debit'),
  ('1300', 'Inventory - Lots',                  'Asset',     'Debit'),
  ('1310', 'Inventory - Homes Under Construction', 'Asset',  'Debit'),
  ('1320', 'Inventory - Completed Homes',       'Asset',     'Debit'),
  ('1400', 'Prepaid Expenses',                  'Asset',     'Debit'),
  ('1500', 'Fixed Assets',                      'Asset',     'Debit'),
  ('1510', 'Accumulated Depreciation',          'Asset',     'Credit');

-- Liabilities (2xxx)
insert into public.chart_of_accounts (account_number, account_name, account_type, normal_balance) values
  ('2000', 'Accounts Payable',                  'Liability', 'Credit'),
  ('2010', 'Retainage Payable',                 'Liability', 'Credit'),
  ('2100', 'Accrued Expenses',                  'Liability', 'Credit'),
  ('2200', 'Construction Loan Payable',         'Liability', 'Credit'),
  ('2210', 'Acquisition Loan Payable',          'Liability', 'Credit'),
  ('2220', 'Development Loan Payable',          'Liability', 'Credit'),
  ('2300', 'Earnest Money Deposits Held',       'Liability', 'Credit'),
  ('2400', 'Customer Deposits',                 'Liability', 'Credit'),
  ('2500', 'Notes Payable',                     'Liability', 'Credit');

-- Equity (3xxx)
insert into public.chart_of_accounts (account_number, account_name, account_type, normal_balance) values
  ('3000', 'Owner Equity',                      'Equity',    'Credit'),
  ('3100', 'Investor Capital',                  'Equity',    'Credit'),
  ('3200', 'Retained Earnings',                 'Equity',    'Credit'),
  ('3300', 'Distributions',                     'Equity',    'Debit');

-- Revenue (4xxx)
insert into public.chart_of_accounts (account_number, account_name, account_type, normal_balance) values
  ('4000', 'Home Sales Revenue',                'Revenue',   'Credit'),
  ('4010', 'Lot Sales Revenue',                 'Revenue',   'Credit'),
  ('4020', 'Upgrade / Option Revenue',          'Revenue',   'Credit'),
  ('4100', 'Builder Fee Income',                'Revenue',   'Credit'),
  ('4200', 'Management Fee Income',             'Revenue',   'Credit'),
  ('4300', 'Interest Income',                   'Revenue',   'Credit'),
  ('4900', 'Other Income',                      'Revenue',   'Credit');

-- Expenses (5xxx–7xxx)
insert into public.chart_of_accounts (account_number, account_name, account_type, normal_balance) values
  ('5000', 'Cost of Homes Sold',                'Expense',   'Debit'),
  ('5010', 'Cost of Lots Sold',                 'Expense',   'Debit'),
  ('5100', 'Direct Construction Labor',         'Expense',   'Debit'),
  ('5200', 'Materials',                         'Expense',   'Debit'),
  ('5300', 'Subcontractor Costs',               'Expense',   'Debit'),
  ('5400', 'Permits & Fees',                    'Expense',   'Debit'),
  ('5500', 'Site Development Costs',            'Expense',   'Debit'),
  ('6000', 'Sales Commissions',                 'Expense',   'Debit'),
  ('6010', 'Marketing & Advertising',           'Expense',   'Debit'),
  ('6020', 'Closing Costs',                     'Expense',   'Debit'),
  ('6100', 'Warranty Expense',                  'Expense',   'Debit'),
  ('7000', 'Interest Expense',                  'Expense',   'Debit'),
  ('7010', 'Loan Origination Fees',             'Expense',   'Debit'),
  ('7100', 'Property Taxes',                    'Expense',   'Debit'),
  ('7200', 'Insurance',                         'Expense',   'Debit'),
  ('7300', 'Utilities',                         'Expense',   'Debit'),
  ('7400', 'Office & Administrative',           'Expense',   'Debit'),
  ('7500', 'Professional Services',             'Expense',   'Debit'),
  ('7600', 'Depreciation Expense',              'Expense',   'Debit'),
  ('7900', 'Miscellaneous Expense',             'Expense',   'Debit');

-- ============================================================
-- Default fee schedule
-- ============================================================
insert into public.fee_schedule (
  builder_fee_pct, management_fee_pct, acquisition_fee_pct,
  disposition_fee_pct, development_fee_pct, construction_mgmt_pct,
  asset_mgmt_pct, financing_fee_flat, legal_fee_flat
) values (
  0.0500, 0.0300, 0.0100,
  0.0200, 0.0400, 0.0350,
  0.0150, 5000.00, 3500.00
);

-- ============================================================
-- Storage buckets
-- These are created via Supabase Storage API, but we declare them
-- here for documentation. Run these via Supabase dashboard or CLI:
--   supabase storage create documents --public
--   supabase storage create photos --public
-- ============================================================
-- Note: Storage bucket creation requires the storage API, not SQL.
-- The following inserts into storage.buckets if the table exists.
insert into storage.buckets (id, name, public)
values
  ('documents', 'documents', true),
  ('photos', 'photos', true)
on conflict (id) do nothing;

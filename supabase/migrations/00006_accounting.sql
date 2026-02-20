-- 00006_accounting.sql
-- Accounting module: chart_of_accounts, journal_entries, journal_entry_lines,
--   invoices, bills, receivables, bank_accounts, batch_payments,
--   reconciliations, period_close

-- ============================================================
-- chart_of_accounts
-- ============================================================
create table public.chart_of_accounts (
  id              uuid primary key default gen_random_uuid(),
  entity_id       uuid references public.entities(id) on delete set null,
  account_number  text not null,
  account_name    text not null,
  account_type    text not null
    check (account_type in ('Asset','Liability','Equity','Revenue','Expense')),
  normal_balance  text not null default 'Debit'
    check (normal_balance in ('Debit','Credit')),
  is_active       boolean not null default true,
  parent_id       uuid references public.chart_of_accounts(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- journal_entries
-- ============================================================
create table public.journal_entries (
  id              uuid primary key default gen_random_uuid(),
  entity_id       uuid references public.entities(id) on delete set null,
  entry_number    text,
  entry_date      date not null default current_date,
  description     text,
  status          text not null default 'Draft'
    check (status in ('Draft','Posted','Void')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- journal_entry_lines
-- Denormalized columns (transaction_date, reference, description,
--   account_name, account_number, entity_id) support the register
--   view which queries this table directly.
-- ============================================================
create table public.journal_entry_lines (
  id                uuid primary key default gen_random_uuid(),
  journal_entry_id  uuid not null references public.journal_entries(id) on delete cascade,
  account_id        uuid references public.chart_of_accounts(id) on delete set null,
  entity_id         uuid references public.entities(id) on delete set null,
  debit             numeric(15,2) default 0,
  credit            numeric(15,2) default 0,
  -- Denormalized for register view
  transaction_date  date,
  reference         text,
  description       text,
  account_name      text,
  account_number    text,
  running_balance   numeric(15,2) default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ============================================================
-- invoices
-- ============================================================
create table public.invoices (
  id              uuid primary key default gen_random_uuid(),
  entity_id       uuid references public.entities(id) on delete set null,
  invoice_number  text,
  invoice_date    date not null default current_date,
  vendor_name     text,
  status          text not null default 'Draft'
    check (status in ('Draft','Sent','Paid','Partial','Overdue','Void')),
  amount          numeric(15,2),
  paid_amount     numeric(15,2) default 0,
  due_date        date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- bills (Accounts Payable)
-- ============================================================
create table public.bills (
  id              uuid primary key default gen_random_uuid(),
  entity_id       uuid references public.entities(id) on delete set null,
  bill_number     text,
  bill_date       date not null default current_date,
  due_date        date,
  vendor_name     text,
  status          text not null default 'Open'
    check (status in ('Open','Approved','Paid','Partial','Void')),
  amount          numeric(15,2),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- receivables (Accounts Receivable)
-- ============================================================
create table public.receivables (
  id                uuid primary key default gen_random_uuid(),
  entity_id         uuid references public.entities(id) on delete set null,
  receivable_number text,
  receivable_type   text
    check (receivable_type is null or receivable_type in ('Draw Request','Invoice','Other')),
  invoice_date      date,
  due_date          date,
  status            text not null default 'Open'
    check (status in ('Open','Partial','Collected','Overdue','Write-Off')),
  amount            numeric(15,2),
  received_amount   numeric(15,2) default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ============================================================
-- bank_accounts
-- ============================================================
create table public.bank_accounts (
  id              uuid primary key default gen_random_uuid(),
  entity_id       uuid references public.entities(id) on delete set null,
  account_name    text not null,
  bank_name       text,
  account_number  text,
  routing_number  text,
  status          text not null default 'Active'
    check (status in ('Active','Inactive','Closed')),
  current_balance numeric(15,2) default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- batch_payments (Aggregate Payments)
-- ============================================================
create table public.batch_payments (
  id              uuid primary key default gen_random_uuid(),
  entity_id       uuid references public.entities(id) on delete set null,
  batch_number    text,
  payment_date    date not null default current_date,
  status          text not null default 'Pending'
    check (status in ('Pending','Approved','Processed','Void')),
  payment_count   integer default 0,
  total_amount    numeric(15,2) default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- reconciliations
-- ============================================================
create table public.reconciliations (
  id                uuid primary key default gen_random_uuid(),
  entity_id         uuid references public.entities(id) on delete set null,
  bank_account_id   uuid references public.bank_accounts(id) on delete set null,
  bank_account_name text,
  month             text,  -- YYYY-MM
  statement_balance numeric(15,2),
  book_balance      numeric(15,2),
  difference        numeric(15,2),
  status            text not null default 'In Progress'
    check (status in ('In Progress','Reconciled','Discrepancy')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ============================================================
-- period_close
-- ============================================================
create table public.period_close (
  id                             uuid primary key default gen_random_uuid(),
  entity_id                      uuid references public.entities(id) on delete set null,
  period                         text not null,  -- YYYY-MM
  status                         text not null default 'Open'
    check (status in ('Open','Closed')),
  -- 12-step checklist (each stores completion date or null)
  review_unposted_je             date,
  reconcile_bank_accounts        date,
  review_ap_aging                date,
  review_ar_aging                date,
  accrue_expenses                date,
  recognize_revenue              date,
  review_intercompany            date,
  run_trial_balance              date,
  review_variance                date,
  generate_financial_statements  date,
  management_review              date,
  lock_period                    date,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now(),
  unique (entity_id, period)
);

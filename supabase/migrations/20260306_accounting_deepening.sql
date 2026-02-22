-- 20260306_accounting_deepening.sql
-- Accounting Engine Deepening (Stream A)
-- 5 new tables, ALTER statements, 3 reporting views, denormalization triggers, RLS

-- ============================================================
-- 1A. bill_lines — AP line items
-- ============================================================
CREATE TABLE public.bill_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id         uuid NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  entity_id       uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  line_number     integer NOT NULL DEFAULT 1,
  description     text,
  account_id      uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  account_name    text,
  account_number  text,
  cost_code       text,
  job_id          uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  job_name        text,
  project_id      uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  po_id           uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  amount          numeric(15,2) NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 1B. invoice_lines — AR/invoice line items
-- ============================================================
CREATE TABLE public.invoice_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  entity_id       uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  line_number     integer NOT NULL DEFAULT 1,
  description     text,
  account_id      uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  account_name    text,
  account_number  text,
  quantity        numeric(10,2) DEFAULT 1,
  unit_price      numeric(15,2) DEFAULT 0,
  amount          numeric(15,2) NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 1C. bank_transactions — Bank feed / CSV import target
-- ============================================================
CREATE TABLE public.bank_transactions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id           uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  bank_account_id     uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  transaction_date    date NOT NULL,
  post_date           date,
  description         text,
  reference           text,
  amount              numeric(15,2) NOT NULL,
  transaction_type    text CHECK (transaction_type IN ('Debit','Credit')),
  payee               text,
  check_number        text,
  category            text,
  is_matched          boolean NOT NULL DEFAULT false,
  matched_je_line_id  uuid REFERENCES public.journal_entry_lines(id) ON DELETE SET NULL,
  reconciliation_id   uuid REFERENCES public.reconciliations(id) ON DELETE SET NULL,
  import_batch        text,
  import_source       text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 1D. payment_applications — Links payments to bills/invoices/receivables
-- ============================================================
CREATE TABLE public.payment_applications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id           uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  payment_date        date NOT NULL DEFAULT current_date,
  payment_type        text NOT NULL CHECK (payment_type IN ('AP','AR')),
  bill_id             uuid REFERENCES public.bills(id) ON DELETE SET NULL,
  invoice_id          uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  receivable_id       uuid REFERENCES public.receivables(id) ON DELETE SET NULL,
  amount              numeric(15,2) NOT NULL,
  payment_method      text CHECK (payment_method IN ('Check','Wire','ACH','EFT','Cash','Other')),
  reference_number    text,
  bank_account_id     uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  journal_entry_id    uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  batch_payment_id    uuid REFERENCES public.batch_payments(id) ON DELETE SET NULL,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 1E. fiscal_periods — Formal period master
-- ============================================================
CREATE TABLE public.fiscal_periods (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  period_name     text NOT NULL,
  period_key      text NOT NULL,
  start_date      date NOT NULL,
  end_date        date NOT NULL,
  fiscal_year     integer NOT NULL,
  period_number   integer NOT NULL,
  status          text NOT NULL DEFAULT 'Open'
    CHECK (status IN ('Open','Closing','Closed','Locked')),
  closed_by       uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  closed_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_id, period_key)
);

-- ============================================================
-- 1F. ALTER existing tables
-- ============================================================

-- bills: add approval + PO linkage columns
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS approval_level text,
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS po_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

-- invoices: add customer_name, description, project_id
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

-- journal_entry_lines: add reconciliation tracking
ALTER TABLE public.journal_entry_lines
  ADD COLUMN IF NOT EXISTS is_reconciled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reconciled_date date,
  ADD COLUMN IF NOT EXISTS reconciliation_id uuid REFERENCES public.reconciliations(id) ON DELETE SET NULL;

-- journal_entries: add reversal + source tracking
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS reversal_of_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id uuid;

-- bank_accounts: link to GL cash account
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS gl_account_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;

-- ============================================================
-- 1G. Reporting Views
-- ============================================================

-- Trial Balance: aggregate posted JE lines by account
CREATE OR REPLACE VIEW public.trial_balance_report AS
SELECT
  jel.entity_id,
  jel.account_id,
  COALESCE(jel.account_number, coa.account_number) AS account_number,
  COALESCE(jel.account_name, coa.account_name)     AS account_name,
  coa.account_type,
  coa.normal_balance,
  SUM(COALESCE(jel.debit, 0))  AS total_debits,
  SUM(COALESCE(jel.credit, 0)) AS total_credits,
  SUM(COALESCE(jel.debit, 0)) - SUM(COALESCE(jel.credit, 0)) AS net_balance
FROM public.journal_entry_lines jel
JOIN public.journal_entries je ON je.id = jel.journal_entry_id
LEFT JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
WHERE je.status = 'Posted'
GROUP BY jel.entity_id, jel.account_id, jel.account_number, jel.account_name,
         coa.account_number, coa.account_name, coa.account_type, coa.normal_balance
ORDER BY COALESCE(jel.account_number, coa.account_number);

-- Income Statement: Revenue & Expense accounts with net amounts
CREATE OR REPLACE VIEW public.income_statement_report AS
SELECT
  jel.entity_id,
  jel.account_id,
  COALESCE(jel.account_number, coa.account_number) AS account_number,
  COALESCE(jel.account_name, coa.account_name)     AS account_name,
  coa.account_type,
  je.entry_date,
  SUM(COALESCE(jel.debit, 0))  AS total_debits,
  SUM(COALESCE(jel.credit, 0)) AS total_credits,
  CASE
    WHEN coa.account_type = 'Revenue'
      THEN SUM(COALESCE(jel.credit, 0)) - SUM(COALESCE(jel.debit, 0))
    ELSE SUM(COALESCE(jel.debit, 0)) - SUM(COALESCE(jel.credit, 0))
  END AS net_amount
FROM public.journal_entry_lines jel
JOIN public.journal_entries je ON je.id = jel.journal_entry_id
LEFT JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
WHERE je.status = 'Posted'
  AND coa.account_type IN ('Revenue', 'Expense')
GROUP BY jel.entity_id, jel.account_id, jel.account_number, jel.account_name,
         coa.account_number, coa.account_name, coa.account_type, je.entry_date
ORDER BY coa.account_type DESC, COALESCE(jel.account_number, coa.account_number);

-- Balance Sheet: Asset, Liability, Equity balances
CREATE OR REPLACE VIEW public.balance_sheet_report AS
SELECT
  jel.entity_id,
  jel.account_id,
  COALESCE(jel.account_number, coa.account_number) AS account_number,
  COALESCE(jel.account_name, coa.account_name)     AS account_name,
  coa.account_type,
  CASE
    WHEN coa.account_type = 'Asset'
      THEN SUM(COALESCE(jel.debit, 0)) - SUM(COALESCE(jel.credit, 0))
    ELSE SUM(COALESCE(jel.credit, 0)) - SUM(COALESCE(jel.debit, 0))
  END AS balance
FROM public.journal_entry_lines jel
JOIN public.journal_entries je ON je.id = jel.journal_entry_id
LEFT JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
WHERE je.status = 'Posted'
  AND coa.account_type IN ('Asset', 'Liability', 'Equity')
GROUP BY jel.entity_id, jel.account_id, jel.account_number, jel.account_name,
         coa.account_number, coa.account_name, coa.account_type
ORDER BY coa.account_type, COALESCE(jel.account_number, coa.account_number);

-- ============================================================
-- 1H. Denormalization Triggers
-- ============================================================

-- Denormalize bill_line: copy account_name/number from COA, job_name from jobs, entity_id from bill
CREATE OR REPLACE FUNCTION public.denormalize_bill_line()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Copy entity_id from parent bill
  IF NEW.entity_id IS NULL THEN
    SELECT entity_id INTO NEW.entity_id
    FROM public.bills WHERE id = NEW.bill_id;
  END IF;

  -- Copy account info from COA
  IF NEW.account_id IS NOT NULL AND (NEW.account_name IS NULL OR NEW.account_number IS NULL) THEN
    SELECT account_name, account_number
    INTO NEW.account_name, NEW.account_number
    FROM public.chart_of_accounts WHERE id = NEW.account_id;
  END IF;

  -- Copy job_name from jobs
  IF NEW.job_id IS NOT NULL AND NEW.job_name IS NULL THEN
    SELECT job_name INTO NEW.job_name
    FROM public.jobs WHERE id = NEW.job_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_denormalize_bill_line
  BEFORE INSERT OR UPDATE ON public.bill_lines
  FOR EACH ROW EXECUTE FUNCTION public.denormalize_bill_line();

-- Denormalize invoice_line: copy account_name/number from COA, entity_id from invoice
CREATE OR REPLACE FUNCTION public.denormalize_invoice_line()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Copy entity_id from parent invoice
  IF NEW.entity_id IS NULL THEN
    SELECT entity_id INTO NEW.entity_id
    FROM public.invoices WHERE id = NEW.invoice_id;
  END IF;

  -- Copy account info from COA
  IF NEW.account_id IS NOT NULL AND (NEW.account_name IS NULL OR NEW.account_number IS NULL) THEN
    SELECT account_name, account_number
    INTO NEW.account_name, NEW.account_number
    FROM public.chart_of_accounts WHERE id = NEW.account_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_denormalize_invoice_line
  BEFORE INSERT OR UPDATE ON public.invoice_lines
  FOR EACH ROW EXECUTE FUNCTION public.denormalize_invoice_line();

-- Sync bill amount from bill_lines
CREATE OR REPLACE FUNCTION public.sync_bill_amount()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_bill_id uuid;
BEGIN
  v_bill_id := COALESCE(NEW.bill_id, OLD.bill_id);
  UPDATE public.bills
  SET amount = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.bill_lines
    WHERE bill_id = v_bill_id
  )
  WHERE id = v_bill_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_bill_amount
  AFTER INSERT OR UPDATE OR DELETE ON public.bill_lines
  FOR EACH ROW EXECUTE FUNCTION public.sync_bill_amount();

-- Sync invoice amount from invoice_lines
CREATE OR REPLACE FUNCTION public.sync_invoice_amount()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_invoice_id uuid;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  UPDATE public.invoices
  SET amount = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.invoice_lines
    WHERE invoice_id = v_invoice_id
  )
  WHERE id = v_invoice_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_invoice_amount
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_lines
  FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_amount();

-- ============================================================
-- 1I. RLS + updated_at triggers on all 5 new tables
-- ============================================================
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'bill_lines',
    'invoice_lines',
    'bank_transactions',
    'payment_applications',
    'fiscal_periods'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY "Authenticated users full access" ON public.%I '
      'FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      tbl
    );
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      tbl
    );
  END LOOP;
END;
$$;

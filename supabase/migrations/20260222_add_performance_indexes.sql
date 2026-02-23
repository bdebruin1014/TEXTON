-- Performance indexes for commonly queried columns
-- All use IF NOT EXISTS for idempotency

-- Entity scoping (used on nearly every query)
CREATE INDEX IF NOT EXISTS idx_projects_entity_id ON projects(entity_id);
CREATE INDEX IF NOT EXISTS idx_jobs_entity_id ON jobs(entity_id);
CREATE INDEX IF NOT EXISTS idx_lots_entity_id ON lots(entity_id);
CREATE INDEX IF NOT EXISTS idx_invoices_entity_id ON invoices(entity_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entity_id ON journal_entries(entity_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_entity_id ON purchase_orders(entity_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_entity_id ON opportunities(entity_id);

-- Status filters (used on every index page)
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_lots_status ON lots(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_dispositions_status ON dispositions(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

-- Accounting lookups
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account_id ON journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry_id ON journal_entry_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_period_id ON journal_entries(period_id);
CREATE INDEX IF NOT EXISTS idx_accounts_entity_id ON accounts(entity_id);

-- Foreign key joins (frequently used in queries)
CREATE INDEX IF NOT EXISTS idx_lots_project_id ON lots(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_project_id ON jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_lot_id ON jobs(lot_id);
CREATE INDEX IF NOT EXISTS idx_dispositions_project_id ON dispositions(project_id);
CREATE INDEX IF NOT EXISTS idx_dispositions_lot_id ON dispositions(lot_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_job_id ON budget_lines(job_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_job_id ON purchase_orders(job_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor_id ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_vendor_id ON invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_po_id ON invoices(purchase_order_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_lots_project_status ON lots(project_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_project_status ON jobs(project_id, status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entity_period ON journal_entries(entity_id, period_id);

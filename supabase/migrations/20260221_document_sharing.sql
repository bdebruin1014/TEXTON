-- ============================================================
-- DOCUMENT SHARES (External share links)
-- ============================================================

CREATE TABLE document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Share token (URL-safe, unguessable)
  share_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),

  -- What's being shared
  share_type TEXT NOT NULL CHECK (share_type IN ('folder', 'selection')),

  folder_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
  include_subfolders BOOLEAN DEFAULT true,

  -- Parent record context
  record_type TEXT NOT NULL,
  record_id UUID NOT NULL,

  -- Permissions
  allow_download BOOLEAN DEFAULT true,
  allow_upload BOOLEAN DEFAULT false,

  -- Access control
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  max_access_count INT,

  -- Recipient info
  recipient_name TEXT,
  recipient_email TEXT,
  recipient_company TEXT,
  recipient_contact_id UUID REFERENCES contacts(id),

  -- Sender context
  message TEXT,
  subject TEXT,

  -- Tracking
  access_count INT DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  total_downloads INT DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'revoked')),

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_document_shares_token ON document_shares(share_token) WHERE status = 'active';
CREATE INDEX idx_document_shares_record ON document_shares(record_type, record_id);
CREATE INDEX idx_document_shares_creator ON document_shares(created_by);

-- ============================================================
-- DOCUMENT SHARE ITEMS (for 'selection' type shares)
-- ============================================================

CREATE TABLE document_share_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL REFERENCES document_shares(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,

  -- Per-item tracking
  download_count INT DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ,

  UNIQUE(share_id, document_id)
);

CREATE INDEX idx_document_share_items_share ON document_share_items(share_id);

-- ============================================================
-- DOCUMENT SHARE ACCESS LOG
-- ============================================================

CREATE TABLE document_share_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL REFERENCES document_shares(id) ON DELETE CASCADE,

  action TEXT NOT NULL CHECK (action IN (
    'page_viewed', 'file_previewed', 'file_downloaded',
    'all_downloaded', 'file_uploaded', 'link_expired',
    'password_entered', 'password_failed'
  )),

  document_id UUID REFERENCES documents(id),

  -- Visitor info (no auth required)
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_share_access_log_share ON document_share_access_log(share_id);
CREATE INDEX idx_share_access_log_time ON document_share_access_log(created_at DESC);

-- ============================================================
-- UPLOAD REQUESTS
-- ============================================================

CREATE TABLE upload_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request token (URL-safe, unguessable)
  request_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),

  -- Parent record context
  record_type TEXT NOT NULL,
  record_id UUID NOT NULL,

  -- Where uploaded files should land
  destination_folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL,

  -- Recipient
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_company TEXT,
  recipient_contact_id UUID REFERENCES contacts(id),

  -- Request details
  subject TEXT NOT NULL,
  message TEXT,
  due_date DATE,

  -- Access control
  expires_at TIMESTAMPTZ,
  max_total_upload_size BIGINT DEFAULT 524288000,

  -- Status
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('draft', 'pending', 'partial', 'complete', 'expired', 'cancelled')),

  -- Tracking
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  access_count INT DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,

  -- Notifications
  notify_on_upload BOOLEAN DEFAULT true,
  notify_on_complete BOOLEAN DEFAULT true,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_upload_requests_token ON upload_requests(request_token) WHERE status IN ('pending', 'partial');
CREATE INDEX idx_upload_requests_record ON upload_requests(record_type, record_id);
CREATE INDEX idx_upload_requests_status ON upload_requests(status);

-- ============================================================
-- UPLOAD REQUEST ITEMS (the checklist)
-- ============================================================

CREATE TABLE upload_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES upload_requests(id) ON DELETE CASCADE,

  -- What's being requested
  name TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,

  -- Accepted file types (optional constraint)
  accepted_extensions TEXT[],
  max_file_size BIGINT,

  -- Where this specific item's upload should go
  destination_folder_id UUID REFERENCES document_folders(id),
  auto_tag TEXT,

  -- Fulfillment
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'uploaded', 'accepted', 'rejected')),
  fulfilled_document_id UUID REFERENCES documents(id),
  fulfilled_at TIMESTAMPTZ,

  -- If rejected, reason
  rejection_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_upload_request_items_request ON upload_request_items(request_id);

-- ============================================================
-- UPLOAD REQUEST ACCESS LOG
-- ============================================================

CREATE TABLE upload_request_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES upload_requests(id) ON DELETE CASCADE,

  action TEXT NOT NULL CHECK (action IN (
    'page_viewed', 'file_uploaded', 'completed',
    'link_expired', 'reminder_viewed'
  )),

  item_id UUID REFERENCES upload_request_items(id),
  document_id UUID REFERENCES documents(id),

  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_share_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_share_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_request_access_log ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage shares for records they have access to
CREATE POLICY "shares_access" ON document_shares
  FOR ALL TO authenticated USING (true);
CREATE POLICY "share_items_access" ON document_share_items
  FOR ALL TO authenticated USING (true);
CREATE POLICY "share_log_access" ON document_share_access_log
  FOR ALL TO authenticated USING (true);
CREATE POLICY "upload_requests_access" ON upload_requests
  FOR ALL TO authenticated USING (true);
CREATE POLICY "upload_request_items_access" ON upload_request_items
  FOR ALL TO authenticated USING (true);
CREATE POLICY "upload_request_log_access" ON upload_request_access_log
  FOR ALL TO authenticated USING (true);

-- ANON access for public share/upload pages (token-validated in app logic)
CREATE POLICY "shares_public_read" ON document_shares
  FOR SELECT TO anon
  USING (status = 'active' AND (expires_at IS NULL OR expires_at > now()));
CREATE POLICY "share_items_public_read" ON document_share_items
  FOR SELECT TO anon USING (true);
CREATE POLICY "share_log_public_insert" ON document_share_access_log
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "upload_requests_public_read" ON upload_requests
  FOR SELECT TO anon
  USING (status IN ('pending', 'partial') AND (expires_at IS NULL OR expires_at > now()));
CREATE POLICY "upload_request_items_public_read" ON upload_request_items
  FOR SELECT TO anon USING (true);
CREATE POLICY "upload_request_items_public_update" ON upload_request_items
  FOR UPDATE TO anon USING (true);
CREATE POLICY "upload_request_log_public_insert" ON upload_request_access_log
  FOR INSERT TO anon WITH CHECK (true);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER set_updated_at_document_shares
  BEFORE UPDATE ON document_shares FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_upload_requests
  BEFORE UPDATE ON upload_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_upload_request_items
  BEFORE UPDATE ON upload_request_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-expire shares
CREATE OR REPLACE FUNCTION expire_document_shares()
RETURNS void AS $$
  UPDATE document_shares
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < now();

  UPDATE upload_requests
  SET status = 'expired'
  WHERE status IN ('pending', 'partial')
    AND expires_at IS NOT NULL
    AND expires_at < now();
$$ LANGUAGE sql SECURITY DEFINER;

-- Auto-update upload request status when items are fulfilled
CREATE OR REPLACE FUNCTION update_upload_request_status()
RETURNS TRIGGER AS $$
DECLARE
  v_total INT;
  v_fulfilled INT;
  v_required_total INT;
  v_required_fulfilled INT;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status IN ('uploaded', 'accepted')),
    COUNT(*) FILTER (WHERE is_required = true),
    COUNT(*) FILTER (WHERE is_required = true AND status IN ('uploaded', 'accepted'))
  INTO v_total, v_fulfilled, v_required_total, v_required_fulfilled
  FROM upload_request_items
  WHERE request_id = NEW.request_id;

  IF v_required_fulfilled = v_required_total AND v_required_total > 0 THEN
    UPDATE upload_requests
    SET status = 'complete', completed_at = now()
    WHERE id = NEW.request_id AND status != 'complete';
  ELSIF v_fulfilled > 0 THEN
    UPDATE upload_requests
    SET status = 'partial'
    WHERE id = NEW.request_id AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_update_request_status
  AFTER UPDATE OF status ON upload_request_items
  FOR EACH ROW EXECUTE FUNCTION update_upload_request_status();

-- ============================================================
-- STORAGE BUCKET
-- ============================================================

-- Bucket for externally uploaded files (via upload requests)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('upload-inbox', 'upload-inbox', false, 104857600);

-- Anon can upload to inbox (token validation happens in Edge Function)
CREATE POLICY "Anon upload to inbox"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'upload-inbox');

-- Authenticated users can read inbox (to move files to proper bucket)
CREATE POLICY "Auth read inbox"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'upload-inbox');

CREATE POLICY "Auth delete inbox"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'upload-inbox');

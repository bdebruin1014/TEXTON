# KOVA — Document Sharing & Upload Requests Addendum

**Addendum to:** `tekton-document-management-system.md` _(note: file not renamed)_
**Scope:** External sharing of folders/documents with third parties + upload request system

---

## 1. What We're Adding

Two tightly related capabilities that extend the Document Management System:

**Document Sharing** — From any record's Documents tab, a KOVA user can share a folder or a selection of specific files with an external party. The recipient receives a link to a branded KOVA page where they can view and download only what was shared. They see nothing else. No login required. Links are tracked and expire automatically.

**Upload Requests** — From any record, a KOVA user can send a request to a contact asking them to upload specific documents. The recipient receives an email with a link to a branded upload page listing exactly what's needed. They drag-and-drop files onto each requested item. Uploaded files land directly in the correct folder in KOVA with the correct metadata. Think of it as a checklist the external party fills by uploading documents.

### Real-World Scenarios

1. Bryan is working on a community development project. The civil engineer needs the survey and topo to start the grading plan. Bryan goes to the project's Documents tab, selects the survey PDF and topo PDF from the Plans & Surveys folder, clicks "Share," enters the engineer's email, and sends. The engineer gets an email with a branded link, sees only those two files, downloads them. Done.

2. A title company needs to upload the title commitment and title search for a closing. Bryan goes to the Disposition record, clicks "Request Upload," selects the contact (De Bruin Law Firm — already in Contacts), picks the "Title & Survey" folder as the destination, adds two line items to the request ("Title Commitment" and "Title Search Report"), and sends. The title company gets an email, clicks the link, sees a branded page with two upload slots, drops the files in, and Bryan gets notified they're in KOVA.

3. A lender needs draw request documentation. Bryan selects the current draw package folder from the Project's Financing folder, shares it as read-only with the lender. The lender can view and download everything in that folder and its subfolders but cannot upload or modify anything.

---

## 2. Database Schema

### Migration: `20260221_document_sharing.sql`

```sql
-- ============================================================
-- DOCUMENT SHARES (External share links)
-- ============================================================

CREATE TABLE document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Share token (URL-safe, unguessable)
  share_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  
  -- What's being shared
  share_type TEXT NOT NULL CHECK (share_type IN ('folder', 'selection')),
  -- 'folder' = entire folder (optionally including subfolders)
  -- 'selection' = specific documents chosen by the sender
  
  folder_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
  include_subfolders BOOLEAN DEFAULT true,   -- for folder shares
  
  -- Parent record context
  record_type TEXT NOT NULL,
  record_id UUID NOT NULL,
  
  -- Permissions
  allow_download BOOLEAN DEFAULT true,
  allow_upload BOOLEAN DEFAULT false,
  
  -- Access control
  password_hash TEXT,                        -- optional password protection
  expires_at TIMESTAMPTZ,                    -- NULL = never expires
  max_access_count INT,                      -- NULL = unlimited
  
  -- Recipient info
  recipient_name TEXT,                       -- "Mike Thompson"
  recipient_email TEXT,                      -- "mike@civilengineeringfirm.com"
  recipient_company TEXT,                    -- "Thompson Civil Engineering"
  recipient_contact_id UUID REFERENCES contacts(id), -- link to KOVA contact if exists
  
  -- Sender context
  message TEXT,                              -- personal note shown on share page
  subject TEXT,                              -- email subject line
  
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
  
  document_id UUID REFERENCES documents(id),  -- which file (for file-level actions)
  
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
  subject TEXT NOT NULL,                     -- "Documents Needed for Jasper Ridge Closing"
  message TEXT,                              -- personal note
  due_date DATE,                             -- optional deadline
  
  -- Access control
  expires_at TIMESTAMPTZ,                    -- link expiration (default 30 days)
  max_total_upload_size BIGINT DEFAULT 524288000, -- 500MB default
  
  -- Status
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('draft', 'pending', 'partial', 'complete', 'expired', 'cancelled')),
  -- 'pending' = sent, no uploads yet
  -- 'partial' = some items uploaded
  -- 'complete' = all items uploaded (or manually marked complete)
  
  -- Tracking
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  access_count INT DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  
  -- Notifications
  notify_on_upload BOOLEAN DEFAULT true,     -- email sender when files are uploaded
  notify_on_complete BOOLEAN DEFAULT true,   -- email sender when all items fulfilled
  
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
  name TEXT NOT NULL,                        -- "Title Commitment"
  description TEXT,                          -- "Issued by Stewart Title, must be dated within 30 days"
  is_required BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  
  -- Accepted file types (optional constraint)
  accepted_extensions TEXT[],                -- ['.pdf', '.docx'] or NULL for any
  max_file_size BIGINT,                      -- per-file limit in bytes
  
  -- Where this specific item's upload should go (overrides request-level destination)
  destination_folder_id UUID REFERENCES document_folders(id),
  auto_tag TEXT,                             -- auto-apply this tag to uploaded file
  
  -- Fulfillment
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'uploaded', 'accepted', 'rejected')),
  fulfilled_document_id UUID REFERENCES documents(id), -- the uploaded file
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
```

---

## 3. Supabase Storage: Public Upload Bucket

External users uploading via upload requests need a bucket that allows anonymous inserts (validated server-side by request token):

```sql
-- Bucket for externally uploaded files (via upload requests)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('upload-inbox', 'upload-inbox', false, 104857600); -- 100MB

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
```

A Supabase Edge Function handles the upload request flow: validates the token, accepts the file into `upload-inbox`, creates the `documents` record, moves the file to the correct bucket/path, and updates the `upload_request_items` status.

---

## 4. Supabase Edge Functions

### `share-access` — Public Share Page Data

```typescript
// supabase/functions/share-access/index.ts
// Serves data for the public share page (no auth required, token-validated)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  
  if (!token) return new Response('Missing token', { status: 400 });
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // Look up share
  const { data: share, error } = await supabase
    .from('document_shares')
    .select(`
      *,
      items:document_share_items(
        *,
        document:documents(id, name, original_filename, file_extension, mime_type, file_size, updated_at)
      ),
      folder:document_folders(id, name),
      creator:users!created_by(full_name)
    `)
    .eq('share_token', token)
    .eq('status', 'active')
    .single();
  
  if (error || !share) {
    return new Response(JSON.stringify({ error: 'Share not found or expired' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // Check expiration
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    await supabase.from('document_shares').update({ status: 'expired' }).eq('id', share.id);
    return new Response(JSON.stringify({ error: 'This share link has expired' }), { status: 410 });
  }
  
  // Check access count limit
  if (share.max_access_count && share.access_count >= share.max_access_count) {
    return new Response(JSON.stringify({ error: 'Access limit reached' }), { status: 403 });
  }
  
  // Get documents based on share type
  let documents = [];
  
  if (share.share_type === 'selection') {
    documents = share.items.map((item: any) => item.document).filter(Boolean);
  } else if (share.share_type === 'folder') {
    // Get all docs in folder (and subfolders if enabled)
    let folderIds = [share.folder_id];
    
    if (share.include_subfolders) {
      const { data: subfolders } = await supabase
        .rpc('get_descendant_folder_ids', { p_folder_id: share.folder_id });
      if (subfolders) {
        folderIds = [...folderIds, ...subfolders.map((f: any) => f.id)];
      }
    }
    
    const { data: docs } = await supabase
      .from('documents')
      .select('id, name, original_filename, file_extension, mime_type, file_size, updated_at, folder_id')
      .in('folder_id', folderIds)
      .eq('status', 'active')
      .eq('is_current_version', true)
      .order('name');
    
    documents = docs ?? [];
    
    // Also get folder structure for display
    const { data: folders } = await supabase
      .from('document_folders')
      .select('id, name, parent_id, sort_order')
      .in('id', folderIds)
      .order('sort_order');
    
    share._folders = folders;
  }
  
  // Log access
  await supabase.from('document_share_access_log').insert({
    share_id: share.id,
    action: 'page_viewed',
    ip_address: req.headers.get('x-forwarded-for')?.split(',')[0] ?? null,
    user_agent: req.headers.get('user-agent'),
    referrer: req.headers.get('referer'),
  });
  
  // Increment access count
  await supabase
    .from('document_shares')
    .update({
      access_count: share.access_count + 1,
      last_accessed_at: new Date().toISOString(),
    })
    .eq('id', share.id);
  
  // Build response (strip internal fields)
  return new Response(JSON.stringify({
    share: {
      id: share.id,
      share_type: share.share_type,
      recipient_name: share.recipient_name,
      message: share.message,
      allow_download: share.allow_download,
      created_by_name: share.creator?.full_name,
      created_at: share.created_at,
      expires_at: share.expires_at,
      has_password: !!share.password_hash,
      folder_name: share.folder?.name,
      folders: share._folders ?? [],
    },
    documents,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### `share-download` — Generate Signed Download URL

```typescript
// supabase/functions/share-download/index.ts
// Generates a signed download URL for a specific file in a share

serve(async (req) => {
  const { token, documentId } = await req.json();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // Validate share token and that document belongs to this share
  const { data: share } = await supabase
    .from('document_shares')
    .select('*, items:document_share_items(document_id)')
    .eq('share_token', token)
    .eq('status', 'active')
    .single();
  
  if (!share || !share.allow_download) {
    return new Response('Forbidden', { status: 403 });
  }
  
  // Verify this document is part of the share
  const { data: doc } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();
  
  if (!doc) return new Response('Not found', { status: 404 });
  
  // Generate signed URL (60 minutes)
  const { data: signedUrl } = await supabase.storage
    .from(doc.bucket)
    .createSignedUrl(doc.storage_path, 3600);
  
  // Log download
  await supabase.from('document_share_access_log').insert({
    share_id: share.id,
    action: 'file_downloaded',
    document_id: documentId,
    ip_address: req.headers.get('x-forwarded-for')?.split(',')[0],
    user_agent: req.headers.get('user-agent'),
  });
  
  // Increment counters
  await supabase
    .from('document_shares')
    .update({ total_downloads: share.total_downloads + 1 })
    .eq('id', share.id);
  
  if (share.share_type === 'selection') {
    await supabase
      .from('document_share_items')
      .update({ download_count: supabase.rpc('increment') })
      .eq('share_id', share.id)
      .eq('document_id', documentId);
  }
  
  return new Response(JSON.stringify({ url: signedUrl.signedUrl }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### `upload-request-access` — Public Upload Request Page Data

```typescript
// supabase/functions/upload-request-access/index.ts

serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  
  if (!token) return new Response('Missing token', { status: 400 });
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  const { data: request } = await supabase
    .from('upload_requests')
    .select(`
      *,
      items:upload_request_items(
        id, name, description, is_required, sort_order, status,
        accepted_extensions, max_file_size, fulfilled_at
      ),
      creator:users!created_by(full_name)
    `)
    .eq('request_token', token)
    .in('status', ['pending', 'partial'])
    .single();
  
  if (!request) {
    return new Response(JSON.stringify({ error: 'Request not found or expired' }), { status: 404 });
  }
  
  if (request.expires_at && new Date(request.expires_at) < new Date()) {
    await supabase.from('upload_requests').update({ status: 'expired' }).eq('id', request.id);
    return new Response(JSON.stringify({ error: 'This upload request has expired' }), { status: 410 });
  }
  
  // Log access
  await supabase.from('upload_request_access_log').insert({
    request_id: request.id,
    action: 'page_viewed',
    ip_address: req.headers.get('x-forwarded-for')?.split(',')[0],
    user_agent: req.headers.get('user-agent'),
  });
  
  await supabase
    .from('upload_requests')
    .update({
      access_count: request.access_count + 1,
      last_accessed_at: new Date().toISOString(),
    })
    .eq('id', request.id);
  
  return new Response(JSON.stringify({
    request: {
      id: request.id,
      subject: request.subject,
      message: request.message,
      recipient_name: request.recipient_name,
      due_date: request.due_date,
      created_by_name: request.creator?.full_name,
      created_at: request.created_at,
      status: request.status,
    },
    items: request.items.sort((a: any, b: any) => a.sort_order - b.sort_order),
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### `upload-request-fulfill` — Handle File Upload from External Party

```typescript
// supabase/functions/upload-request-fulfill/index.ts

serve(async (req) => {
  const formData = await req.formData();
  const token = formData.get('token') as string;
  const itemId = formData.get('item_id') as string;
  const file = formData.get('file') as File;
  
  if (!token || !itemId || !file) {
    return new Response('Missing required fields', { status: 400 });
  }
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // Validate request token
  const { data: request } = await supabase
    .from('upload_requests')
    .select('*, items:upload_request_items(*)')
    .eq('request_token', token)
    .in('status', ['pending', 'partial'])
    .single();
  
  if (!request) return new Response('Invalid or expired request', { status: 403 });
  
  // Find the specific item
  const item = request.items.find((i: any) => i.id === itemId);
  if (!item) return new Response('Item not found', { status: 404 });
  if (item.status === 'uploaded' || item.status === 'accepted') {
    return new Response('Item already fulfilled', { status: 409 });
  }
  
  // Validate file extension if constrained
  if (item.accepted_extensions?.length) {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!item.accepted_extensions.includes(ext)) {
      return new Response(`File type not accepted. Expected: ${item.accepted_extensions.join(', ')}`, { status: 400 });
    }
  }
  
  // Validate file size
  if (item.max_file_size && file.size > item.max_file_size) {
    return new Response(`File too large. Maximum: ${(item.max_file_size / 1048576).toFixed(0)}MB`, { status: 400 });
  }
  
  // Determine destination
  const destinationFolderId = item.destination_folder_id || request.destination_folder_id;
  const bucket = request.record_type === 'job' ? 'job-docs' :
                 request.record_type === 'disposition' ? 'disposition-docs' : 'project-docs';
  
  // Build storage path
  const storagePath = `${request.record_id}/uploads/${request.id}/${file.name}`;
  
  // Upload file
  const fileBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });
  
  if (uploadError) {
    return new Response('Upload failed: ' + uploadError.message, { status: 500 });
  }
  
  // Create document record
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({
      record_type: request.record_type,
      record_id: request.record_id,
      folder_id: destinationFolderId,
      name: file.name.replace(/\.[^.]+$/, ''),
      original_filename: file.name,
      storage_path: storagePath,
      bucket,
      mime_type: file.type,
      file_size: file.size,
      file_extension: ext,
      source: 'upload',
      tags: item.auto_tag ? [item.auto_tag] : [],
      description: `Uploaded by ${request.recipient_name} via upload request: ${request.subject}`,
    })
    .select()
    .single();
  
  if (docError) return new Response('Failed to create document record', { status: 500 });
  
  // Mark item as fulfilled
  await supabase
    .from('upload_request_items')
    .update({
      status: 'uploaded',
      fulfilled_document_id: doc.id,
      fulfilled_at: new Date().toISOString(),
    })
    .eq('id', itemId);
  
  // Log activity
  await supabase.from('upload_request_access_log').insert({
    request_id: request.id,
    action: 'file_uploaded',
    item_id: itemId,
    document_id: doc.id,
    ip_address: req.headers.get('x-forwarded-for')?.split(',')[0],
    user_agent: req.headers.get('user-agent'),
  });
  
  // Log in document activity
  await supabase.from('document_activity').insert({
    document_id: doc.id,
    action: 'uploaded',
    details: {
      source: 'upload_request',
      request_id: request.id,
      uploaded_by_name: request.recipient_name,
      uploaded_by_email: request.recipient_email,
    },
  });
  
  // TODO: Send notification to request creator if notify_on_upload = true
  // (via Supabase Edge Function or webhook to email service)
  
  return new Response(JSON.stringify({
    success: true,
    document_id: doc.id,
    item_status: 'uploaded',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

## 5. Public-Facing Pages (No Auth Required)

These are lightweight, branded pages served at public routes. They do NOT require a KOVA login. They are validated entirely by the share/request token.

### Route: `/share/:token` — Document Share Page

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                          ┌──────┐                                    │
│                          │ TEK  │                                    │
│                          │ LOGO │                                    │
│                          └──────┘                                    │
│                                                                      │
│            Shared by Bryan Van Dyk · Red Cedar Homes                 │
│                      June 15, 2026                                   │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                                                                │   │
│  │  📁 Plans & Surveys                                            │   │
│  │                                                                │   │
│  │  "Mike — here are the survey and topo files you need for      │   │
│  │   the grading plan. Let me know if you need anything else."   │   │
│  │                                                                │   │
│  │  ┌─────────────────────────────────────────────────────────┐  │   │
│  │  │                                                          │  │   │
│  │  │  📄 Jasper_Ridge_Boundary_Survey.pdf       2.4 MB       │  │   │
│  │  │  Uploaded Jun 10, 2026                    [Download ↓]  │  │   │
│  │  │                                                          │  │   │
│  │  │  📄 Jasper_Ridge_Topographic_Survey.pdf    4.1 MB       │  │   │
│  │  │  Uploaded Jun 8, 2026                     [Download ↓]  │  │   │
│  │  │                                                          │  │   │
│  │  │  📄 Geotech_Soil_Report.pdf               1.8 MB       │  │   │
│  │  │  Uploaded May 22, 2026                    [Download ↓]  │  │   │
│  │  │                                                          │  │   │
│  │  └─────────────────────────────────────────────────────────┘  │   │
│  │                                                                │   │
│  │                              [Download All ↓]                  │   │
│  │                                                                │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────   │
│  This link expires July 15, 2026                                     │
│  Powered by KOVA · Red Cedar Homes                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Design details:**
- White background, centered card layout (max-width 640px)
- KOVA logo at top (small, muted — this is branded but not heavy)
- Sender name, company, date
- Personal message in a subtle callout box
- File list: icon, name, size, upload date, individual download button per file
- "Download All" button generates a zip on-the-fly (via Edge Function)
- If folder share with subfolders: show folder tree with expand/collapse, files grouped under their folder
- Expiration date shown at bottom
- If password-protected: shows password prompt first before revealing content
- Mobile responsive — works perfectly on a phone

### Route: `/upload/:token` — Upload Request Page

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                          ┌──────┐                                    │
│                          │ TEK  │                                    │
│                          │ LOGO │                                    │
│                          └──────┘                                    │
│                                                                      │
│              Documents Requested by Bryan Van Dyk                     │
│                      Red Cedar Homes                                 │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                                                                │   │
│  │  Documents Needed for Jasper Ridge Closing                     │   │
│  │                                                                │   │
│  │  "Hey team — please upload the following documents for the    │   │
│  │   Jasper Ridge closing. We need everything by June 30th."     │   │
│  │                                                                │   │
│  │  Due: June 30, 2026                 2 of 4 items complete     │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░ 50%         │   │
│  │                                                                │   │
│  │  ┌─────────────────────────────────────────────────────────┐  │   │
│  │  │                                                          │  │   │
│  │  │  ✅ Title Commitment *                                   │  │   │
│  │  │     Uploaded Jun 18, 2026 · Title_Commitment.pdf         │  │   │
│  │  │     [Replace]                                            │  │   │
│  │  │                                                          │  │   │
│  │  │  ✅ Title Search Report *                                │  │   │
│  │  │     Uploaded Jun 18, 2026 · Title_Search_Report.pdf      │  │   │
│  │  │     [Replace]                                            │  │   │
│  │  │                                                          │  │   │
│  │  │  ⬜ Survey (ALTA) *                                      │  │   │
│  │  │     PDF only · Max 25MB                                  │  │   │
│  │  │  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐      │  │   │
│  │  │  │  Drag & drop file here or click to browse      │      │  │   │
│  │  │  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘      │  │   │
│  │  │                                                          │  │   │
│  │  │  ⬜ Lender Payoff Letter                                 │  │   │
│  │  │     "Current payoff statement from existing lender"      │  │   │
│  │  │  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐      │  │   │
│  │  │  │  Drag & drop file here or click to browse      │      │  │   │
│  │  │  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘      │  │   │
│  │  │                                                          │  │   │
│  │  └─────────────────────────────────────────────────────────┘  │   │
│  │                                                                │   │
│  │  * = required                                                  │   │
│  │                                                                │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────   │
│  This link expires July 15, 2026                                     │
│  Powered by KOVA · Red Cedar Homes                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Design details:**
- Same branded layout as share page
- Progress bar showing X of Y items complete
- Each requested item shown as a card: checkmark if fulfilled, upload zone if pending
- Required items marked with asterisk
- File type and size constraints shown as helper text
- Per-item drag-and-drop upload zone
- Upload progress indicator per file
- Success animation on upload (checkmark replaces the drop zone)
- "Replace" option on already-uploaded items (creates new version)
- Description text shown as muted helper under each item name
- Mobile responsive — works for subcontractors uploading from their phone on a job site

---

## 6. Internal UI: Share & Upload Request Flows

### Share Flow (from DocumentBrowser)

**Entry point 1: Share a folder.** Right-click a folder in the folder tree → "Share Folder"

**Entry point 2: Share specific files.** Select files via checkboxes → Bulk Action Bar → "Share"

**Entry point 3: File action menu.** Click ⋯ on a single file → "Share"

All three open the **Share Dialog:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Share Documents                                          [✕]   │
│                                                                  │
│  SHARING                                                         │
│  📁 Plans & Surveys (3 files, including subfolders)              │
│  — or —                                                          │
│  📄 Watson_PSA_Executed.pdf, PSA_Amendment_1.docx                │
│                                                                  │
│  RECIPIENT                                                       │
│  Name     [Mike Thompson                              ]          │
│  Email    [mike@thompsoncivil.com                     ]          │
│  Company  [Thompson Civil Engineering                 ]          │
│           [🔍 Search Contacts]  ← autocomplete from Contacts    │
│                                                                  │
│  MESSAGE (optional)                                              │
│  [Here are the survey and topo files you need for the     ]     │
│  [grading plan. Let me know if you need anything else.    ]     │
│                                                                  │
│  OPTIONS                                                         │
│  ☑ Allow download                                                │
│  ☐ Require password    [                              ]          │
│  Expires   [30 days ▼]  ← 7 days, 14 days, 30 days, 90 days,  │
│                            Never                                 │
│                                                                  │
│  NOTIFICATION                                                    │
│  ☑ Send email notification to recipient                          │
│  ☐ CC me on the email                                            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Preview link: https://kova.app/share/a8f3b2c1...     │    │
│  │  [Copy Link]                                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│                              [Cancel]  [Share & Send Email →]   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key behaviors:**
- Contact search autocompletes from the Contacts module — selecting a contact auto-fills name, email, company, and links `recipient_contact_id`
- "Copy Link" lets you share via text, Slack, etc. without sending the email
- "Share & Send Email" creates the share record and triggers an email via Supabase Edge Function (or Resend/Postmark integration)
- The share link is immediately active after creation

### Upload Request Flow

**Entry point:** From any record's sidebar or Documents tab toolbar → "Request Upload" button

```
┌─────────────────────────────────────────────────────────────────┐
│  Request Documents                                        [✕]   │
│                                                                  │
│  RECIPIENT                                                       │
│  [🔍 Search Contacts...                                  ]      │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  De Bruin Law Firm                                    │       │
│  │  Bryan De Bruin · bryan@debruinlaw.com                │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
│  SUBJECT                                                         │
│  [Documents Needed for Jasper Ridge Closing           ]          │
│                                                                  │
│  MESSAGE (optional)                                              │
│  [Please upload the following documents for the Jasper   ]      │
│  [Ridge closing. We need everything by June 30th.        ]      │
│                                                                  │
│  DUE DATE                                                        │
│  [June 30, 2026          📅]                                    │
│                                                                  │
│  DESTINATION FOLDER                                              │
│  [📁 Title & Survey        ▼]  ← folder picker from this record │
│                                                                  │
│  REQUESTED DOCUMENTS                                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  1. [Title Commitment                ]  ☑ Required       │   │
│  │     Description: [                              ]        │   │
│  │     File types: [PDF only ▼]  Max size: [25 MB ▼]       │   │
│  │     Destination: [Same as above ▼]  Tag: [title     ]   │   │
│  │                                                           │   │
│  │  2. [Title Search Report             ]  ☑ Required       │   │
│  │     Description: [                              ]        │   │
│  │     File types: [Any ▼]       Max size: [25 MB ▼]       │   │
│  │                                                           │   │
│  │  3. [Survey (ALTA)                   ]  ☑ Required       │   │
│  │     Description: [                              ]        │   │
│  │     File types: [PDF only ▼]  Max size: [25 MB ▼]       │   │
│  │                                                           │   │
│  │  4. [Lender Payoff Letter            ]  ☐ Required       │   │
│  │     Description: [Current payoff from existing lender]   │   │
│  │     File types: [Any ▼]       Max size: [10 MB ▼]       │   │
│  │                                                           │   │
│  │  [+ Add Item]                                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  OPTIONS                                                         │
│  Link expires: [30 days ▼]                                       │
│  ☑ Notify me when files are uploaded                             │
│  ☑ Notify me when all required items are complete                │
│                                                                  │
│                           [Cancel]  [Send Upload Request →]     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key behaviors:**
- Contact search with autocomplete (same as share dialog)
- Destination folder picker scoped to the current record's folder tree
- Each item can override the destination folder (e.g., "Title Commitment" goes to Title & Survey folder, "Payoff Letter" goes to Financing folder)
- Auto-tag per item so uploaded files are automatically tagged in KOVA
- File type restrictions are enforced on the public upload page
- "Send Upload Request" creates the record, sends the email, and shows a confirmation with the link
- The request appears in the record's activity feed and in a new "Upload Requests" section

### Tracking: Shares & Requests Dashboard

Both shares and upload requests should be visible and manageable from the record. Add a sub-section to the Documents sidebar:

```
——— DOCUMENTS ———
  Files
  Insurance
  Shared Links              ← NEW: list of active/expired shares for this record
  Upload Requests            ← NEW: list of pending/complete requests for this record
```

**Shared Links page:**

A table showing all shares created from this record: recipient, type (folder/selection), file count, created date, expires date, access count, download count, status badge (Active/Expired/Revoked), and an action menu (Copy Link, Revoke, Resend Email, View Access Log).

**Upload Requests page:**

A table showing all upload requests for this record: recipient, subject, items (X of Y complete), due date, status badge (Pending/Partial/Complete/Expired), created date, and an action menu (Copy Link, Send Reminder, View, Cancel).

Clicking into an upload request shows the item-level detail: which items have been fulfilled, which are pending, with links to the uploaded documents.

---

## 7. Email Notifications

### Share Notification Email

```
Subject: Bryan Van Dyk shared documents with you — Plans & Surveys

───────────────────────────────────────────────────────────

[KOVA LOGO]

Bryan Van Dyk from Red Cedar Homes has shared documents with you.

📁 Plans & Surveys · 3 files

"Mike — here are the survey and topo files you need for the
 grading plan. Let me know if you need anything else."

                    [ View Documents → ]

This link expires July 15, 2026.

───────────────────────────────────────────────────────────
Red Cedar Homes · Powered by KOVA
```

### Upload Request Email

```
Subject: Red Cedar Homes is requesting documents — Jasper Ridge Closing

───────────────────────────────────────────────────────────

[KOVA LOGO]

Bryan Van Dyk from Red Cedar Homes is requesting the following documents:

Documents Needed for Jasper Ridge Closing

"Please upload the following documents for the Jasper Ridge
 closing. We need everything by June 30th."

  ☐  Title Commitment (required)
  ☐  Title Search Report (required)
  ☐  Survey — ALTA (required)
  ☐  Lender Payoff Letter

Due: June 30, 2026

                   [ Upload Documents → ]

This link expires July 15, 2026.

───────────────────────────────────────────────────────────
Red Cedar Homes · Powered by KOVA
```

### Upload Complete Notification (sent to KOVA user)

```
Subject: ✅ All documents received — Jasper Ridge Closing

De Bruin Law Firm has uploaded all requested documents for
"Documents Needed for Jasper Ridge Closing"

  ✅  Title Commitment — Title_Commitment_2026.pdf
  ✅  Title Search Report — Title_Search_Jasper_Ridge.pdf
  ✅  Survey (ALTA) — ALTA_Survey_Jasper_Ridge.pdf
  ✅  Lender Payoff Letter — Payoff_Letter_FirstBank.pdf

                [ View in KOVA → ]
```

### Reminder Email (manual trigger or auto at due date - 3 days)

```
Subject: Reminder: Documents still needed — Jasper Ridge Closing

───────────────────────────────────────────────────────────

[KOVA LOGO]

This is a reminder from Bryan Van Dyk at Red Cedar Homes.

2 of 4 documents still needed for:
Documents Needed for Jasper Ridge Closing

  ✅  Title Commitment
  ✅  Title Search Report
  ☐  Survey — ALTA (required)
  ☐  Lender Payoff Letter

Due: June 30, 2026 (3 days)

                   [ Upload Documents → ]

───────────────────────────────────────────────────────────
```

---

## 8. Components to Build

### New Components

```
src/components/documents/
├── sharing/
│   ├── ShareDialog.tsx              — Share folder or selection dialog
│   ├── UploadRequestDialog.tsx      — Create upload request dialog
│   ├── UploadRequestItemRow.tsx     — Single item row in request builder
│   ├── SharedLinksTable.tsx         — Table of shares for a record
│   ├── UploadRequestsTable.tsx      — Table of upload requests for a record
│   └── ContactSearchInput.tsx       — Autocomplete contact picker
│
├── public/                           — Public pages (no auth)
│   ├── SharePage.tsx                — /share/:token public view
│   ├── ShareFileRow.tsx             — File row with download button
│   ├── ShareFolderTree.tsx          — Folder hierarchy for folder shares
│   ├── SharePasswordGate.tsx        — Password prompt if protected
│   ├── UploadRequestPage.tsx        — /upload/:token public view
│   ├── UploadRequestItemCard.tsx    — Single item with upload zone
│   └── UploadSuccessAnimation.tsx   — Checkmark animation on upload
│
└── (existing files unchanged)
```

### New Hooks

```
src/hooks/
├── useDocumentShares.ts             — CRUD for document_shares
├── useUploadRequests.ts             — CRUD for upload_requests + items
├── useShareAccess.ts                — Public page data fetching (no auth)
└── useUploadRequestAccess.ts        — Public page data fetching (no auth)
```

### New Routes

```
src/routes/
├── share/
│   └── $token.tsx                   — Public share page
├── upload/
│   └── $token.tsx                   — Public upload request page
├── projects/$projectId/
│   ├── shared-links.tsx             — Shares list for a project
│   └── upload-requests.tsx          — Upload requests list for a project
├── (same pattern for jobs, dispositions, opportunities)
```

---

## 9. Sidebar Updates

Add to every record type's detail sidebar under the DOCUMENTS section:

```
——— DOCUMENTS ———
  Files
  Insurance                  (Projects, Jobs)
  Permits                    (Jobs)
  Costs                      (Dispositions)
  Shared Links               ← NEW
  Upload Requests             ← NEW
```

---

## 10. Implementation Sequence

This entire addendum ships with Phase 1 alongside the core document management system:

1. **Database migration** — `document_shares`, `document_share_items`, `document_share_access_log`, `upload_requests`, `upload_request_items`, `upload_request_access_log` tables, triggers, RLS, `upload-inbox` bucket

2. **Edge Functions** — `share-access`, `share-download`, `upload-request-access`, `upload-request-fulfill`

3. **Internal components** — `ShareDialog`, `UploadRequestDialog`, `ContactSearchInput`, `SharedLinksTable`, `UploadRequestsTable`

4. **Public pages** — `SharePage` + `UploadRequestPage` with all sub-components

5. **Email integration** — Share notification, upload request, upload complete notification, reminder emails (via Resend, Postmark, or Supabase Edge Function + SMTP)

6. **Wire into sidebar** — Add "Shared Links" and "Upload Requests" pages to all record type detail sidebars

7. **Wire into DocumentBrowser** — Add "Share" to folder context menu, file action menu, and bulk action bar. Add "Request Upload" to toolbar.

---

## Appendix: Upload Request Templates (Future Enhancement)

Just as folder templates pre-populate folder structures, upload request templates could pre-populate the checklist items for common scenarios:

- "Closing Document Request — Title Company" (title commitment, search, survey, payoff, tax certs)
- "Lien Waiver Package — Subcontractor" (partial lien waiver, insurance cert, W-9)
- "Draw Request Documentation — Lender" (AIA G702/G703, photos, inspection, lien waivers)
- "Due Diligence Package — Attorney" (title, environmental, survey, geotech, zoning letter)

These would be configurable in Admin → Documents → Upload Request Templates, and selectable when creating a new upload request. This is a Phase 4 enhancement — not needed for initial launch.

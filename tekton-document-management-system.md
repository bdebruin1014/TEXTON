# KOVA — Document Management System: Complete Build Specification

## Table of Contents

1. System Overview & Architecture
2. Database Schema
3. Supabase Storage Configuration
4. WebDAV Proxy Service (Edit-in-Place)
5. Admin Module: Folder Templates
6. Admin Module: Document Templates
7. Documents Tab: Module-Level UI
8. Frontend Components
9. API & Hooks
10. Security & RLS
11. Migration & Deployment Sequence

---

## 1. System Overview & Architecture

### What We're Building

A full document management system for KOVA that provides three core capabilities:

1. **Folder-based file organization** — hierarchical folders and files within every Project, Job, and Disposition record, with the ability to create, rename, move, and delete folders and files.

2. **Templated folder structures** — configurable in Admin so that when a new Project, Job, or Disposition is created, the system auto-generates a standard folder tree (e.g., every new Scattered Lot Project gets folders for "Contracts," "Due Diligence," "Permits," "Closing Documents," etc.).

3. **Edit-in-place via WebDAV** — click a Word, Excel, or PowerPoint file in KOVA and have it open directly in the desktop Office application. Save in Word/Excel and the changes appear back in KOVA automatically. This replicates the Qualia document editing experience exactly.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  KOVA FRONTEND (React)                                             │
│                                                                     │
│  Documents Tab (in Project / Job / Disposition detail view)         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Toolbar: [New Folder] [Upload] [Generate] [Search]         │   │
│  │                                                              │   │
│  │  📁 Contracts                                                │   │
│  │    📁 Purchase Agreement                                     │   │
│  │      📄 Watson_PSA_Executed.pdf           May 15, 2026      │   │
│  │      📄 PSA_Amendment_1.docx    [Edit ✏️]  Jun 2, 2026      │   │
│  │    📁 Construction Agreement                                 │   │
│  │  📁 Due Diligence                                            │   │
│  │    📄 Phase_I_Report.pdf                  Apr 20, 2026      │   │
│  │  📁 Permits                                                  │   │
│  │  📁 Closing Documents                                        │   │
│  │  📁 Insurance                                                │   │
│  │  📄 Site_Photos_Compilation.pdf           Jun 10, 2026      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  "Edit in Word" click → ms-word:ofe|u|https://dav.kova.app/...  │
└─────────────────────────────────────┬───────────────────────────────┘
                                      │
                    ┌─────────────────┼──────────────────┐
                    │                 │                   │
                    ▼                 ▼                   ▼
          ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐
          │  Supabase    │   │  WebDAV      │   │  Supabase        │
          │  REST API    │   │  Proxy       │   │  Storage         │
          │  (metadata)  │   │  (Node.js)   │   │  (file bytes)    │
          │              │   │              │   │                  │
          │  documents   │   │  Translates  │   │  Buckets:        │
          │  folders     │   │  WebDAV ←→   │   │  project-docs    │
          │  tables      │   │  Supabase    │   │  job-docs        │
          │              │   │  Storage     │   │  disposition-docs│
          └─────────────┘   └──────────────┘   └──────────────────┘
                                      │
                                      ▼
                            ┌──────────────────┐
                            │  MS Office       │
                            │  Desktop Apps    │
                            │  (Word/Excel/PPT)│
                            │                  │
                            │  Opens file via  │
                            │  WebDAV URL,     │
                            │  saves back to   │
                            │  same endpoint   │
                            └──────────────────┘
```

### Storage Strategy

All documents are stored in **Supabase Storage** as the single source of truth. The database holds metadata (folder structure, file names, tags, associations). The WebDAV proxy is a thin translation layer that lets Office desktop apps read/write files without download/reupload friction.

Storage buckets are organized by parent entity type:

- `project-docs` — files belonging to Projects and Opportunities
- `job-docs` — files belonging to Jobs in Construction Management
- `disposition-docs` — files belonging to Dispositions
- `entity-docs` — files belonging to Entities (corporate docs, OAs, insurance)
- `contact-docs` — files belonging to Contacts (W-9s, licenses, insurance certs)
- `templates` — admin-managed document templates

Within each bucket, the path follows: `{record_id}/{folder_path}/{filename}`

Example: `project-docs/prj_abc123/contracts/purchase-agreement/Watson_PSA_Executed.pdf`

---

## 2. Database Schema

### Migration: `20260220_document_management.sql`

```sql
-- ============================================================
-- FOLDER TEMPLATES (Admin-configured)
-- ============================================================

-- Template definitions — one per project type / record type combo
CREATE TABLE folder_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                          -- "Scattered Lot Project Folders"
  description TEXT,
  record_type TEXT NOT NULL                    -- 'project' | 'job' | 'disposition' | 'opportunity'
    CHECK (record_type IN ('project', 'job', 'disposition', 'opportunity')),
  project_type TEXT                            -- 'scattered_lot' | 'community_dev' | 'lot_dev' | 'lot_purchase' | NULL (all)
    CHECK (project_type IN ('scattered_lot', 'community_dev', 'lot_dev', 'lot_purchase') OR project_type IS NULL),
  is_default BOOLEAN DEFAULT false,           -- auto-applied when record is created
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Individual folders within a template (hierarchical via parent_id)
CREATE TABLE folder_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES folder_templates(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES folder_template_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                          -- "Contracts"
  sort_order INT DEFAULT 0,
  description TEXT,                            -- tooltip/help text for this folder
  auto_tag TEXT,                               -- auto-tag files uploaded to this folder
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- DOCUMENT FOLDERS (Instance-level, per record)
-- ============================================================

CREATE TABLE document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
  
  -- Polymorphic parent record
  record_type TEXT NOT NULL
    CHECK (record_type IN ('project', 'job', 'disposition', 'opportunity', 'entity', 'contact')),
  record_id UUID NOT NULL,
  
  name TEXT NOT NULL,
  slug TEXT NOT NULL,                          -- URL-safe name for storage path
  sort_order INT DEFAULT 0,
  template_item_id UUID REFERENCES folder_template_items(id), -- tracks origin
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(parent_id, record_type, record_id, slug)
);

CREATE INDEX idx_document_folders_record ON document_folders(record_type, record_id);
CREATE INDEX idx_document_folders_parent ON document_folders(parent_id);

-- ============================================================
-- DOCUMENTS (File metadata)
-- ============================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Polymorphic parent record
  record_type TEXT NOT NULL
    CHECK (record_type IN ('project', 'job', 'disposition', 'opportunity', 'entity', 'contact')),
  record_id UUID NOT NULL,
  
  folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL,
  
  -- File info
  name TEXT NOT NULL,                          -- display name (editable)
  original_filename TEXT NOT NULL,             -- as uploaded
  storage_path TEXT NOT NULL,                  -- full path in Supabase Storage bucket
  bucket TEXT NOT NULL,                        -- which storage bucket
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,                   -- bytes
  file_extension TEXT,                         -- .pdf, .docx, .xlsx, etc.
  
  -- Metadata
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  category TEXT,                               -- 'contract', 'permit', 'insurance', 'photo', etc.
  
  -- Version tracking
  version INT DEFAULT 1,
  parent_document_id UUID REFERENCES documents(id), -- previous version
  is_current_version BOOLEAN DEFAULT true,
  
  -- WebDAV edit tracking
  is_locked BOOLEAN DEFAULT false,
  locked_by UUID REFERENCES auth.users(id),
  locked_at TIMESTAMPTZ,
  lock_token TEXT,                             -- WebDAV lock token
  
  -- Source tracking
  source TEXT DEFAULT 'upload'                 -- 'upload' | 'generated' | 'template' | 'webdav' | 'email'
    CHECK (source IN ('upload', 'generated', 'template', 'webdav', 'email', 'scan')),
  generated_from_template_id UUID,             -- if generated from a doc template
  
  -- Status
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'archived', 'trash')),
  
  -- Audit
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_documents_record ON documents(record_type, record_id);
CREATE INDEX idx_documents_folder ON documents(folder_id);
CREATE INDEX idx_documents_status ON documents(status) WHERE status = 'active';
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX idx_documents_mime ON documents(mime_type);
CREATE INDEX idx_documents_name_search ON documents USING GIN(to_tsvector('english', name));

-- ============================================================
-- DOCUMENT ACTIVITY LOG
-- ============================================================

CREATE TABLE document_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  action TEXT NOT NULL                         -- 'uploaded' | 'viewed' | 'downloaded' | 'edited' |
    CHECK (action IN (                         -- 'renamed' | 'moved' | 'versioned' | 'locked' |
      'uploaded', 'viewed', 'downloaded',      -- 'unlocked' | 'archived' | 'restored' | 'deleted'
      'edited', 'renamed', 'moved',
      'versioned', 'locked', 'unlocked',
      'archived', 'restored', 'deleted',
      'shared', 'tagged'
    )),
  details JSONB DEFAULT '{}',                  -- action-specific context
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_document_activity_doc ON document_activity(document_id);
CREATE INDEX idx_document_activity_time ON document_activity(created_at DESC);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE folder_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE folder_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_activity ENABLE ROW LEVEL SECURITY;

-- Folder templates: all authenticated users can read, admins can write
CREATE POLICY "folder_templates_read" ON folder_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "folder_templates_write" ON folder_templates
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

CREATE POLICY "folder_template_items_read" ON folder_template_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "folder_template_items_write" ON folder_template_items
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

-- Document folders & documents: access based on parent record permissions
-- (In production, these would check entity-level permissions via a helper function)
CREATE POLICY "document_folders_access" ON document_folders
  FOR ALL TO authenticated USING (true);

CREATE POLICY "documents_access" ON documents
  FOR ALL TO authenticated USING (true);

CREATE POLICY "document_activity_access" ON document_activity
  FOR ALL TO authenticated USING (true);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE TRIGGER set_updated_at_folder_templates
  BEFORE UPDATE ON folder_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_folder_template_items
  BEFORE UPDATE ON folder_template_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_document_folders
  BEFORE UPDATE ON document_folders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_documents
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- FUNCTION: Apply folder template to a record
-- ============================================================

CREATE OR REPLACE FUNCTION apply_folder_template(
  p_template_id UUID,
  p_record_type TEXT,
  p_record_id UUID,
  p_created_by UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  item RECORD;
  parent_map JSONB := '{}';
  new_folder_id UUID;
BEGIN
  -- Process template items in order, root folders first (parent_id IS NULL), then children
  FOR item IN
    WITH RECURSIVE tree AS (
      SELECT id, parent_id, name, slug_name, sort_order, description, auto_tag, 0 AS depth
      FROM folder_template_items
      WHERE template_id = p_template_id AND parent_id IS NULL
      UNION ALL
      SELECT fti.id, fti.parent_id, fti.name, fti.slug_name, fti.sort_order,
             fti.description, fti.auto_tag, tree.depth + 1
      FROM folder_template_items fti
      JOIN tree ON fti.parent_id = tree.id
      WHERE fti.template_id = p_template_id
    )
    SELECT * FROM tree ORDER BY depth, sort_order
  LOOP
    new_folder_id := gen_random_uuid();
    
    INSERT INTO document_folders (
      id, parent_id, record_type, record_id, name, slug, sort_order,
      template_item_id, created_by
    ) VALUES (
      new_folder_id,
      CASE WHEN item.parent_id IS NOT NULL
        THEN (parent_map->>item.parent_id::TEXT)::UUID
        ELSE NULL
      END,
      p_record_type,
      p_record_id,
      item.name,
      lower(regexp_replace(item.name, '[^a-zA-Z0-9]+', '-', 'g')),
      item.sort_order,
      item.id,
      p_created_by
    );
    
    -- Map template item ID to new folder ID for child lookups
    parent_map := parent_map || jsonb_build_object(item.id::TEXT, new_folder_id::TEXT);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Auto-apply default template on record creation
-- ============================================================

CREATE OR REPLACE FUNCTION auto_apply_folder_template()
RETURNS TRIGGER AS $$
DECLARE
  v_template_id UUID;
  v_record_type TEXT;
  v_project_type TEXT;
BEGIN
  -- Determine record type from TG_TABLE_NAME
  CASE TG_TABLE_NAME
    WHEN 'projects' THEN
      v_record_type := 'project';
      v_project_type := NEW.type;
    WHEN 'jobs' THEN
      v_record_type := 'job';
      v_project_type := NULL;
    WHEN 'dispositions' THEN
      v_record_type := 'disposition';
      v_project_type := NULL;
    WHEN 'opportunities' THEN
      v_record_type := 'opportunity';
      v_project_type := NEW.type;
    ELSE
      RETURN NEW;
  END CASE;
  
  -- Find default template (project_type-specific first, then generic)
  SELECT id INTO v_template_id
  FROM folder_templates
  WHERE record_type = v_record_type
    AND is_default = true
    AND is_active = true
    AND (project_type = v_project_type OR project_type IS NULL)
  ORDER BY
    CASE WHEN project_type = v_project_type THEN 0 ELSE 1 END
  LIMIT 1;
  
  IF v_template_id IS NOT NULL THEN
    PERFORM apply_folder_template(v_template_id, v_record_type, NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply triggers to record tables
CREATE TRIGGER auto_folders_on_project_create
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION auto_apply_folder_template();

CREATE TRIGGER auto_folders_on_job_create
  AFTER INSERT ON jobs
  FOR EACH ROW EXECUTE FUNCTION auto_apply_folder_template();

CREATE TRIGGER auto_folders_on_disposition_create
  AFTER INSERT ON dispositions
  FOR EACH ROW EXECUTE FUNCTION auto_apply_folder_template();

CREATE TRIGGER auto_folders_on_opportunity_create
  AFTER INSERT ON opportunities
  FOR EACH ROW EXECUTE FUNCTION auto_apply_folder_template();
```

### Seed Data: Default Folder Templates

```sql
-- ============================================================
-- SEED: Default folder templates for each record/project type
-- ============================================================

-- Scattered Lot Project
INSERT INTO folder_templates (id, name, description, record_type, project_type, is_default)
VALUES ('00000000-0000-0000-0001-000000000001',
  'Scattered Lot Project Folders',
  'Standard folder structure for scattered lot build-to-sell projects',
  'project', 'scattered_lot', true);

INSERT INTO folder_template_items (template_id, parent_id, name, sort_order, auto_tag) VALUES
  ('00000000-0000-0000-0001-000000000001', NULL, 'Contracts', 1, 'contract'),
  ('00000000-0000-0000-0001-000000000001', NULL, 'Due Diligence', 2, 'due-diligence'),
  ('00000000-0000-0000-0001-000000000001', NULL, 'Permits & Approvals', 3, 'permit'),
  ('00000000-0000-0000-0001-000000000001', NULL, 'Plans & Surveys', 4, 'plans'),
  ('00000000-0000-0000-0001-000000000001', NULL, 'Insurance', 5, 'insurance'),
  ('00000000-0000-0000-0001-000000000001', NULL, 'Closing Documents', 6, 'closing'),
  ('00000000-0000-0000-0001-000000000001', NULL, 'Financing', 7, 'financing'),
  ('00000000-0000-0000-0001-000000000001', NULL, 'Photos', 8, 'photo'),
  ('00000000-0000-0000-0001-000000000001', NULL, 'Correspondence', 9, 'correspondence');

-- Community Development Project
INSERT INTO folder_templates (id, name, description, record_type, project_type, is_default)
VALUES ('00000000-0000-0000-0001-000000000002',
  'Community Development Project Folders',
  'Standard folder structure for community development projects with horizontal infrastructure',
  'project', 'community_dev', true);

-- Root folders
WITH roots AS (
  INSERT INTO folder_template_items (id, template_id, parent_id, name, sort_order, auto_tag) VALUES
    (gen_random_uuid(), '00000000-0000-0000-0001-000000000002', NULL, 'Land Acquisition', 1, 'acquisition'),
    (gen_random_uuid(), '00000000-0000-0000-0001-000000000002', NULL, 'Due Diligence', 2, 'due-diligence'),
    (gen_random_uuid(), '00000000-0000-0000-0001-000000000002', NULL, 'Entitlement', 3, 'entitlement'),
    (gen_random_uuid(), '00000000-0000-0000-0001-000000000002', NULL, 'Engineering & Design', 4, 'engineering'),
    (gen_random_uuid(), '00000000-0000-0000-0001-000000000002', NULL, 'Horizontal Development', 5, 'horizontal'),
    (gen_random_uuid(), '00000000-0000-0000-0001-000000000002', NULL, 'Permits & Approvals', 6, 'permit'),
    (gen_random_uuid(), '00000000-0000-0000-0001-000000000002', NULL, 'Financing', 7, 'financing'),
    (gen_random_uuid(), '00000000-0000-0000-0001-000000000002', NULL, 'Insurance & Bonds', 8, 'insurance'),
    (gen_random_uuid(), '00000000-0000-0000-0001-000000000002', NULL, 'Sales & Marketing', 9, 'sales'),
    (gen_random_uuid(), '00000000-0000-0000-0001-000000000002', NULL, 'Entity & Legal', 10, 'legal'),
    (gen_random_uuid(), '00000000-0000-0000-0001-000000000002', NULL, 'Investor Documents', 11, 'investor'),
    (gen_random_uuid(), '00000000-0000-0000-0001-000000000002', NULL, 'HOA', 12, 'hoa'),
    (gen_random_uuid(), '00000000-0000-0000-0001-000000000002', NULL, 'Photos', 13, 'photo'),
    (gen_random_uuid(), '00000000-0000-0000-0001-000000000002', NULL, 'Correspondence', 14, 'correspondence'),
    (gen_random_uuid(), '00000000-0000-0000-0001-000000000002', NULL, 'Closing Documents', 15, 'closing')
  RETURNING id, name
)
-- Sub-folders under key roots (example for Land Acquisition)
SELECT 1; -- Sub-folders are added via the Admin UI after initial setup

-- Job (Construction Management)
INSERT INTO folder_templates (id, name, description, record_type, project_type, is_default)
VALUES ('00000000-0000-0000-0001-000000000010',
  'Job Folders',
  'Standard folder structure for individual home builds',
  'job', NULL, true);

INSERT INTO folder_template_items (template_id, parent_id, name, sort_order, auto_tag) VALUES
  ('00000000-0000-0000-0001-000000000010', NULL, 'Contracts & Agreements', 1, 'contract'),
  ('00000000-0000-0000-0001-000000000010', NULL, 'Plans & Specifications', 2, 'plans'),
  ('00000000-0000-0000-0001-000000000010', NULL, 'Permits', 3, 'permit'),
  ('00000000-0000-0000-0001-000000000010', NULL, 'Purchase Orders', 4, 'po'),
  ('00000000-0000-0000-0001-000000000010', NULL, 'Change Orders', 5, 'change-order'),
  ('00000000-0000-0000-0001-000000000010', NULL, 'Inspections', 6, 'inspection'),
  ('00000000-0000-0000-0001-000000000010', NULL, 'Selections', 7, 'selection'),
  ('00000000-0000-0000-0001-000000000010', NULL, 'Lien Waivers', 8, 'lien-waiver'),
  ('00000000-0000-0000-0001-000000000010', NULL, 'Insurance Certificates', 9, 'insurance'),
  ('00000000-0000-0000-0001-000000000010', NULL, 'Photos', 10, 'photo'),
  ('00000000-0000-0000-0001-000000000010', NULL, 'Daily Logs', 11, 'daily-log'),
  ('00000000-0000-0000-0001-000000000010', NULL, 'Punch List', 12, 'punch'),
  ('00000000-0000-0000-0001-000000000010', NULL, 'Warranty', 13, 'warranty'),
  ('00000000-0000-0000-0001-000000000010', NULL, 'Correspondence', 14, 'correspondence');

-- Disposition
INSERT INTO folder_templates (id, name, description, record_type, project_type, is_default)
VALUES ('00000000-0000-0000-0001-000000000020',
  'Disposition Folders',
  'Standard folder structure for home/lot sales',
  'disposition', NULL, true);

INSERT INTO folder_template_items (template_id, parent_id, name, sort_order, auto_tag) VALUES
  ('00000000-0000-0000-0001-000000000020', NULL, 'Listing', 1, 'listing'),
  ('00000000-0000-0000-0001-000000000020', NULL, 'Offers', 2, 'offer'),
  ('00000000-0000-0000-0001-000000000020', NULL, 'Contract & Addenda', 3, 'contract'),
  ('00000000-0000-0000-0001-000000000020', NULL, 'Buyer Documents', 4, 'buyer'),
  ('00000000-0000-0000-0001-000000000020', NULL, 'Lender & Financing', 5, 'financing'),
  ('00000000-0000-0000-0001-000000000020', NULL, 'Title & Survey', 6, 'title'),
  ('00000000-0000-0000-0001-000000000020', NULL, 'Closing Documents', 7, 'closing'),
  ('00000000-0000-0000-0001-000000000020', NULL, 'Settlement', 8, 'settlement'),
  ('00000000-0000-0000-0001-000000000020', NULL, 'Post-Closing', 9, 'post-closing'),
  ('00000000-0000-0000-0001-000000000020', NULL, 'Photos', 10, 'photo'),
  ('00000000-0000-0000-0001-000000000020', NULL, 'Correspondence', 11, 'correspondence');

-- Opportunity
INSERT INTO folder_templates (id, name, description, record_type, project_type, is_default)
VALUES ('00000000-0000-0000-0001-000000000030',
  'Opportunity Folders',
  'Standard folder structure for pipeline opportunities',
  'opportunity', NULL, true);

INSERT INTO folder_template_items (template_id, parent_id, name, sort_order, auto_tag) VALUES
  ('00000000-0000-0000-0001-000000000030', NULL, 'Property Info', 1, 'property'),
  ('00000000-0000-0000-0001-000000000030', NULL, 'Due Diligence', 2, 'due-diligence'),
  ('00000000-0000-0000-0001-000000000030', NULL, 'Analysis', 3, 'analysis'),
  ('00000000-0000-0000-0001-000000000030', NULL, 'Offers & Contracts', 4, 'contract'),
  ('00000000-0000-0000-0001-000000000030', NULL, 'Correspondence', 5, 'correspondence');
```

---

## 3. Supabase Storage Configuration

### Bucket Setup

```sql
-- Create storage buckets (run via Supabase dashboard or migration)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('project-docs', 'project-docs', false, 104857600, NULL),    -- 100MB limit
  ('job-docs', 'job-docs', false, 104857600, NULL),
  ('disposition-docs', 'disposition-docs', false, 104857600, NULL),
  ('entity-docs', 'entity-docs', false, 52428800, NULL),       -- 50MB limit
  ('contact-docs', 'contact-docs', false, 52428800, NULL),
  ('templates', 'templates', false, 52428800, NULL);

-- Storage RLS policies
CREATE POLICY "Authenticated users can read docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('project-docs', 'job-docs', 'disposition-docs', 'entity-docs', 'contact-docs', 'templates'));

CREATE POLICY "Authenticated users can upload docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('project-docs', 'job-docs', 'disposition-docs', 'entity-docs', 'contact-docs', 'templates'));

CREATE POLICY "Authenticated users can update docs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('project-docs', 'job-docs', 'disposition-docs', 'entity-docs', 'contact-docs', 'templates'));

CREATE POLICY "Authenticated users can delete docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('project-docs', 'job-docs', 'disposition-docs', 'entity-docs', 'contact-docs', 'templates'));
```

### Bucket-to-Record Mapping

```typescript
// lib/documents/storage.ts

export const BUCKET_MAP: Record<string, string> = {
  project: 'project-docs',
  opportunity: 'project-docs',    // opportunities share project bucket
  job: 'job-docs',
  disposition: 'disposition-docs',
  entity: 'entity-docs',
  contact: 'contact-docs',
};

export function getStoragePath(
  recordType: string,
  recordId: string,
  folderPath: string | null,
  filename: string
): string {
  const parts = [recordId];
  if (folderPath) parts.push(folderPath);
  parts.push(filename);
  return parts.join('/');
}
```

---

## 4. WebDAV Proxy Service (Edit-in-Place)

### Overview

A lightweight Node.js service deployed alongside KOVA (on Vercel as a serverless function or as a small always-on service on Railway/Fly.io) that speaks WebDAV on the front end and translates to Supabase Storage API calls on the back end. This enables the "click → opens in Word → save → it's back in KOVA" experience identical to Qualia.

### How It Works

1. User clicks "Edit in Word" on a `.docx` file in KOVA
2. KOVA constructs a protocol URI: `ms-word:ofe|u|https://dav.kova.app/files/{document_id}`
3. The browser hands this URI to Microsoft Word via the `ms-word:` protocol handler
4. Word sends a WebDAV `GET` request to the proxy, which fetches the file from Supabase Storage and returns it
5. Word opens the file with a live WebDAV connection
6. When the user hits Save, Word sends a WebDAV `PUT` request to the same URL
7. The proxy writes the updated file back to Supabase Storage, creates a new version record in the `documents` table, and logs the activity

### Protocol URI Construction

```typescript
// lib/documents/webdav.ts

const WEBDAV_BASE = import.meta.env.VITE_WEBDAV_URL; // https://dav.kova.app

const OFFICE_PROTOCOLS: Record<string, string> = {
  '.docx': 'ms-word',
  '.doc':  'ms-word',
  '.xlsx': 'ms-excel',
  '.xls':  'ms-excel',
  '.pptx': 'ms-powerpoint',
  '.ppt':  'ms-powerpoint',
};

export function getEditInPlaceUrl(document: {
  id: string;
  file_extension: string;
  name: string;
}): string | null {
  const protocol = OFFICE_PROTOCOLS[document.file_extension?.toLowerCase()];
  if (!protocol) return null;
  
  const webdavUrl = `${WEBDAV_BASE}/files/${document.id}/${encodeURIComponent(document.name)}`;
  return `${protocol}:ofe|u|${webdavUrl}`;
}

export function canEditInPlace(extension: string): boolean {
  return extension?.toLowerCase() in OFFICE_PROTOCOLS;
}
```

### WebDAV Proxy Server

```typescript
// services/webdav-proxy/server.ts
// Deploy as: standalone Node.js service on Railway/Fly.io
// Or as: Vercel serverless function at /api/dav/*

import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Service role for storage access
);

// Authenticate requests via Bearer token (Supabase JWT)
async function authenticate(req: express.Request) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new Error('No auth token');
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('Invalid token');
  return user;
}

// GET /files/:documentId/:filename — Word requests the file
app.get('/files/:documentId/:filename', async (req, res) => {
  try {
    const user = await authenticate(req);
    const { documentId } = req.params;
    
    // Look up document metadata
    const { data: doc } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();
    
    if (!doc) return res.status(404).send('Not found');
    
    // Download from Supabase Storage
    const { data: fileData, error } = await supabase.storage
      .from(doc.bucket)
      .download(doc.storage_path);
    
    if (error) return res.status(500).send('Storage error');
    
    const buffer = Buffer.from(await fileData.arrayBuffer());
    
    res.setHeader('Content-Type', doc.mime_type);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `inline; filename="${doc.original_filename}"`);
    res.setHeader('Last-Modified', new Date(doc.updated_at).toUTCString());
    res.send(buffer);
    
  } catch (err) {
    res.status(401).send('Unauthorized');
  }
});

// PUT /files/:documentId/:filename — Word saves the file back
app.put('/files/:documentId/:filename', async (req, res) => {
  try {
    const user = await authenticate(req);
    const { documentId } = req.params;
    
    // Look up document metadata
    const { data: doc } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();
    
    if (!doc) return res.status(404).send('Not found');
    
    // Collect request body
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }
    const fileBuffer = Buffer.concat(chunks);
    
    // Upload new version to Supabase Storage (overwrite)
    const { error: uploadError } = await supabase.storage
      .from(doc.bucket)
      .update(doc.storage_path, fileBuffer, {
        contentType: doc.mime_type,
        upsert: true,
      });
    
    if (uploadError) return res.status(500).send('Upload failed');
    
    // Update document metadata
    await supabase
      .from('documents')
      .update({
        file_size: fileBuffer.length,
        version: doc.version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);
    
    // Log activity
    await supabase.from('document_activity').insert({
      document_id: documentId,
      action: 'edited',
      details: {
        method: 'webdav',
        previous_size: doc.file_size,
        new_size: fileBuffer.length,
        version: doc.version + 1,
      },
      performed_by: user.id,
    });
    
    res.status(204).send();
    
  } catch (err) {
    res.status(401).send('Unauthorized');
  }
});

// WebDAV OPTIONS (required for Office to discover capabilities)
app.options('/files/:documentId/:filename', (req, res) => {
  res.setHeader('Allow', 'OPTIONS, GET, PUT, LOCK, UNLOCK');
  res.setHeader('DAV', '1, 2');
  res.setHeader('MS-Author-Via', 'DAV');
  res.status(200).send();
});

// WebDAV LOCK (Office locks file during editing)
app.lock('/files/:documentId/:filename', async (req, res) => {
  try {
    const user = await authenticate(req);
    const { documentId } = req.params;
    const lockToken = `opaquelocktoken:${crypto.randomUUID()}`;
    
    await supabase
      .from('documents')
      .update({
        is_locked: true,
        locked_by: user.id,
        locked_at: new Date().toISOString(),
        lock_token: lockToken,
      })
      .eq('id', documentId);
    
    res.setHeader('Lock-Token', `<${lockToken}>`);
    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(`<?xml version="1.0" encoding="utf-8"?>
      <D:prop xmlns:D="DAV:">
        <D:lockdiscovery>
          <D:activelock>
            <D:locktype><D:write/></D:locktype>
            <D:lockscope><D:exclusive/></D:lockscope>
            <D:depth>0</D:depth>
            <D:owner><D:href>${user.email}</D:href></D:owner>
            <D:timeout>Second-3600</D:timeout>
            <D:locktoken><D:href>${lockToken}</D:href></D:locktoken>
          </D:activelock>
        </D:lockdiscovery>
      </D:prop>`);
    
  } catch (err) {
    res.status(401).send('Unauthorized');
  }
});

// WebDAV UNLOCK
app.unlock('/files/:documentId/:filename', async (req, res) => {
  try {
    const user = await authenticate(req);
    const { documentId } = req.params;
    
    await supabase
      .from('documents')
      .update({
        is_locked: false,
        locked_by: null,
        locked_at: null,
        lock_token: null,
      })
      .eq('id', documentId);
    
    res.status(204).send();
  } catch (err) {
    res.status(401).send('Unauthorized');
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`WebDAV proxy on :${PORT}`));
```

### Auth Token Passing

The challenge with WebDAV is passing auth tokens to Word. The `ms-word:` protocol handler doesn't support custom headers. The solution is **cookie-based auth** with a short-lived session:

```typescript
// When user clicks "Edit in Word", KOVA first calls this endpoint
// to create a short-lived WebDAV session cookie, then opens the protocol URI.

// services/webdav-proxy/auth-session.ts
app.post('/auth/session', async (req, res) => {
  const user = await authenticate(req);  // validates Bearer token from KOVA
  
  const sessionId = crypto.randomUUID();
  const expiry = Date.now() + 8 * 60 * 60 * 1000; // 8 hours
  
  // Store session (Redis in production, in-memory map for dev)
  sessions.set(sessionId, { userId: user.id, email: user.email, expiry });
  
  res.cookie('kova_dav_session', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 8 * 60 * 60 * 1000,
    domain: '.kova.app',
  });
  
  res.json({ ok: true });
});
```

```typescript
// Frontend: Edit in Place click handler
// components/documents/EditInPlaceButton.tsx

async function handleEditInPlace(document: Document) {
  // Step 1: Create WebDAV session
  await fetch(`${WEBDAV_BASE}/auth/session`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });
  
  // Step 2: Open protocol URI
  const editUrl = getEditInPlaceUrl(document);
  if (editUrl) {
    window.location.href = editUrl;
  }
}
```

### Deployment

The WebDAV proxy should be deployed as a small always-on service (not serverless, because WebDAV connections are long-lived):

- **Railway** or **Fly.io**: $5-7/month for a small instance
- Custom domain: `dav.kova.app` with TLS
- Environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`

---

## 5. Admin Module: Folder Templates

### Sidebar Addition

In the Admin sidebar, under the existing "Documents" section:

```
——— DOCUMENTS ———
  Custom Documents        ← existing (Qualia-style doc templates)
  Document Packages       ← existing
  Folder Templates        ← NEW
```

### Route

`/admin/documents/folder-templates` — Index page
`/admin/documents/folder-templates/:templateId` — Edit template

### Index Page: Folder Templates List

```
┌─────────────────────────────────────────────────────────────────┐
│  📁 Folder Templates                        [+ New Template]    │
│                                                                  │
│  Tabs: [All] [Projects] [Jobs] [Dispositions] [Opportunities]   │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ NAME                    │ TYPE       │ PROJ TYPE  │ DEFAULT│  │
│  │─────────────────────────│────────────│────────────│────────│  │
│  │ Scattered Lot Project   │ Project    │ Scattered  │  ✓     │  │
│  │ Community Dev Project   │ Project    │ Community  │  ✓     │  │
│  │ Lot Dev Project         │ Project    │ Lot Dev    │  ✓     │  │
│  │ Lot Purchase Project    │ Project    │ Lot Purch  │  ✓     │  │
│  │ Job Folders             │ Job        │ All        │  ✓     │  │
│  │ Disposition Folders     │ Disposition│ All        │  ✓     │  │
│  │ Opportunity Folders     │ Opportunity│ All        │  ✓     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Click any row to edit the folder structure.                     │
└─────────────────────────────────────────────────────────────────┘
```

### Detail Page: Template Editor

This is the key page — a visual tree editor where admins build folder hierarchies:

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Folder Templates                                     │
│                                                                  │
│  📁 Scattered Lot Project Folders                                │
│  Applied to: Projects → Scattered Lot                            │
│  ☑ Set as default (auto-apply on new project creation)          │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  FOLDER STRUCTURE                        [+ Add Folder]   │  │
│  │                                                            │  │
│  │  ≡ 📁 Contracts                              [+ Sub] [✕]  │  │
│  │      ≡ 📁 Purchase Agreement                  [+ Sub] [✕]  │  │
│  │      ≡ 📁 Construction Agreement              [+ Sub] [✕]  │  │
│  │      ≡ 📁 Addenda                             [+ Sub] [✕]  │  │
│  │  ≡ 📁 Due Diligence                          [+ Sub] [✕]  │  │
│  │      ≡ 📁 Title                               [+ Sub] [✕]  │  │
│  │      ≡ 📁 Environmental                       [+ Sub] [✕]  │  │
│  │      ≡ 📁 Survey                              [+ Sub] [✕]  │  │
│  │      ≡ 📁 Geotech                             [+ Sub] [✕]  │  │
│  │  ≡ 📁 Permits & Approvals                    [+ Sub] [✕]  │  │
│  │  ≡ 📁 Plans & Surveys                        [+ Sub] [✕]  │  │
│  │  ≡ 📁 Insurance                              [+ Sub] [✕]  │  │
│  │  ≡ 📁 Closing Documents                      [+ Sub] [✕]  │  │
│  │  ≡ 📁 Financing                              [+ Sub] [✕]  │  │
│  │      ≡ 📁 Loan Documents                      [+ Sub] [✕]  │  │
│  │      ≡ 📁 Draw Requests                       [+ Sub] [✕]  │  │
│  │  ≡ 📁 Photos                                 [+ Sub] [✕]  │  │
│  │  ≡ 📁 Correspondence                         [+ Sub] [✕]  │  │
│  │                                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ≡ = drag handle for reordering                                  │
│  [+ Sub] = add subfolder    [✕] = delete folder                  │
│  Inline rename: click folder name to edit                        │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  [Save Template]     [Apply to Existing Records ▼]         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  "Apply to Existing Records" dropdown:                           │
│   → Apply to all Scattered Lot projects missing these folders    │
│   → Preview affected records (12 projects)                       │
│   → Apply (adds missing folders, never deletes existing ones)    │
└─────────────────────────────────────────────────────────────────┘
```

### Key Behaviors

1. **Drag-and-drop reordering** of folders (updates `sort_order`). Use `@dnd-kit/core` or native HTML5 drag.

2. **Inline rename** — click the folder name text, it becomes an input, press Enter or blur to save.

3. **Add subfolder** — clicking `[+ Sub]` inserts a new child folder with a pre-focused editable name.

4. **Delete** — confirms with a dialog: "This will remove this folder from the template. Existing folders on records will not be affected."

5. **Save Template** — this is one of the few pages in KOVA with an explicit Save button (per the auto-save exception for workflow templates and bulk actions).

6. **Apply to Existing Records** — runs the `apply_folder_template` function against all matching records, but only adds missing folders (compares by `template_item_id` to avoid duplicates).

---

## 6. Admin Module: Document Templates

This section covers the Qualia-style **Custom Documents** feature already mentioned in the master prompt (Admin → Documents). These are reusable document templates (warranty deeds, intro letters, affidavits) that can be generated per-record with merge fields.

### Existing Admin Sidebar

```
——— DOCUMENTS ———
  Custom Documents    [97]    ← Qualia-style doc template gallery
  Document Packages   [14]    ← Bundles of templates
  Folder Templates             ← NEW (Section 5 above)
  Document Tags                ← NEW: manage tag taxonomy
```

This section is already defined in the master prompt. No additional specification needed — it follows the Qualia Custom Documents pattern exactly as shown in the Admin screenshot.

---

## 7. Documents Tab: Module-Level UI

### Where It Appears

The Documents tab appears in the detail sidebar of every major record type. From the master prompt:

- **Projects**: under `——— DOCUMENTS ———` section → "Files" and "Insurance"
- **Jobs (CM)**: under `——— DOCUMENTS ———` section → "Files," "Insurance," "Permits"
- **Dispositions**: under `——— DOCUMENTS ———` section → "Files" and "Costs"
- **Opportunities**: under `——— ACTIONS ———` section → "Documents"

### Files Page — The Main Document Browser

Route: `/projects/:projectId/files` (and equivalent for jobs, dispositions, opportunities)

This is the primary document browsing interface. It shows a folder tree on the left and file list on the right, similar to Qualia's Documents page but with the addition of folder navigation.

```
┌─────────────────────────────────────────────────────────────────────┐
│  📁 Documents                                                        │
│                                                                      │
│  Breadcrumb: All Documents > Contracts > Purchase Agreement          │
│                                                                      │
│  Toolbar: [+ New Folder]  [↑ Upload]  [📄 Generate]  [🔍 Search]    │
│                                                                      │
│  ┌──────────────────┬────────────────────────────────────────────┐   │
│  │  FOLDERS          │  FILES IN: Purchase Agreement              │   │
│  │                   │                                            │   │
│  │  📁 All Documents │  NAME ▲             TYPE    MODIFIED   ⋯  │   │
│  │                   │  ─────────────────  ─────   ──────────    │   │
│  │  📁 Contracts  ▼  │  📄 Watson_PSA      PDF    May 15, 2026  │   │
│  │    📁 Purchase ●  │    _Executed.pdf                          │   │
│  │    📁 Construc.   │  📄 PSA_Amend_1     DOCX   Jun 2, 2026   │   │
│  │    📁 Addenda     │    .docx        [Edit in Word ✏️]         │   │
│  │  📁 Due Diligence │  📄 Title_Commit    PDF    Apr 22, 2026  │   │
│  │  📁 Permits       │    ment.pdf                               │   │
│  │  📁 Plans         │                                            │   │
│  │  📁 Insurance     │                                            │   │
│  │  📁 Closing Docs  │  ─────────────────────────────────────    │   │
│  │  📁 Financing     │  Drop files here to upload                │   │
│  │  📁 Photos        │                                            │   │
│  │  📁 Correspondence│                                            │   │
│  │                   │                                            │   │
│  │  [+ New Folder]   │                                            │   │
│  └──────────────────┴────────────────────────────────────────────┘   │
│                                                                      │
│  Footer: 47 documents · 128.4 MB total                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Design Details

**Left Panel — Folder Tree:**
- White background, 240px wide (matches sidebar width)
- Collapsible/expandable folder hierarchy with disclosure triangles
- Active folder highlighted with green left border (#1B3022) — consistent with sidebar pattern
- "All Documents" at top shows all files across all folders (flat view)
- `[+ New Folder]` button at bottom of tree — creates a root-level folder
- Right-click context menu: Rename, Move, Delete, Add Subfolder
- Drag folders to reorder or reparent

**Right Panel — File List:**
- Breadcrumb trail at top showing current path
- Sortable columns: Name, Type (icon + extension), Modified date, Size, Tags
- Each row shows: file type icon (PDF red, DOCX blue, XLSX green, image thumbnail), file name (clickable to preview/download), type badge, modified date, size, action menu (⋯)
- **"Edit in Word/Excel" button** appears inline for `.docx`, `.xlsx`, `.pptx` files — this triggers the WebDAV protocol URI
- Drag-and-drop upload zone: files dropped onto the right panel upload to the current folder
- Drag files between folders in the left panel to move them
- Multi-select with checkboxes for bulk actions (move, delete, download as zip, tag)

**File Row Actions (⋯ menu):**
1. Preview (opens in-app viewer for PDFs/images, or downloads for other types)
2. Download
3. Edit in Word/Excel (only for Office formats — triggers WebDAV)
4. Rename
5. Move to Folder → (subfolder picker)
6. Tags → (tag editor popover)
7. Version History → (shows previous versions)
8. Copy Link (shareable URL)
9. Archive
10. Delete

**Upload:**
- Click `[↑ Upload]` or drag-and-drop onto the file list area
- Multi-file upload supported
- Progress bar per file
- Files are uploaded to Supabase Storage and metadata is created in the `documents` table
- Auto-tag based on folder's `auto_tag` setting from the template
- Duplicate filename detection: append `(1)`, `(2)`, etc.

**Generate:**
- Click `[📄 Generate]` to create a document from an Admin document template
- Opens a modal with template gallery (same as Qualia's "Create Document" interface)
- Selected template generates with merge fields filled from the current record
- Generated file is saved to the current folder with `source: 'generated'`

**Search:**
- Full-text search across document names, tags, and file content (if indexed)
- Filters: file type, date range, uploaded by, tags
- Results shown in the right panel as a flat list with folder path shown

### File Preview

When clicking a file name:
- **PDF**: Opens in-app PDF viewer (react-pdf or iframe)
- **Images**: Opens in lightbox with zoom/pan
- **Office files**: Shows a preview card with metadata + "Edit in Word" button + "Download" button
- **Other**: Direct download

### Folder Context Menu

Right-clicking a folder in the tree shows:
1. Open
2. New Subfolder
3. Rename
4. Move to...
5. Apply Template (only at root level — lets user apply a folder template to add missing folders)
6. Delete (confirms: "Delete folder and move X files to parent folder?" or "Delete folder and all contents?")

---

## 8. Frontend Components

### Component Tree

```
src/components/documents/
├── DocumentBrowser.tsx          — Main container (folder tree + file list)
├── FolderTree.tsx               — Left panel folder hierarchy
├── FolderTreeItem.tsx           — Individual folder row (expandable, draggable)
├── FileList.tsx                 — Right panel file table
├── FileRow.tsx                  — Individual file row
├── FileUploadZone.tsx           — Drag-and-drop upload area
├── FilePreviewModal.tsx         — In-app file preview (PDF, image, Office info)
├── EditInPlaceButton.tsx        — "Edit in Word" button with WebDAV session
├── NewFolderDialog.tsx          — Inline folder creation
├── MoveToFolderDialog.tsx       — Folder picker for moving files
├── FileActionMenu.tsx           — Row-level action dropdown
├── BulkActionBar.tsx            — Appears when files are multi-selected
├── DocumentSearch.tsx           — Search bar with filters
├── VersionHistoryPanel.tsx      — Side panel showing version history
├── TagEditor.tsx                — Popover for editing file tags
├── GenerateDocumentModal.tsx    — Template picker for document generation
└── admin/
    ├── FolderTemplateList.tsx   — Admin index page
    ├── FolderTemplateEditor.tsx — Admin detail page (tree editor)
    ├── TemplateTreeItem.tsx     — Draggable folder in template editor
    └── ApplyTemplateDialog.tsx  — "Apply to existing records" confirmation
```

### Key Component: DocumentBrowser

```typescript
// components/documents/DocumentBrowser.tsx

import { useState } from 'react';
import { FolderTree } from './FolderTree';
import { FileList } from './FileList';
import { FileUploadZone } from './FileUploadZone';
import { DocumentSearch } from './DocumentSearch';
import { useDocumentFolders } from '@/hooks/useDocumentFolders';
import { useDocuments } from '@/hooks/useDocuments';

interface DocumentBrowserProps {
  recordType: 'project' | 'job' | 'disposition' | 'opportunity' | 'entity' | 'contact';
  recordId: string;
}

export function DocumentBrowser({ recordType, recordId }: DocumentBrowserProps) {
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null); // null = "All Documents"
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  const { data: folders, isLoading: foldersLoading } = useDocumentFolders(recordType, recordId);
  const { data: documents, isLoading: docsLoading } = useDocuments(recordType, recordId, activeFolderId);

  const activeFolderPath = buildBreadcrumb(folders, activeFolderId);

  return (
    <div className="flex h-full">
      {/* Left: Folder Tree */}
      <div className="w-60 border-r border-border bg-white overflow-y-auto flex-shrink-0">
        <FolderTree
          folders={folders ?? []}
          activeFolderId={activeFolderId}
          onFolderSelect={setActiveFolderId}
          recordType={recordType}
          recordId={recordId}
        />
      </div>

      {/* Right: File List */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-white">
          <Breadcrumb path={activeFolderPath} onNavigate={setActiveFolderId} />
          <div className="flex-1" />
          <DocumentSearch value={searchQuery} onChange={setSearchQuery} />
          <NewFolderButton parentId={activeFolderId} recordType={recordType} recordId={recordId} />
          <UploadButton folderId={activeFolderId} recordType={recordType} recordId={recordId} />
          <GenerateButton folderId={activeFolderId} recordType={recordType} recordId={recordId} />
        </div>

        {/* Bulk action bar */}
        {selectedFileIds.size > 0 && (
          <BulkActionBar
            selectedCount={selectedFileIds.size}
            onMove={() => {}}
            onDelete={() => {}}
            onTag={() => {}}
            onDownload={() => {}}
            onClear={() => setSelectedFileIds(new Set())}
          />
        )}

        {/* File list with drop zone */}
        <FileUploadZone
          folderId={activeFolderId}
          recordType={recordType}
          recordId={recordId}
          className="flex-1 overflow-y-auto"
        >
          <FileList
            documents={documents ?? []}
            isLoading={docsLoading}
            selectedIds={selectedFileIds}
            onSelectionChange={setSelectedFileIds}
            searchQuery={searchQuery}
          />
        </FileUploadZone>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border bg-white text-sm text-muted-foreground">
          {documents?.length ?? 0} documents · {formatBytes(totalSize(documents))} total
        </div>
      </div>
    </div>
  );
}
```

### Key Component: EditInPlaceButton

```typescript
// components/documents/EditInPlaceButton.tsx

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { canEditInPlace, getEditInPlaceUrl } from '@/lib/documents/webdav';
import { useAuth } from '@/hooks/useAuth';

interface EditInPlaceButtonProps {
  document: {
    id: string;
    name: string;
    file_extension: string;
    is_locked: boolean;
    locked_by: string | null;
  };
}

export function EditInPlaceButton({ document }: EditInPlaceButtonProps) {
  const { session } = useAuth();

  if (!canEditInPlace(document.file_extension)) return null;

  const appName = {
    '.docx': 'Word', '.doc': 'Word',
    '.xlsx': 'Excel', '.xls': 'Excel',
    '.pptx': 'PowerPoint', '.ppt': 'PowerPoint',
  }[document.file_extension.toLowerCase()] ?? 'Office';

  async function handleClick() {
    // Create WebDAV session
    const WEBDAV_BASE = import.meta.env.VITE_WEBDAV_URL;
    await fetch(`${WEBDAV_BASE}/auth/session`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });

    // Open in desktop app
    const editUrl = getEditInPlaceUrl(document);
    if (editUrl) {
      window.location.href = editUrl;
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={document.is_locked && document.locked_by !== session?.user?.id}
      className="text-primary hover:text-primary hover:bg-accent gap-1.5"
    >
      <Pencil className="h-3.5 w-3.5" />
      Edit in {appName}
    </Button>
  );
}
```

---

## 9. API & Hooks

### Hooks

```typescript
// hooks/useDocumentFolders.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useDocumentFolders(recordType: string, recordId: string) {
  return useQuery({
    queryKey: ['document-folders', recordType, recordId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_folders')
        .select('*')
        .eq('record_type', recordType)
        .eq('record_id', recordId)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (folder: {
      name: string;
      parent_id: string | null;
      record_type: string;
      record_id: string;
    }) => {
      const slug = folder.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const { data, error } = await supabase
        .from('document_folders')
        .insert({ ...folder, slug })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({
        queryKey: ['document-folders', data.record_type, data.record_id],
      });
    },
  });
}

export function useRenameFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const { error } = await supabase
        .from('document_folders')
        .update({ name, slug })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document-folders'] });
    },
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Move child documents to parent folder (or root)
      const { data: folder } = await supabase
        .from('document_folders')
        .select('parent_id')
        .eq('id', id)
        .single();
      
      await supabase
        .from('documents')
        .update({ folder_id: folder?.parent_id ?? null })
        .eq('folder_id', id);
      
      const { error } = await supabase
        .from('document_folders')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document-folders'] });
      qc.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
```

```typescript
// hooks/useDocuments.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { BUCKET_MAP, getStoragePath } from '@/lib/documents/storage';

export function useDocuments(
  recordType: string,
  recordId: string,
  folderId: string | null
) {
  return useQuery({
    queryKey: ['documents', recordType, recordId, folderId],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select('*, uploaded_by_user:users!uploaded_by(full_name)')
        .eq('record_type', recordType)
        .eq('record_id', recordId)
        .eq('status', 'active')
        .eq('is_current_version', true)
        .order('created_at', { ascending: false });
      
      if (folderId) {
        query = query.eq('folder_id', folderId);
      }
      // folderId === null means "All Documents" — no folder filter
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      recordType,
      recordId,
      folderId,
      folderPath,
    }: {
      file: File;
      recordType: string;
      recordId: string;
      folderId: string | null;
      folderPath: string | null;
    }) => {
      const bucket = BUCKET_MAP[recordType];
      const storagePath = getStoragePath(recordType, recordId, folderPath, file.name);
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, file, { upsert: false });
      if (uploadError) throw uploadError;
      
      // Get file extension
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      
      // Create metadata record
      const { data, error } = await supabase
        .from('documents')
        .insert({
          record_type: recordType,
          record_id: recordId,
          folder_id: folderId,
          name: file.name.replace(/\.[^.]+$/, ''), // name without extension
          original_filename: file.name,
          storage_path: storagePath,
          bucket,
          mime_type: file.type,
          file_size: file.size,
          file_extension: ext,
          source: 'upload',
        })
        .select()
        .single();
      if (error) throw error;
      
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({
        queryKey: ['documents', data.record_type, data.record_id],
      });
    },
  });
}

export function useDownloadDocument() {
  return useMutation({
    mutationFn: async (document: { bucket: string; storage_path: string; original_filename: string }) => {
      const { data, error } = await supabase.storage
        .from(document.bucket)
        .download(document.storage_path);
      if (error) throw error;
      
      // Trigger browser download
      const url = URL.createObjectURL(data);
      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: document.original_filename,
      });
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

export function useMoveDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ documentId, folderId }: { documentId: string; folderId: string | null }) => {
      const { error } = await supabase
        .from('documents')
        .update({ folder_id: folderId })
        .eq('id', documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
```

### Folder Template Admin Hooks

```typescript
// hooks/useFolderTemplates.ts

export function useFolderTemplates(recordType?: string) {
  return useQuery({
    queryKey: ['folder-templates', recordType],
    queryFn: async () => {
      let query = supabase
        .from('folder_templates')
        .select('*, items:folder_template_items(*)')
        .eq('is_active', true)
        .order('name');
      
      if (recordType) {
        query = query.eq('record_type', recordType);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useFolderTemplate(templateId: string) {
  return useQuery({
    queryKey: ['folder-template', templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('folder_templates')
        .select('*, items:folder_template_items(*)')
        .eq('id', templateId)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveFolderTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      template,
      items,
    }: {
      template: Partial<FolderTemplate>;
      items: FolderTemplateItem[];
    }) => {
      // Upsert template
      const { data: savedTemplate, error: templateError } = await supabase
        .from('folder_templates')
        .upsert(template)
        .select()
        .single();
      if (templateError) throw templateError;
      
      // Delete existing items and re-insert (simpler than diffing)
      await supabase
        .from('folder_template_items')
        .delete()
        .eq('template_id', savedTemplate.id);
      
      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('folder_template_items')
          .insert(items.map(item => ({
            ...item,
            template_id: savedTemplate.id,
          })));
        if (itemsError) throw itemsError;
      }
      
      return savedTemplate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folder-templates'] });
      qc.invalidateQueries({ queryKey: ['folder-template'] });
    },
  });
}

export function useApplyTemplateToExisting() {
  return useMutation({
    mutationFn: async ({
      templateId,
      recordType,
      projectType,
    }: {
      templateId: string;
      recordType: string;
      projectType?: string;
    }) => {
      // Find all matching records that don't already have folders from this template
      const tableName = recordType === 'opportunity' ? 'opportunities' :
                        recordType === 'job' ? 'jobs' :
                        recordType === 'disposition' ? 'dispositions' : 'projects';
      
      let query = supabase.from(tableName).select('id');
      if (projectType) {
        query = query.eq('type', projectType);
      }
      
      const { data: records } = await query;
      if (!records) return { applied: 0 };
      
      let applied = 0;
      for (const record of records) {
        // Check if template already applied
        const { count } = await supabase
          .from('document_folders')
          .select('id', { count: 'exact', head: true })
          .eq('record_type', recordType)
          .eq('record_id', record.id)
          .not('template_item_id', 'is', null);
        
        if ((count ?? 0) === 0) {
          await supabase.rpc('apply_folder_template', {
            p_template_id: templateId,
            p_record_type: recordType,
            p_record_id: record.id,
          });
          applied++;
        }
      }
      
      return { applied };
    },
  });
}
```

---

## 10. Security & RLS

### Storage Security

All Supabase Storage buckets are **private** (not public). Files are accessed via signed URLs:

```typescript
// Generate a time-limited download URL
export async function getSignedUrl(bucket: string, path: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
```

### WebDAV Security

1. All WebDAV requests require authentication (cookie-based session)
2. Sessions expire after 8 hours
3. File locks prevent concurrent editing conflicts
4. The WebDAV proxy validates that the requesting user has access to the parent record before serving any file
5. All WebDAV activity is logged in `document_activity`

### RLS Enhancement (Future)

In production, the simple `USING (true)` policies should be replaced with entity-scoped access:

```sql
-- Example: documents accessible only if user has access to the parent entity
CREATE POLICY "documents_entity_access" ON documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN entity_access ea ON ea.entity_id = p.entity_id
      WHERE p.id = documents.record_id
        AND documents.record_type = 'project'
        AND ea.user_id = auth.uid()
    )
    -- Similar joins for other record types
  );
```

---

## 11. Migration & Deployment Sequence

### Phase 1: Foundation (Ship with Projects MVP)

1. Run database migration (`20260220_document_management.sql`)
2. Create Supabase Storage buckets
3. Build `DocumentBrowser` component with folder tree + file list
4. Build upload/download/rename/move/delete functionality
5. Build `useDocumentFolders` and `useDocuments` hooks
6. Wire into Projects detail view under "Files" sidebar item
7. Seed default folder templates
8. Build Admin → Folder Templates list and editor pages

### Phase 2: Full Integration (Ship with CM + Disposition)

1. Wire `DocumentBrowser` into Jobs and Dispositions detail views
2. Add auto-apply folder template triggers for all record types
3. Build "Apply to Existing Records" admin feature
4. Add document search (full-text across names and tags)
5. Build file preview modal (PDF viewer, image lightbox)
6. Build "Generate Document" from template feature
7. Add version history panel

### Phase 3: Edit-in-Place (Ship with Integrations)

1. Build and deploy WebDAV proxy service
2. Implement cookie-based auth session flow
3. Build `EditInPlaceButton` component
4. Add file locking UI (show lock status, locked-by user)
5. Test with Word, Excel, and PowerPoint on Windows and Mac
6. Deploy proxy to Railway/Fly.io with custom domain `dav.kova.app`

### Phase 4: Polish

1. Drag-and-drop file reordering within folders
2. Drag files between folders
3. Bulk operations (multi-select → move, tag, delete, download as zip)
4. Document tags taxonomy management in Admin
5. Activity log integration with Right Panel activity feed
6. Storage usage dashboard in Admin
7. Automated folder creation on Convert to Project action

---

## Appendix A: File Type Icons

```typescript
// lib/documents/icons.ts

export const FILE_ICONS: Record<string, { icon: string; color: string }> = {
  '.pdf':  { icon: 'FileText',    color: '#EF4444' },  // red
  '.docx': { icon: 'FileText',    color: '#3B82F6' },  // blue
  '.doc':  { icon: 'FileText',    color: '#3B82F6' },
  '.xlsx': { icon: 'FileSpreadsheet', color: '#10B981' }, // green
  '.xls':  { icon: 'FileSpreadsheet', color: '#10B981' },
  '.pptx': { icon: 'Presentation', color: '#F59E0B' },  // orange
  '.ppt':  { icon: 'Presentation', color: '#F59E0B' },
  '.png':  { icon: 'Image',       color: '#8B5CF6' },  // purple
  '.jpg':  { icon: 'Image',       color: '#8B5CF6' },
  '.jpeg': { icon: 'Image',       color: '#8B5CF6' },
  '.gif':  { icon: 'Image',       color: '#8B5CF6' },
  '.svg':  { icon: 'Image',       color: '#8B5CF6' },
  '.zip':  { icon: 'Archive',     color: '#6B7280' },  // gray
  '.txt':  { icon: 'File',        color: '#6B7280' },
  '.csv':  { icon: 'FileSpreadsheet', color: '#6B7280' },
};
```

## Appendix B: Default Folder Structures Reference

### Scattered Lot Project
```
📁 Contracts
  📁 Purchase Agreement
  📁 Construction Agreement
  📁 Addenda
📁 Due Diligence
  📁 Title
  📁 Environmental
  📁 Survey
  📁 Geotech
📁 Permits & Approvals
📁 Plans & Surveys
📁 Insurance
📁 Closing Documents
📁 Financing
  📁 Loan Documents
  📁 Draw Requests
📁 Photos
📁 Correspondence
```

### Community Development Project
```
📁 Land Acquisition
  📁 Parcel 1 — [Seller Name]
  📁 Parcel 2 — [Seller Name]
📁 Due Diligence
  📁 Title
  📁 Environmental (Phase I / Phase II)
  📁 Survey & ALTA
  📁 Geotech & Soil
  📁 Wetlands
  📁 Flood Study
  📁 Traffic Impact
  📁 Utility Letters
📁 Entitlement
  📁 Zoning
  📁 Preliminary Plat
  📁 Final Plat
  📁 Variance / CUP
📁 Engineering & Design
  📁 Construction Drawings
  📁 Grading Plans
  📁 Stormwater
  📁 Utility Plans
  📁 Road Design
📁 Horizontal Development
  📁 Bid Packages
  📁 Contracts
  📁 Pay Applications
  📁 Inspections
📁 Permits & Approvals
  📁 Land Disturbance
  📁 NPDES
  📁 Erosion Control
  📁 Utility Permits
📁 Financing
  📁 A&D Loan
  📁 Draw Requests
  📁 Payoff Letters
📁 Insurance & Bonds
  📁 Builders Risk
  📁 GL / Umbrella
  📁 Performance Bond
  📁 Payment Bond
📁 Sales & Marketing
  📁 Brochures & Collateral
  📁 Pricing Sheets
  📁 Model Home
📁 Entity & Legal
  📁 Operating Agreement
  📁 Formation Documents
  📁 EIN / Tax
📁 Investor Documents
  📁 PPM / Subscription
  📁 Capital Call Notices
  📁 Distribution Notices
  📁 K-1s
  📁 Quarterly Reports
📁 HOA
  📁 CCRs
  📁 Bylaws
  📁 Design Guidelines
📁 Photos
  📁 Pre-Development
  📁 Construction Progress
  📁 Completed
📁 Correspondence
📁 Closing Documents
```

### Job (Construction Management)
```
📁 Contracts & Agreements
  📁 Construction Agreement
  📁 Subcontracts
📁 Plans & Specifications
  📁 Architectural
  📁 Structural
  📁 MEP
  📁 Selections Sheet
📁 Permits
📁 Purchase Orders
📁 Change Orders
📁 Inspections
📁 Selections
📁 Lien Waivers
  📁 Partial
  📁 Final
📁 Insurance Certificates
📁 Photos
  📁 Foundation
  📁 Framing
  📁 Rough-In
  📁 Drywall
  📁 Finishes
  📁 Final
📁 Daily Logs
📁 Punch List
📁 Warranty
📁 Correspondence
```

### Disposition (Sale)
```
📁 Listing
  📁 MLS Listing
  📁 Marketing Materials
  📁 Photos
📁 Offers
📁 Contract & Addenda
📁 Buyer Documents
  📁 Pre-Approval
  📁 Application
📁 Lender & Financing
  📁 Appraisal
  📁 Commitment Letter
📁 Title & Survey
  📁 Title Search
  📁 Title Commitment
  📁 Survey
📁 Closing Documents
  📁 Closing Disclosure
  📁 Deed
  📁 Settlement Statement
📁 Settlement
  📁 Wire Confirmation
📁 Post-Closing
  📁 Warranty Registration
  📁 Walk Inspections
📁 Correspondence
```

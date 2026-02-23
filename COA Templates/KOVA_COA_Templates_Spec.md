# KOVA Chart of Accounts Templates — Admin Module Specification

**Module:** Admin > COA Templates  
**Integration:** Entity Creation Workflow  
**Repository:** https://github.com/bdebruin1014/KOVA  
**Template Source:** `/COA Templates/` directory in repository  
**Date:** February 2026

---

## 1. Overview

This specification defines the implementation of templated Charts of Accounts (COA) in KOVA's Admin module, with integration into the Entity creation workflow. The system allows administrators to manage COA templates and automatically provision a complete chart of accounts when creating new entities.

### 1.1 Template Types

Six COA templates exist in the repository at `/COA Templates/`:

| Template | Filename | Use Case |
|----------|----------|----------|
| Operating Homebuilder | `KOVA_COA_Template_Operating_Homebuilder.xlsx` | Red Cedar Homes, Red Cedar Construction — active construction companies with employees, job costing, payroll |
| Holding Company | `KOVA_COA_Template_Holding_Company.xlsx` | VanRock Holdings, Olive Brynn — passive investment holding companies receiving distributions |
| Investment Fund | `KOVA_COA_Template_Investment_Fund.xlsx` | SL Fund II — capital-raising vehicles deploying into SPEs |
| SPE Development | `KOVA_COA_Template_SPE_Development.xlsx` | Per-project entities for for-sale residential development |
| SPE Rental | `KOVA_COA_Template_SPE_Rental.xlsx` | Per-project entities owning income-producing rental property |
| Property Management | `KOVA_COA_Template_Property_Management.xlsx` | Operating PM companies managing properties for owners |

### 1.2 Account Numbering Convention

All templates use `XXXX.YY` format:
- **1000s** — Assets
- **2000s** — Liabilities
- **3000s** — Equity
- **4000s** — Revenue
- **5000s** — COGS / Direct Costs
- **6000s** — Indirect Costs / Operating Expenses
- **7000s** — G&A (Operating Company only) or Other Income/Expense
- **8000s** — Other Income/Expense
- **9000s** — Extraordinary Items

### 1.3 Template Variables

Templates contain placeholder variables that are replaced during entity provisioning:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{ABBR}}` | Entity abbreviation (2-5 chars) | `RCH`, `VRH`, `OSLO` |
| `{{MEMBER_1_NAME}}` | Primary member/owner name | `Bryan de Bruin` |
| `{{MEMBER_2_NAME}}` | Secondary member/owner name | `SL Fund II` |
| `{{BUILDER_NAME}}` | Builder entity name (SPE only) | `Red Cedar Homes LLC` |

---

## 2. Database Schema

### 2.1 New Tables

```sql
-- COA Template definitions (admin-managed)
CREATE TABLE coa_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                           -- "Operating Homebuilder"
  slug TEXT NOT NULL UNIQUE,                    -- "operating-homebuilder"
  description TEXT,                             -- "For active construction companies..."
  entity_type TEXT NOT NULL,                    -- "operating_company" | "holding_company" | "fund" | "spe_development" | "spe_rental" | "property_management"
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,             -- Default template for this entity_type
  account_count INTEGER,                        -- Cached count
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- COA Template accounts (the actual chart structure)
CREATE TABLE coa_template_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES coa_templates(id) ON DELETE CASCADE,
  account_number TEXT NOT NULL,                 -- "1100.01"
  account_name TEXT NOT NULL,                   -- "{{ABBR}} — Operating Checking"
  account_type TEXT NOT NULL,                   -- "Bank", "Receivable", "Asset", etc.
  root_type TEXT NOT NULL,                      -- "Asset", "Liability", "Equity", "Revenue", "Expense"
  normal_balance TEXT NOT NULL,                 -- "Debit" | "Credit"
  is_group BOOLEAN DEFAULT false,               -- Header/group account
  parent_account_number TEXT,                   -- "1100" (references another account in same template)
  description TEXT,
  sort_order INTEGER,                           -- For display ordering
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_id, account_number)
);

-- Entity COA provisioning log
CREATE TABLE entity_coa_provisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES coa_templates(id),
  variables JSONB NOT NULL,                     -- {"ABBR": "RCH", "MEMBER_1_NAME": "Bryan de Bruin", ...}
  accounts_created INTEGER,
  provisioned_at TIMESTAMPTZ DEFAULT now(),
  provisioned_by UUID REFERENCES auth.users(id),
  UNIQUE(entity_id)                             -- One provision per entity
);

-- Indexes
CREATE INDEX idx_coa_templates_entity_type ON coa_templates(entity_type) WHERE is_active = true;
CREATE INDEX idx_coa_template_accounts_template ON coa_template_accounts(template_id);
CREATE INDEX idx_coa_template_accounts_parent ON coa_template_accounts(template_id, parent_account_number);
```

### 2.2 Extend Existing Tables

```sql
-- Add entity_type to entities table if not present
ALTER TABLE entities ADD COLUMN IF NOT EXISTS entity_type TEXT;

-- Add COA template reference to entities
ALTER TABLE entities ADD COLUMN IF NOT EXISTS coa_template_id UUID REFERENCES coa_templates(id);

-- Update accounts table to track template origin
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS template_account_id UUID REFERENCES coa_template_accounts(id);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_template_account BOOLEAN DEFAULT false;
```

### 2.3 RLS Policies

```sql
-- COA Templates: readable by authenticated, writable by admin only
ALTER TABLE coa_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coa_templates_select" ON coa_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "coa_templates_insert" ON coa_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'software_admin')
    )
  );

CREATE POLICY "coa_templates_update" ON coa_templates
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'software_admin')
    )
  );

CREATE POLICY "coa_templates_delete" ON coa_templates
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'software_admin'
    )
  );

-- Same pattern for coa_template_accounts
ALTER TABLE coa_template_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coa_template_accounts_select" ON coa_template_accounts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "coa_template_accounts_modify" ON coa_template_accounts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'software_admin')
    )
  );
```

---

## 3. Edge Functions

### 3.1 Import COA Template

Edge function to import an Excel template file into the database.

**Endpoint:** `POST /functions/v1/import-coa-template`

```typescript
// supabase/functions/import-coa-template/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs";

interface TemplateAccount {
  account_number: string;
  account_name: string;
  account_type: string;
  root_type: string;
  normal_balance: string;
  is_group: boolean;
  parent_account_number: string | null;
  description: string;
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const description = formData.get("description") as string;
  const entityType = formData.get("entity_type") as string;
  const isDefault = formData.get("is_default") === "true";

  // Read Excel file
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  
  // Skip header rows (rows 1-4 are title/description/variables/blank, row 5 is column headers)
  const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { range: 4 });

  // Parse accounts
  const accounts: TemplateAccount[] = data.map((row, index) => ({
    account_number: String(row["Account Number"] || "").trim(),
    account_name: String(row["Account Name"] || "").trim(),
    account_type: String(row["Account Type"] || "").trim(),
    root_type: String(row["Root Type"] || "").trim(),
    normal_balance: String(row["Normal Balance"] || "").trim(),
    is_group: String(row["Is Group"] || "").toLowerCase() === "yes",
    parent_account_number: row["Parent Account"] ? String(row["Parent Account"]).trim() : null,
    description: String(row["Description"] || "").trim(),
    sort_order: index
  })).filter(a => a.account_number && a.account_name);

  // Create template
  const { data: template, error: templateError } = await supabase
    .from("coa_templates")
    .insert({
      name,
      slug,
      description,
      entity_type: entityType,
      is_default: isDefault,
      account_count: accounts.length,
      created_by: (await supabase.auth.getUser()).data.user?.id
    })
    .select()
    .single();

  if (templateError) {
    return new Response(JSON.stringify({ error: templateError.message }), { status: 400 });
  }

  // Insert accounts
  const accountsWithTemplate = accounts.map(a => ({
    ...a,
    template_id: template.id
  }));

  const { error: accountsError } = await supabase
    .from("coa_template_accounts")
    .insert(accountsWithTemplate);

  if (accountsError) {
    // Rollback template
    await supabase.from("coa_templates").delete().eq("id", template.id);
    return new Response(JSON.stringify({ error: accountsError.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ 
    success: true, 
    template_id: template.id,
    accounts_imported: accounts.length 
  }));
});
```

### 3.2 Provision Entity COA

Edge function to provision a chart of accounts for a new entity from a template.

**Endpoint:** `POST /functions/v1/provision-entity-coa`

```typescript
// supabase/functions/provision-entity-coa/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ProvisionRequest {
  entity_id: string;
  template_id: string;
  variables: {
    ABBR: string;
    MEMBER_1_NAME?: string;
    MEMBER_2_NAME?: string;
    BUILDER_NAME?: string;
  };
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { entity_id, template_id, variables }: ProvisionRequest = await req.json();

  // Verify entity exists and has no COA yet
  const { data: entity, error: entityError } = await supabase
    .from("entities")
    .select("id, name")
    .eq("id", entity_id)
    .single();

  if (entityError || !entity) {
    return new Response(JSON.stringify({ error: "Entity not found" }), { status: 404 });
  }

  // Check if already provisioned
  const { data: existing } = await supabase
    .from("entity_coa_provisions")
    .select("id")
    .eq("entity_id", entity_id)
    .single();

  if (existing) {
    return new Response(JSON.stringify({ error: "Entity already has a COA provisioned" }), { status: 400 });
  }

  // Get template accounts
  const { data: templateAccounts, error: templateError } = await supabase
    .from("coa_template_accounts")
    .select("*")
    .eq("template_id", template_id)
    .order("sort_order");

  if (templateError || !templateAccounts?.length) {
    return new Response(JSON.stringify({ error: "Template not found or empty" }), { status: 404 });
  }

  // Replace variables in account names
  const replaceVariables = (text: string): string => {
    let result = text;
    result = result.replace(/\{\{ABBR\}\}/g, variables.ABBR);
    if (variables.MEMBER_1_NAME) {
      result = result.replace(/\{\{MEMBER_1_NAME\}\}/g, variables.MEMBER_1_NAME);
    }
    if (variables.MEMBER_2_NAME) {
      result = result.replace(/\{\{MEMBER_2_NAME\}\}/g, variables.MEMBER_2_NAME);
    }
    if (variables.BUILDER_NAME) {
      result = result.replace(/\{\{BUILDER_NAME\}\}/g, variables.BUILDER_NAME);
    }
    return result;
  };

  // Create account number to ID mapping for parent references
  const accountNumberToId: Record<string, string> = {};

  // First pass: create all accounts without parent_id
  const accountsToCreate = templateAccounts.map(ta => ({
    entity_id,
    code: ta.account_number,
    name: replaceVariables(ta.account_name),
    type: ta.account_type,
    subtype: ta.root_type,
    is_header: ta.is_group,
    is_active: true,
    template_account_id: ta.id,
    is_template_account: true,
    _parent_number: ta.parent_account_number // Temporary field for second pass
  }));

  // Insert accounts
  const { data: createdAccounts, error: createError } = await supabase
    .from("accounts")
    .insert(accountsToCreate.map(({ _parent_number, ...rest }) => rest))
    .select("id, code");

  if (createError) {
    return new Response(JSON.stringify({ error: createError.message }), { status: 500 });
  }

  // Build mapping
  createdAccounts?.forEach(acc => {
    accountNumberToId[acc.code] = acc.id;
  });

  // Second pass: update parent_id references
  const updates = accountsToCreate
    .filter(a => a._parent_number && accountNumberToId[a._parent_number])
    .map(a => ({
      code: a.code,
      parent_id: accountNumberToId[a._parent_number!]
    }));

  for (const update of updates) {
    await supabase
      .from("accounts")
      .update({ parent_id: update.parent_id })
      .eq("entity_id", entity_id)
      .eq("code", update.code);
  }

  // Log provision
  const { error: logError } = await supabase
    .from("entity_coa_provisions")
    .insert({
      entity_id,
      template_id,
      variables,
      accounts_created: createdAccounts?.length || 0,
      provisioned_by: (await supabase.auth.getUser()).data.user?.id
    });

  // Update entity with template reference
  await supabase
    .from("entities")
    .update({ coa_template_id: template_id })
    .eq("id", entity_id);

  return new Response(JSON.stringify({
    success: true,
    accounts_created: createdAccounts?.length || 0
  }));
});
```

---

## 4. Admin Module UI

### 4.1 Route Structure

```
/admin/coa-templates                    # Template list
/admin/coa-templates/new                # Import new template
/admin/coa-templates/:id                # View/edit template
/admin/coa-templates/:id/accounts       # View template accounts
```

### 4.2 COA Templates Index Page

**File:** `src/routes/admin/coa-templates/index.tsx`

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/coa-templates/')({
  component: COATemplatesPage
})

function COATemplatesPage() {
  const { data: templates, isLoading } = useQuery({
    queryKey: ['coa-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coa_templates')
        .select('*')
        .order('entity_type', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      return data
    }
  })

  const columns = [
    {
      accessorKey: 'name',
      header: 'Template Name',
      cell: ({ row }) => (
        <Link 
          to="/admin/coa-templates/$id" 
          params={{ id: row.original.id }}
          className="text-primary hover:underline font-medium"
        >
          {row.original.name}
        </Link>
      )
    },
    {
      accessorKey: 'entity_type',
      header: 'Entity Type',
      cell: ({ row }) => (
        <Badge variant="outline">
          {formatEntityType(row.original.entity_type)}
        </Badge>
      )
    },
    {
      accessorKey: 'account_count',
      header: 'Accounts',
      cell: ({ row }) => row.original.account_count || 0
    },
    {
      accessorKey: 'is_default',
      header: 'Default',
      cell: ({ row }) => row.original.is_default ? (
        <Badge variant="success">Default</Badge>
      ) : null
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">COA Templates</h1>
          <p className="text-muted-foreground">
            Manage chart of accounts templates for entity provisioning
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/coa-templates/new">Import Template</Link>
        </Button>
      </div>

      <DataTable 
        columns={columns} 
        data={templates || []} 
        isLoading={isLoading}
      />
    </div>
  )
}

function formatEntityType(type: string): string {
  const map: Record<string, string> = {
    operating_company: 'Operating Company',
    holding_company: 'Holding Company',
    fund: 'Investment Fund',
    spe_development: 'SPE (Development)',
    spe_rental: 'SPE (Rental)',
    property_management: 'Property Management'
  }
  return map[type] || type
}
```

### 4.3 Import Template Page

**File:** `src/routes/admin/coa-templates/new.tsx`

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export const Route = createFileRoute('/admin/coa-templates/new')({
  component: ImportTemplatePage
})

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  description: z.string().optional(),
  entity_type: z.enum(['operating_company', 'holding_company', 'fund', 'spe_development', 'spe_rental', 'property_management']),
  is_default: z.boolean().default(false),
  file: z.instanceof(File, { message: 'Excel file is required' })
})

type FormData = z.infer<typeof formSchema>

function ImportTemplatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      entity_type: 'spe_development',
      is_default: false
    }
  })

  const importMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const formData = new FormData()
      formData.append('file', data.file)
      formData.append('name', data.name)
      formData.append('slug', data.slug)
      formData.append('description', data.description || '')
      formData.append('entity_type', data.entity_type)
      formData.append('is_default', String(data.is_default))

      const { data: result, error } = await supabase.functions.invoke('import-coa-template', {
        body: formData
      })

      if (error) throw error
      return result
    },
    onSuccess: (result) => {
      toast.success(`Template imported with ${result.accounts_imported} accounts`)
      queryClient.invalidateQueries({ queryKey: ['coa-templates'] })
      navigate({ to: '/admin/coa-templates/$id', params: { id: result.template_id } })
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`)
    }
  })

  const onSubmit = (data: FormData) => {
    importMutation.mutate(data)
  }

  // Auto-generate slug from name
  const watchName = form.watch('name')
  const generateSlug = () => {
    const slug = watchName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
    form.setValue('slug', slug)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import COA Template</h1>
        <p className="text-muted-foreground">
          Upload an Excel file to create a new chart of accounts template
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Details</CardTitle>
          <CardDescription>
            Templates from /COA Templates/ in the repository follow the standard format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="file"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>Excel File (.xlsx)</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => onChange(e.target.files?.[0])}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Upload KOVA_COA_Template_*.xlsx from the repository
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Operating Homebuilder" 
                        {...field} 
                        onBlur={() => {
                          field.onBlur()
                          if (!form.getValues('slug')) generateSlug()
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="operating-homebuilder" {...field} />
                    </FormControl>
                    <FormDescription>
                      URL-safe identifier (lowercase, dashes only)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="entity_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entity Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select entity type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="operating_company">Operating Company</SelectItem>
                        <SelectItem value="holding_company">Holding Company</SelectItem>
                        <SelectItem value="fund">Investment Fund</SelectItem>
                        <SelectItem value="spe_development">SPE (Development)</SelectItem>
                        <SelectItem value="spe_rental">SPE (Rental)</SelectItem>
                        <SelectItem value="property_management">Property Management</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="For active construction companies with employees, job costing, and payroll..."
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_default"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Default Template</FormLabel>
                      <FormDescription>
                        Use this template by default for this entity type
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button type="submit" disabled={importMutation.isPending}>
                  {importMutation.isPending ? 'Importing...' : 'Import Template'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate({ to: '/admin/coa-templates' })}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
```

### 4.4 Template Detail Page

**File:** `src/routes/admin/coa-templates/$id/index.tsx`

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

export const Route = createFileRoute('/admin/coa-templates/$id/')({
  component: TemplateDetailPage
})

function TemplateDetailPage() {
  const { id } = Route.useParams()
  const queryClient = useQueryClient()

  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: ['coa-template', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coa_templates')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    }
  })

  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['coa-template-accounts', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coa_template_accounts')
        .select('*')
        .eq('template_id', id)
        .order('sort_order')
      if (error) throw error
      return data
    }
  })

  const { data: provisions } = useQuery({
    queryKey: ['coa-template-provisions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entity_coa_provisions')
        .select(`
          *,
          entity:entities(id, name, abbreviation)
        `)
        .eq('template_id', id)
        .order('provisioned_at', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const { error } = await supabase
        .from('coa_templates')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coa-template', id] })
      toast.success('Template updated')
    }
  })

  const accountColumns = [
    {
      accessorKey: 'account_number',
      header: 'Account #',
      cell: ({ row }) => (
        <span className={row.original.is_group ? 'font-semibold' : 'font-mono text-sm'}>
          {row.original.account_number}
        </span>
      )
    },
    {
      accessorKey: 'account_name',
      header: 'Account Name',
      cell: ({ row }) => (
        <span className={row.original.is_group ? 'font-semibold' : ''}>
          {row.original.account_name}
        </span>
      )
    },
    {
      accessorKey: 'account_type',
      header: 'Type'
    },
    {
      accessorKey: 'root_type',
      header: 'Root Type',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.root_type}</Badge>
      )
    },
    {
      accessorKey: 'normal_balance',
      header: 'Normal Balance'
    }
  ]

  if (templateLoading) return <div>Loading...</div>
  if (!template) return <div>Template not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{template.name}</h1>
          <p className="text-muted-foreground">{template.description}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Active</span>
            <Switch
              checked={template.is_active}
              onCheckedChange={(checked) => toggleActiveMutation.mutate(checked)}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{template.account_count || accounts?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Entity Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{formatEntityType(template.entity_type)}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Entities Using</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{provisions?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Accounts</CardTitle>
          <CardDescription>
            {accounts?.length || 0} accounts in this template. Variables like {`{{ABBR}}`} are replaced during provisioning.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={accountColumns} 
            data={accounts || []} 
            isLoading={accountsLoading}
          />
        </CardContent>
      </Card>

      {provisions && provisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Entities Using This Template</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {provisions.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <Link 
                      to="/admin/entities/$id" 
                      params={{ id: p.entity_id }}
                      className="font-medium hover:underline"
                    >
                      {p.entity?.name}
                    </Link>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({p.entity?.abbreviation})
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {p.accounts_created} accounts • {new Date(p.provisioned_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

---

## 5. Entity Creation Integration

### 5.1 Update Entity Creation Form

Modify the existing entity creation form to include COA template selection and variable input.

**File:** `src/routes/admin/entities/new.tsx` (additions)

```tsx
// Add to existing entity creation form

import { useQuery } from '@tanstack/react-query'

// Inside the component, add template query
const { data: coaTemplates } = useQuery({
  queryKey: ['coa-templates-active'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('coa_templates')
      .select('*')
      .eq('is_active', true)
      .order('entity_type')
      .order('name')
    if (error) throw error
    return data
  }
})

// Add to form schema
const formSchema = z.object({
  // ... existing fields
  entity_type: z.string().optional(),
  coa_template_id: z.string().optional(),
  coa_variables: z.object({
    ABBR: z.string().min(2).max(5),
    MEMBER_1_NAME: z.string().optional(),
    MEMBER_2_NAME: z.string().optional(),
    BUILDER_NAME: z.string().optional()
  }).optional()
})

// Add to form JSX after entity basic info fields
<Separator className="my-6" />

<div className="space-y-4">
  <h3 className="text-lg font-medium">Chart of Accounts</h3>
  <p className="text-sm text-muted-foreground">
    Select a template to automatically provision a chart of accounts for this entity.
  </p>

  <FormField
    control={form.control}
    name="entity_type"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Entity Type</FormLabel>
        <Select 
          onValueChange={(value) => {
            field.onChange(value)
            // Auto-select default template for this type
            const defaultTemplate = coaTemplates?.find(
              t => t.entity_type === value && t.is_default
            )
            if (defaultTemplate) {
              form.setValue('coa_template_id', defaultTemplate.id)
            }
          }} 
          value={field.value}
        >
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Select entity type" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value="operating_company">Operating Company</SelectItem>
            <SelectItem value="holding_company">Holding Company</SelectItem>
            <SelectItem value="fund">Investment Fund</SelectItem>
            <SelectItem value="spe_development">SPE (Development)</SelectItem>
            <SelectItem value="spe_rental">SPE (Rental)</SelectItem>
            <SelectItem value="property_management">Property Management</SelectItem>
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />

  <FormField
    control={form.control}
    name="coa_template_id"
    render={({ field }) => (
      <FormItem>
        <FormLabel>COA Template</FormLabel>
        <Select onValueChange={field.onChange} value={field.value}>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Select COA template" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value="">No template (manual setup)</SelectItem>
            {coaTemplates
              ?.filter(t => !watchEntityType || t.entity_type === watchEntityType)
              .map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} ({t.account_count} accounts)
                  {t.is_default && ' ★'}
                </SelectItem>
              ))
            }
          </SelectContent>
        </Select>
        <FormDescription>
          Choose a template to auto-provision the chart of accounts
        </FormDescription>
        <FormMessage />
      </FormItem>
    )}
  />

  {watchTemplateId && (
    <Card className="bg-muted/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Template Variables</CardTitle>
        <CardDescription>
          These values replace placeholders in account names
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="coa_variables.ABBR"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Entity Abbreviation (ABBR)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="RCH" 
                  maxLength={5}
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                2-5 character abbreviation used in account names
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="coa_variables.MEMBER_1_NAME"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Primary Member Name</FormLabel>
              <FormControl>
                <Input placeholder="Bryan de Bruin" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="coa_variables.MEMBER_2_NAME"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Secondary Member Name (optional)</FormLabel>
              <FormControl>
                <Input placeholder="SL Fund II" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedTemplate?.entity_type?.startsWith('spe') && (
          <FormField
            control={form.control}
            name="coa_variables.BUILDER_NAME"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Builder Entity Name (SPE only)</FormLabel>
                <FormControl>
                  <Input placeholder="Red Cedar Homes LLC" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </CardContent>
    </Card>
  )}
</div>

// In the onSubmit handler, after creating the entity:
if (data.coa_template_id && data.coa_variables) {
  await supabase.functions.invoke('provision-entity-coa', {
    body: {
      entity_id: newEntity.id,
      template_id: data.coa_template_id,
      variables: data.coa_variables
    }
  })
}
```

---

## 6. Admin Sidebar Navigation

Update the Admin module sidebar to include the COA Templates link.

**File:** `src/components/layout/admin-sidebar.tsx` (additions)

```tsx
// Add to sidebar navigation items
{
  label: 'COA Templates',
  href: '/admin/coa-templates',
  icon: TablePropertiesIcon // or similar
}
```

---

## 7. Migration File

**File:** `supabase/migrations/[timestamp]_coa_templates.sql`

Include all schema from Section 2 in a single migration file with proper ordering:

1. Create `coa_templates` table
2. Create `coa_template_accounts` table  
3. Create `entity_coa_provisions` table
4. Alter `entities` table
5. Alter `accounts` table
6. Create indexes
7. Enable RLS and create policies
8. Create audit triggers

---

## 8. Seed Data

After migration, use the Edge Function to import the six Excel templates from the repository:

```bash
# Example using curl to import templates
for template in \
  "KOVA_COA_Template_Operating_Homebuilder.xlsx|Operating Homebuilder|operating-homebuilder|operating_company|true" \
  "KOVA_COA_Template_Holding_Company.xlsx|Holding Company|holding-company|holding_company|false" \
  "KOVA_COA_Template_Investment_Fund.xlsx|Investment Fund|investment-fund|fund|true" \
  "KOVA_COA_Template_SPE_Development.xlsx|SPE Development|spe-development|spe_development|true" \
  "KOVA_COA_Template_SPE_Rental.xlsx|SPE Rental|spe-rental|spe_rental|true" \
  "KOVA_COA_Template_Property_Management.xlsx|Property Management|property-management|property_management|true"
do
  IFS='|' read -r file name slug entity_type is_default <<< "$template"
  curl -X POST "${SUPABASE_URL}/functions/v1/import-coa-template" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -F "file=@COA Templates/${file}" \
    -F "name=${name}" \
    -F "slug=${slug}" \
    -F "entity_type=${entity_type}" \
    -F "description=Standard KOVA template for ${name}" \
    -F "is_default=${is_default}"
done
```

---

## 9. Testing Checklist

### 9.1 Admin Module

- [ ] COA Templates index page displays all templates
- [ ] Import template page accepts Excel upload
- [ ] Template detail page shows all accounts
- [ ] Toggle active/inactive works
- [ ] Delete template works (only software_admin)
- [ ] RLS prevents non-admin modifications

### 9.2 Entity Creation

- [ ] Entity type selector filters available templates
- [ ] Default template auto-selects
- [ ] Variable inputs appear when template selected
- [ ] ABBR validation (2-5 chars, required)
- [ ] Entity creation provisions COA automatically
- [ ] Provisioned accounts have correct parent relationships
- [ ] Variable replacement works in all account names

### 9.3 Accounts Module

- [ ] Provisioned accounts appear in entity's chart of accounts
- [ ] Template origin tracked (is_template_account flag)
- [ ] Accounts can be edited after provisioning
- [ ] New accounts can be added alongside template accounts

---

## 10. Future Enhancements

1. **Template Versioning** — Track template changes over time, allow entities to upgrade to new versions
2. **Account Mapping Rules** — Define mapping from template accounts to consolidated reporting
3. **Custom Templates** — Allow users to create templates from existing entity COA
4. **Template Comparison** — Side-by-side diff between templates
5. **Bulk Re-provision** — Update multiple entities when template changes

---

## Execution Notes

This specification is designed as a single Claude Code session. Reference this file at `docs/coa-templates-spec.md` in the repository. The implementation order should be:

1. Database migration (Section 2)
2. Edge functions (Section 3)
3. Admin UI pages (Section 4)
4. Entity creation integration (Section 5)
5. Seed data import (Section 8)
6. Testing (Section 9)

The existing `accounts` table schema should be preserved — this spec only adds new columns for template tracking, not a replacement of the COA structure already in place.

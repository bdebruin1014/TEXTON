import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";

import { AutoSaveField, AutoSaveSelect } from "@/components/forms/AutoSaveField";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/contacts/$companyId")({
  component: CompanyDetail,
});

interface Company {
  id: string;
  name: string;
  company_type: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  tax_id: string | null;
  w9_on_file: boolean;
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  insurance_expiry: string | null;
  license_number: string | null;
  license_expiry: string | null;
  notes: string | null;
}

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
}

const COMPANY_TYPES = [
  "Subcontractor",
  "Lender",
  "Law Firm",
  "Title Company",
  "Surveyor",
  "Appraiser",
  "Real Estate Brokerage",
  "Insurance",
  "Utility Provider",
  "Material Supplier",
  "Government",
  "Other",
];

function CompanyDetail() {
  const { companyId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: company, isLoading } = useQuery<Company>({
    queryKey: ["company", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").eq("id", companyId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["company-contacts", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("company_id", companyId)
        .order("is_primary", { ascending: false })
        .order("last_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("companies").update(updates).eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
    },
  });

  const addContact = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("contacts").insert({
        company_id: companyId,
        first_name: "New",
        last_name: "Contact",
        is_primary: contacts.length === 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-contacts", companyId] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });

  const save = (field: string) => async (value: string | number) => {
    await mutation.mutateAsync({ [field]: value });
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  if (!company) {
    return <EmptyState title="Company not found" description="This company may have been removed" />;
  }

  const contactColumns: ColumnDef<Contact, unknown>[] = [
    {
      accessorKey: "first_name",
      header: "First Name",
      cell: ({ row }) => <span className="font-medium">{row.getValue("first_name") ?? "—"}</span>,
    },
    {
      accessorKey: "last_name",
      header: "Last Name",
      cell: ({ row }) => <span className="font-medium">{row.getValue("last_name") ?? "—"}</span>,
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("title") ?? "—"}</span>,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("email") ?? "—"}</span>,
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("phone") ?? "—"}</span>,
    },
    {
      accessorKey: "is_primary",
      header: "Primary",
      cell: ({ row }) =>
        row.getValue("is_primary") ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Primary</span>
        ) : null,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/contacts" className="mb-3 flex items-center gap-1 text-sm text-primary hover:underline">
          ← Back to Companies
        </Link>
        <h1 className="text-xl font-semibold text-foreground">{company.name}</h1>
        <p className="mt-0.5 text-sm text-muted">{company.company_type ?? "Company"}</p>
      </div>

      {/* Company Info */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Company Information</h2>
        <div className="grid grid-cols-1 gap-x-8 gap-y-1 md:grid-cols-2">
          <AutoSaveField label="Company Name" value={company.name} onSave={save("name")} />
          <AutoSaveSelect
            label="Company Type"
            value={company.company_type ?? ""}
            options={COMPANY_TYPES.map((t) => ({ label: t, value: t }))}
            onSave={save("company_type")}
          />
          <AutoSaveField label="Phone" value={company.phone ?? ""} onSave={save("phone")} />
          <AutoSaveField label="Email" value={company.email ?? ""} onSave={save("email")} type="email" />
          <AutoSaveField label="Website" value={company.website ?? ""} onSave={save("website")} />
          <AutoSaveField label="Tax ID (EIN)" value={company.tax_id ?? ""} onSave={save("tax_id")} />
        </div>
      </div>

      {/* Address */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Address</h2>
        <div className="grid grid-cols-1 gap-x-8 gap-y-1 md:grid-cols-2">
          <AutoSaveField label="Address Line 1" value={company.address_line1 ?? ""} onSave={save("address_line1")} />
          <AutoSaveField label="Address Line 2" value={company.address_line2 ?? ""} onSave={save("address_line2")} />
          <AutoSaveField label="City" value={company.city ?? ""} onSave={save("city")} />
          <AutoSaveField label="State" value={company.state ?? ""} onSave={save("state")} />
          <AutoSaveField label="ZIP" value={company.zip ?? ""} onSave={save("zip")} />
        </div>
      </div>

      {/* Compliance */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Compliance</h2>
        <div className="grid grid-cols-1 gap-x-8 gap-y-1 md:grid-cols-2">
          <div className="flex items-center gap-3 py-2">
            <label className="text-sm font-medium text-foreground">W-9 on File</label>
            <input
              type="checkbox"
              checked={company.w9_on_file ?? false}
              onChange={(e) => mutation.mutate({ w9_on_file: e.target.checked })}
              className="h-4 w-4 rounded border-border"
            />
          </div>
          <AutoSaveField
            label="Insurance Provider"
            value={company.insurance_provider ?? ""}
            onSave={save("insurance_provider")}
          />
          <AutoSaveField
            label="Policy Number"
            value={company.insurance_policy_number ?? ""}
            onSave={save("insurance_policy_number")}
          />
          <AutoSaveField
            label="Insurance Expiry"
            value={company.insurance_expiry ?? ""}
            onSave={save("insurance_expiry")}
            type="date"
          />
          <AutoSaveField label="License Number" value={company.license_number ?? ""} onSave={save("license_number")} />
          <AutoSaveField
            label="License Expiry"
            value={company.license_expiry ?? ""}
            onSave={save("license_expiry")}
            type="date"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Notes</h2>
        <AutoSaveField label="" value={company.notes ?? ""} onSave={save("notes")} type="textarea" rows={4} />
      </div>

      {/* Contacts Sub-table */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">People ({contacts.length})</h2>
          <button
            type="button"
            onClick={() => addContact.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-button px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-button-hover"
          >
            + Add Contact
          </button>
        </div>
        {contacts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No contacts yet</p>
        ) : (
          <DataTable columns={contactColumns} data={contacts} searchKey="last_name" searchPlaceholder="Search..." />
        )}
      </div>
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CreateRecordModal } from "@/components/shared/CreateRecordModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { COMPANY_TYPE_CATEGORIES, COMPANY_TYPES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/contacts/")({
  component: CompaniesIndex,
});

interface Company {
  id: string;
  name: string;
  company_type: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  contact_count: number | null;
}

const columns: ColumnDef<Company, unknown>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => <span className="font-medium text-foreground">{row.getValue("name")}</span>,
  },
  {
    accessorKey: "company_type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: ({ row }) => {
      const val = row.getValue("company_type") as string | null;
      return <span className="text-muted">{val ?? "Not set"}</span>;
    },
  },
  {
    id: "address",
    header: "Address",
    cell: ({ row }) => {
      const city = row.original.city;
      const state = row.original.state;
      const addr = [city, state].filter(Boolean).join(", ");
      return <span className="text-muted">{addr || "Not set"}</span>;
    },
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => {
      const val = row.getValue("phone") as string | null;
      return <span className="text-muted">{val ?? "Not set"}</span>;
    },
  },
];

function CompaniesIndex() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const activeEntityId = useEntityStore((s) => s.activeEntityId);
  const location = useRouterState({ select: (s) => s.location });
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [phoneFilter, setPhoneFilter] = useState("Any");
  const [taxIdFilter, setTaxIdFilter] = useState("Any");

  // Read filter from search params
  const activeType = (location.search as Record<string, string>)?.type ?? "all";

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ["companies", activeEntityId],
    queryFn: async () => {
      let query = supabase
        .from("companies")
        .select("id, name, company_type, phone, email, address, city, state, contact_count")
        .order("name");
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Resolve which types to filter by
  const filterTypes = useMemo(() => {
    if (activeType === "all") return null; // show all
    // Check if it's a category label
    const category = COMPANY_TYPE_CATEGORIES.find((c) => c.label === activeType);
    if (category) return [...category.types];
    // It's a specific type
    return [activeType];
  }, [activeType]);

  const filtered = useMemo(() => {
    let result = companies;
    if (filterTypes) {
      result = result.filter((c) => c.company_type && filterTypes.includes(c.company_type));
    }
    if (phoneFilter === "Has Phone") result = result.filter((c) => !!c.phone);
    else if (phoneFilter === "No Phone") result = result.filter((c) => !c.phone);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.company_type?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [companies, filterTypes, phoneFilter, searchTerm]);

  // Derive header title from active filter
  const headerTitle = useMemo(() => {
    if (activeType === "all") return "All Companies";
    const category = COMPANY_TYPE_CATEGORIES.find((c) => c.label === activeType);
    if (category) return `${category.label} Companies`;
    return activeType;
  }, [activeType]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company deleted");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete company"),
  });

  const allColumns = useMemo(
    () => [
      ...columns,
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <button
            type="button"
            className="text-xs text-destructive hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm("Delete this company and all associated contacts?")) {
                deleteMutation.mutate(row.original.id);
              }
            }}
          >
            Delete
          </button>
        ),
        size: 80,
      } as ColumnDef<Company, unknown>,
    ],
    [deleteMutation],
  );

  const addCompany = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { data, error } = await supabase
        .from("companies")
        .insert({
          name: values.name,
          company_type: values.company_type || null,
          phone: values.phone || null,
          email: values.email || null,
          entity_id: activeEntityId,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company created");
      setShowModal(false);
      if (data?.id) {
        navigate({ to: `/contacts/${data.id}` as string });
      }
    },
    onError: (err: any) => toast.error(err?.message || "Failed to create company"),
  });

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{headerTitle}</h1>
            <p className="mt-0.5 text-sm text-muted">
              {filtered.length} {filtered.length === 1 ? "company" : "companies"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
          >
            + New Company
          </button>
        </div>

        {/* Table */}
        {isLoading ? (
          <TableSkeleton rows={8} cols={4} />
        ) : filtered.length === 0 ? (
          <EmptyState title="No companies found" description="Try adjusting your filters or add a new company" />
        ) : (
          <DataTable
            columns={allColumns}
            data={filtered}
            searchKey="name"
            searchPlaceholder="Search companies..."
            onRowClick={(row) => navigate({ to: `/contacts/${row.id}` as string })}
          />
        )}
      </div>

      {/* Right filter panel */}
      <div className="hidden w-56 shrink-0 lg:block" style={{ borderLeft: "1px solid var(--color-border)" }}>
        <div className="pl-5 pt-1">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Filter Companies</h2>

          {/* SEARCH TERM */}
          <div className="mb-4">
            <label
              htmlFor="contacts-search"
              className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Search Term
            </label>
            <input
              id="contacts-search"
              type="text"
              placeholder="Search Companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded border border-border bg-card px-2.5 py-1.5 text-xs text-foreground outline-none placeholder:text-muted transition-colors focus:border-primary"
            />
          </div>

          {/* COMPANY section */}
          <div className="mb-4">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Company
            </span>

            {/* Phone filter */}
            <label htmlFor="filter-phone" className="mb-1 block text-[11px] text-muted-foreground">
              Phone
            </label>
            <select
              id="filter-phone"
              value={phoneFilter}
              onChange={(e) => setPhoneFilter(e.target.value)}
              className="mb-3 w-full rounded border border-border bg-card px-2 py-1.5 text-xs text-foreground outline-none"
            >
              <option>Any</option>
              <option>Has Phone</option>
              <option>No Phone</option>
            </select>

            {/* Tax ID filter */}
            <label htmlFor="filter-taxid" className="mb-1 block text-[11px] text-muted-foreground">
              Tax ID Number
            </label>
            <select
              id="filter-taxid"
              value={taxIdFilter}
              onChange={(e) => setTaxIdFilter(e.target.value)}
              className="w-full rounded border border-border bg-card px-2 py-1.5 text-xs text-foreground outline-none"
            >
              <option>Any</option>
              <option>Has Tax ID</option>
              <option>No Tax ID</option>
            </select>
          </div>
        </div>
      </div>

      <CreateRecordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="New Company"
        fields={[
          { name: "name", label: "Company name", type: "text", required: true, placeholder: "Company name" },
          {
            name: "company_type",
            label: "Company type",
            type: "select",
            options: COMPANY_TYPES.map((t) => ({ label: t, value: t })),
            placeholder: "Company type",
          },
          { name: "phone", label: "Phone", type: "tel", placeholder: "Phone" },
          { name: "email", label: "Email", type: "email", placeholder: "Email" },
        ]}
        onSubmit={async (values) => {
          addCompany.mutate(values);
        }}
        loading={addCompany.isPending}
      />
    </div>
  );
}

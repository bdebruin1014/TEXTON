import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/purchasing/vendors")({
  component: Vendors,
});

interface Vendor {
  id: string;
  company_name: string;
  trade: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  w9_on_file: boolean;
  insurance_expiry: string | null;
  license_number: string | null;
  license_expiry: string | null;
  status: string;
}

function Vendors() {
  const queryClient = useQueryClient();
  const activeEntityId = useEntityStore((s) => s.activeEntityId);

  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({
    queryKey: ["vendors", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("vendors").select("*").order("company_name");
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const addVendor = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("vendors").insert({
        company_name: "New Vendor",
        status: "Active",
        w9_on_file: false,
        entity_id: activeEntityId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendors", activeEntityId] }),
  });

  const isExpiringSoon = (dateStr: string | null) => {
    if (!dateStr) return false;
    const expiry = new Date(dateStr);
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    return expiry <= thirtyDays;
  };

  const isExpired = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  const complianceIssues = vendors.filter(
    (v) => !v.w9_on_file || isExpired(v.insurance_expiry) || isExpired(v.license_expiry),
  ).length;

  const columns: ColumnDef<Vendor, unknown>[] = [
    {
      accessorKey: "company_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Company" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("company_name")}</span>,
    },
    {
      accessorKey: "trade",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Trade" />,
      cell: ({ row }) => {
        const val = row.getValue("trade") as string | null;
        return val ? <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-medium">{val}</span> : "—";
      },
    },
    {
      accessorKey: "contact_name",
      header: "Contact",
      cell: ({ row }) => <span className="text-sm">{row.getValue("contact_name") ?? "—"}</span>,
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("phone") ?? "—"}</span>,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("email") ?? "—"}</span>,
    },
    {
      accessorKey: "w9_on_file",
      header: "W-9",
      cell: ({ row }) => {
        const hasW9 = row.getValue("w9_on_file") as boolean;
        return hasW9 ? (
          <span className="text-success font-bold">{"\u2022"}</span>
        ) : (
          <span className="text-muted">{"\u25CB"}</span>
        );
      },
    },
    {
      accessorKey: "insurance_expiry",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Insurance" />,
      cell: ({ row }) => {
        const val = row.getValue("insurance_expiry") as string | null;
        if (!val) return <span className="text-xs text-muted">Not on file</span>;
        const expired = isExpired(val);
        const expiring = isExpiringSoon(val);
        return (
          <span
            className={`text-xs font-medium ${expired ? "text-destructive" : expiring ? "text-warning" : "text-success"}`}
          >
            {expired ? "Expired" : expiring ? "Expiring" : "Valid"} · {formatDate(val)}
          </span>
        );
      },
    },
    {
      accessorKey: "license_number",
      header: "License",
      cell: ({ row }) => {
        const num = row.getValue("license_number") as string | null;
        const expiry = row.original.license_expiry;
        if (!num) return <span className="text-xs text-muted">—</span>;
        const expired = isExpired(expiry);
        return (
          <span className={`font-mono text-xs ${expired ? "text-destructive" : ""}`}>
            {num}
            {expiry && <span className="ml-1 text-muted">({formatDate(expiry)})</span>}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const color = status === "Active" ? "bg-success-bg text-success-text" : "bg-accent text-muted-foreground";
        return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{status}</span>;
      },
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Vendor Directory</h1>
          <p className="mt-0.5 text-sm text-muted">
            {vendors.length} vendors
            {complianceIssues > 0 && <span className="text-warning"> · {complianceIssues} compliance issues</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => addVendor.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          +
          Add Vendor
        </button>
      </div>

      {/* Compliance Summary */}
      {complianceIssues > 0 && (
        <div className="mb-6 rounded-lg border border-warning/30 bg-warning/5 p-4">
          <div className="flex items-center gap-2">
            
            <span className="text-sm font-medium text-warning">
              {complianceIssues} vendor{complianceIssues === 1 ? "" : "s"} with compliance issues
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">Missing W-9, expired insurance, or expired license</p>
        </div>
      )}

      {isLoading ? (
        <FormSkeleton />
      ) : vendors.length === 0 ? (
        <EmptyState title="No vendors" description="Add vendors to track compliance, W-9s, insurance, and licenses" />
      ) : (
        <DataTable columns={columns} data={vendors} searchKey="company_name" searchPlaceholder="Search vendors..." />
      )}
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";
import { CreateRecordModal } from "@/components/shared/CreateRecordModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/contacts/customers")({
  component: Customers,
});

interface Customer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  project_name: string | null;
  lot_number: string | null;
  status: string;
  created_at: string;
}

function Customers() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const activeEntityId = useEntityStore((s) => s.activeEntityId);

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["customers", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("customers").select("*").order("last_name").order("first_name");
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const addCustomer = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { error } = await supabase.from("customers").insert({
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email || null,
        phone: values.phone || null,
        status: "Active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer added");
      setShowModal(false);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to add customer"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer deleted");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete customer"),
  });

  const columns: ColumnDef<Customer, unknown>[] = [
    {
      accessorKey: "last_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Last Name" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("last_name") ?? "—"}</span>,
    },
    {
      accessorKey: "first_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="First Name" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("first_name") ?? "—"}</span>,
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
      accessorKey: "project_name",
      header: "Project",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("project_name") ?? "—"}</span>,
    },
    {
      accessorKey: "lot_number",
      header: "Lot",
      cell: ({ row }) => {
        const val = row.getValue("lot_number") as string | null;
        return val ? <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-xs">{val}</span> : "—";
      },
    },
    {
      accessorKey: "city",
      header: "City",
      cell: ({ row }) => {
        const city = row.getValue("city") as string | null;
        const state = row.original.state;
        return <span className="text-sm text-muted">{[city, state].filter(Boolean).join(", ") || "—"}</span>;
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
    {
      accessorKey: "created_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Added" />,
      cell: ({ row }) => formatDate(row.getValue("created_at")),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <button
          type="button"
          className="text-xs text-destructive hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm("Delete this customer record?")) {
              deleteMutation.mutate(row.original.id);
            }
          }}
        >
          Delete
        </button>
      ),
      size: 80,
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Customers</h1>
          <p className="mt-0.5 text-sm text-muted">{customers.length} buyers & customers</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + Add Customer
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : customers.length === 0 ? (
        <EmptyState title="No customers" description="Track buyers and homeowners in the customer directory" />
      ) : (
        <DataTable columns={columns} data={customers} searchKey="last_name" searchPlaceholder="Search customers..." />
      )}

      <CreateRecordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Customer"
        fields={[
          { name: "first_name", label: "First name", type: "text", required: true, placeholder: "First name" },
          { name: "last_name", label: "Last name", type: "text", required: true, placeholder: "Last name" },
          { name: "email", label: "Email", type: "email", placeholder: "Email" },
          { name: "phone", label: "Phone", type: "tel", placeholder: "Phone" },
        ]}
        onSubmit={async (values) => {
          addCustomer.mutate(values);
        }}
        loading={addCustomer.isPending}
      />
    </div>
  );
}

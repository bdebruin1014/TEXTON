import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

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

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").order("last_name").order("first_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addCustomer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("customers").insert({
        first_name: "New",
        last_name: "Customer",
        status: "Active",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
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
        return val ? <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">{val}</span> : "—";
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
        const color = status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600";
        return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{status}</span>;
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Added" />,
      cell: ({ row }) => formatDate(row.getValue("created_at")),
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
          onClick={() => addCustomer.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : customers.length === 0 ? (
        <EmptyState title="No customers" description="Track buyers and homeowners in the customer directory" />
      ) : (
        <DataTable columns={columns} data={customers} searchKey="last_name" searchPlaceholder="Search customers..." />
      )}
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";

import { CreateRecordModal } from "@/components/shared/CreateRecordModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/construction/$jobId/purchase-orders")({
  component: PurchaseOrders,
});

interface PO {
  id: string;
  po_number: string | null;
  vendor_name: string | null;
  description: string | null;
  amount: number | null;
  status: string;
  issued_date: string | null;
  cost_code: string | null;
}

function PurchaseOrders() {
  const { jobId } = Route.useParams();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: pos = [], isLoading } = useQuery<PO[]>({
    queryKey: ["purchase-orders", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addPO = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const nextNum = pos.length + 1;
      const { error } = await supabase.from("purchase_orders").insert({
        job_id: jobId,
        po_number: `PO-${String(nextNum).padStart(3, "0")}`,
        status: "Draft",
        vendor_name: values.vendor_name || null,
        description: values.description || null,
        amount: values.amount ? Number(values.amount) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders", jobId] });
      toast.success("Purchase order created");
      setShowModal(false);
    },
    onError: () => toast.error("Failed to create purchase order"),
  });

  const user = useAuthStore((s) => s.user);
  const { data: userRole } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("user_profiles").select("role").eq("user_id", user.id).single();
      return data?.role ?? null;
    },
    enabled: !!user?.id,
  });
  const canDelete = userRole === "admin" || userRole === "software_admin";
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const deletePO = useMutation({
    mutationFn: async (id: string) => {
      const { count } = await supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("po_id", id);
      if (count && count > 0) {
        throw new Error(`Cannot delete: ${count} linked invoice(s) exist. Remove them first.`);
      }
      const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders", jobId] });
      toast.success("Purchase order deleted");
      setConfirmDeleteId(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete purchase order");
      setConfirmDeleteId(null);
    },
  });

  const totalAmount = pos.reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const columns: ColumnDef<PO, unknown>[] = [
    {
      accessorKey: "po_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="PO #" />,
      cell: ({ row }) => <span className="font-medium font-mono">{row.getValue("po_number") ?? "—"}</span>,
    },
    {
      accessorKey: "vendor_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vendor" />,
      cell: ({ row }) => <span className="text-muted">{row.getValue("vendor_name") ?? "—"}</span>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="text-muted">{row.getValue("description") ?? "—"}</span>,
    },
    {
      accessorKey: "cost_code",
      header: "Code",
      cell: ({ row }) => <span className="font-mono text-xs text-muted">{row.getValue("cost_code") ?? "—"}</span>,
    },
    {
      accessorKey: "amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => {
        const val = row.getValue("amount") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      accessorKey: "issued_date",
      header: "Issued",
      cell: ({ row }) => formatDate(row.getValue("issued_date")),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        if (confirmDeleteId === row.original.id) {
          return (
            <div className="flex items-center gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
              <span className="text-muted">Delete this PO?</span>
              <button
                type="button"
                onClick={() => deletePO.mutate(row.original.id)}
                disabled={deletePO.isPending}
                className="font-medium text-destructive hover:underline"
              >
                {deletePO.isPending ? "Deleting..." : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="font-medium text-muted hover:underline"
              >
                Cancel
              </button>
            </div>
          );
        }
        if (!canDelete) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDeleteId(row.original.id);
            }}
            className="rounded p-1 text-xs text-muted transition-colors hover:text-destructive"
          >
            Delete
          </button>
        );
      },
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Purchase Orders</h2>
          {pos.length > 0 && (
            <p className="mt-0.5 text-sm text-muted">
              {pos.length} POs · {formatCurrency(totalAmount)} total
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + New PO
        </button>
      </div>

      <CreateRecordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="New Purchase Order"
        fields={[
          { name: "vendor_name", label: "Vendor", type: "text", required: true },
          { name: "description", label: "Description", type: "text" },
          { name: "amount", label: "Amount", type: "number" },
        ]}
        onSubmit={async (values) => {
          addPO.mutate(values);
        }}
        loading={addPO.isPending}
      />

      {isLoading ? (
        <FormSkeleton />
      ) : pos.length === 0 ? (
        <EmptyState title="No purchase orders" description="Create purchase orders to track vendor commitments" />
      ) : (
        <DataTable columns={columns} data={pos} searchKey="vendor_name" searchPlaceholder="Search POs..." />
      )}
    </div>
  );
}

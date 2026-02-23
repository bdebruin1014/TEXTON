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

export const Route = createFileRoute("/_authenticated/construction/$jobId/change-orders")({
  component: ChangeOrders,
});

interface ChangeOrder {
  id: string;
  co_number: number;
  description: string | null;
  amount: number | null;
  status: string;
  requested_by: string | null;
  requested_date: string | null;
  approved_date: string | null;
  cost_code: string | null;
}

function ChangeOrders() {
  const { jobId } = Route.useParams();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: cos = [], isLoading } = useQuery<ChangeOrder[]>({
    queryKey: ["change-orders", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("change_orders")
        .select("*")
        .eq("job_id", jobId)
        .order("co_number", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addCO = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const nextNum = cos.length > 0 ? Math.max(...cos.map((c) => c.co_number)) + 1 : 1;
      const { error } = await supabase.from("change_orders").insert({
        job_id: jobId,
        co_number: nextNum,
        status: "Pending",
        description: values.description || null,
        amount: values.amount ? Number(values.amount) : null,
        cost_code: values.change_type || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["change-orders", jobId] });
      toast.success("Change order created");
      setShowModal(false);
    },
    onError: () => toast.error("Failed to create change order"),
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

  const deleteCO = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("change_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["change-orders", jobId] });
      toast.success("Change order deleted");
      setConfirmDeleteId(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete change order");
      setConfirmDeleteId(null);
    },
  });

  const totalAmount = cos.reduce((sum, c) => sum + (c.amount ?? 0), 0);
  const approvedAmount = cos.filter((c) => c.status === "Approved").reduce((sum, c) => sum + (c.amount ?? 0), 0);

  const columns: ColumnDef<ChangeOrder, unknown>[] = [
    {
      accessorKey: "co_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="CO #" />,
      cell: ({ row }) => <span className="font-medium">#{row.getValue("co_number")}</span>,
    },
    {
      accessorKey: "description",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
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
        if (!val) return "—";
        return <span className={val > 0 ? "text-destructive" : "text-success"}>{formatCurrency(val)}</span>;
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      accessorKey: "requested_by",
      header: "Requested By",
      cell: ({ row }) => <span className="text-muted">{row.getValue("requested_by") ?? "—"}</span>,
    },
    {
      accessorKey: "requested_date",
      header: "Requested",
      cell: ({ row }) => formatDate(row.getValue("requested_date")),
    },
    {
      accessorKey: "approved_date",
      header: "Approved",
      cell: ({ row }) => formatDate(row.getValue("approved_date")),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        if (confirmDeleteId === row.original.id) {
          return (
            <div className="flex items-center gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
              <span className="text-muted">Delete this CO?</span>
              <button
                type="button"
                onClick={() => deleteCO.mutate(row.original.id)}
                disabled={deleteCO.isPending}
                className="font-medium text-destructive hover:underline"
              >
                {deleteCO.isPending ? "Deleting..." : "Delete"}
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
          <h2 className="text-lg font-semibold text-foreground">Change Orders</h2>
          {cos.length > 0 && (
            <p className="mt-0.5 text-sm text-muted">
              {cos.length} COs · {formatCurrency(totalAmount)} total · {formatCurrency(approvedAmount)} approved
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + New Change Order
        </button>
      </div>

      <CreateRecordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="New Change Order"
        fields={[
          { name: "description", label: "Description", type: "text", required: true },
          { name: "amount", label: "Amount", type: "number" },
          {
            name: "change_type",
            label: "Change type",
            type: "select",
            options: ["Addition", "Deduction", "Substitution"],
          },
        ]}
        onSubmit={async (values) => {
          addCO.mutate(values);
        }}
        loading={addCO.isPending}
      />

      {isLoading ? (
        <FormSkeleton />
      ) : cos.length === 0 ? (
        <EmptyState title="No change orders" description="Create change orders to track scope and cost changes" />
      ) : (
        <DataTable columns={columns} data={cos} searchKey="description" searchPlaceholder="Search change orders..." />
      )}
    </div>
  );
}

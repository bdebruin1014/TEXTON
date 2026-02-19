import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle, Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/purchasing/purchase-orders")({
  component: PurchaseOrders,
});

interface PurchaseOrder {
  id: string;
  po_number: string | null;
  vendor_name: string | null;
  job_name: string | null;
  project_name: string | null;
  description: string | null;
  amount: number | null;
  cost_code: string | null;
  status: string;
  issue_date: string | null;
  delivery_date: string | null;
}

function PurchaseOrders() {
  const queryClient = useQueryClient();
  const activeEntityId = useEntityStore((s) => s.activeEntityId);

  const { data: purchaseOrders = [], isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ["purchase-orders", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("purchase_orders").select("*").order("created_at", { ascending: false });
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const addPO = useMutation({
    mutationFn: async () => {
      const count = purchaseOrders.length + 1;
      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("purchase_orders").insert({
        po_number: `PO-${String(count).padStart(5, "0")}`,
        issue_date: today,
        status: "Draft",
        entity_id: activeEntityId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchase-orders", activeEntityId] }),
  });

  const approvePO = useMutation({
    mutationFn: async (poId: string) => {
      const { error } = await supabase.from("purchase_orders").update({ status: "Approved" }).eq("id", poId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchase-orders", activeEntityId] }),
  });

  const totalCommitted = purchaseOrders
    .filter((po) => po.status !== "Void" && po.status !== "Draft")
    .reduce((sum, po) => sum + (po.amount ?? 0), 0);
  const pendingCount = purchaseOrders.filter((po) => po.status === "Draft" || po.status === "Pending Approval").length;

  const columns: ColumnDef<PurchaseOrder, unknown>[] = [
    {
      accessorKey: "po_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="PO #" />,
      cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.getValue("po_number") ?? "—"}</span>,
    },
    {
      accessorKey: "vendor_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vendor" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("vendor_name") ?? "—"}</span>,
    },
    {
      accessorKey: "job_name",
      header: "Job",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("job_name") ?? "—"}</span>,
    },
    {
      accessorKey: "project_name",
      header: "Project",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("project_name") ?? "—"}</span>,
    },
    {
      accessorKey: "cost_code",
      header: "Cost Code",
      cell: ({ row }) => {
        const val = row.getValue("cost_code") as string | null;
        return val ? <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">{val}</span> : "—";
      },
    },
    {
      accessorKey: "amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => {
        const val = row.getValue("amount") as number | null;
        return val != null ? <span className="font-medium">{formatCurrency(val)}</span> : "—";
      },
    },
    {
      accessorKey: "issue_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Issued" />,
      cell: ({ row }) => {
        const val = row.getValue("issue_date") as string | null;
        return val ? formatDate(val) : "—";
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.status === "Draft" || row.original.status === "Pending Approval" ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              approvePO.mutate(row.original.id);
            }}
            className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs font-medium text-success transition-colors hover:bg-green-50"
          >
            <CheckCircle className="h-3 w-3" />
            Approve
          </button>
        ) : null,
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Purchase Orders</h1>
          <p className="mt-0.5 text-sm text-muted">
            {purchaseOrders.length} POs · Committed: {formatCurrency(totalCommitted)}
            {pendingCount > 0 && <span className="text-warning"> · {pendingCount} pending approval</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => addPO.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          New PO
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : purchaseOrders.length === 0 ? (
        <EmptyState
          title="No purchase orders"
          description="Create purchase orders across all jobs with approval workflow"
        />
      ) : (
        <DataTable
          columns={columns}
          data={purchaseOrders}
          searchKey="vendor_name"
          searchPlaceholder="Search purchase orders..."
        />
      )}
    </div>
  );
}

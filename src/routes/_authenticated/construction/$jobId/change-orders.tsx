import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";

import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
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
    mutationFn: async () => {
      const nextNum = cos.length > 0 ? Math.max(...cos.map((c) => c.co_number)) + 1 : 1;
      const { error } = await supabase.from("change_orders").insert({
        job_id: jobId,
        co_number: nextNum,
        status: "Pending",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["change-orders", jobId] }),
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
          onClick={() => addCO.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + New Change Order
        </button>
      </div>

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

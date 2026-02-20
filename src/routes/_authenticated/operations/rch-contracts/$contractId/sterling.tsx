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

export const Route = createFileRoute("/_authenticated/operations/rch-contracts/$contractId/sterling")({
  component: SterlingPO,
});

interface SterlingRecord {
  id: string;
  contract_id: string;
  unit_lot_number: string | null;
  request_date: string | null;
  received_date: string | null;
  amount: number | null;
  status: string;
  notes: string | null;
  created_at: string;
}

function SterlingPO() {
  const { contractId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery<SterlingRecord[]>({
    queryKey: ["rch-contract-sterling", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rch_contract_sterling")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addRecord = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("rch_contract_sterling").insert({
        contract_id: contractId,
        status: "Pending",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rch-contract-sterling", contractId] }),
  });

  const deleteRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rch_contract_sterling").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rch-contract-sterling", contractId] }),
  });

  const totalAmount = records.reduce((sum, r) => sum + (r.amount ?? 0), 0);

  const columns: ColumnDef<SterlingRecord, unknown>[] = [
    {
      accessorKey: "unit_lot_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Unit" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("unit_lot_number") ?? "---"}</span>,
    },
    {
      accessorKey: "request_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Request Date" />,
      cell: ({ row }) => formatDate(row.getValue("request_date")),
    },
    {
      accessorKey: "received_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Received Date" />,
      cell: ({ row }) => formatDate(row.getValue("received_date")),
    },
    {
      accessorKey: "amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => {
        const val = row.getValue("amount") as number | null;
        return val ? formatCurrency(val) : "---";
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => (
        <span className="max-w-[200px] truncate text-sm text-muted">{row.getValue("notes") ?? "---"}</span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteRecord.mutate(row.original.id);
          }}
          className="rounded p-1 text-muted transition-colors hover:text-destructive"
        >
          Delete
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Sterling PO Tracking</h2>
          {records.length > 0 && (
            <p className="mt-0.5 text-sm text-muted">
              {records.length} records &middot; Total: {formatCurrency(totalAmount)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => addRecord.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Add Sterling PO
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : records.length === 0 ? (
        <EmptyState
          title="No Sterling POs"
          description="Track Sterling purchase order requests and receipts"
          action={
            <button
              type="button"
              onClick={() => addRecord.mutate()}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Add Sterling PO
            </button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={records}
          searchKey="unit_lot_number"
          searchPlaceholder="Search by unit..."
        />
      )}
    </div>
  );
}

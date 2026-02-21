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
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/accounting/aggregate-payments")({
  component: AggregatePayments,
});

interface BatchPayment {
  id: string;
  batch_number: string | null;
  payment_date: string | null;
  total_amount: number | null;
  payment_count: number | null;
  payment_method: string | null;
  bank_account_name: string | null;
  status: string;
  notes: string | null;
}

function AggregatePayments() {
  const queryClient = useQueryClient();
  const activeEntityId = useEntityStore((s) => s.activeEntityId);
  const [showModal, setShowModal] = useState(false);

  const { data: batches = [], isLoading } = useQuery<BatchPayment[]>({
    queryKey: ["batch-payments", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("batch_payments").select("*").order("payment_date", { ascending: false });
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const addBatch = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const count = batches.length + 1;
      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("batch_payments").insert({
        batch_number: `BP-${String(count).padStart(4, "0")}`,
        payment_date: today,
        status: "Draft",
        entity_id: activeEntityId,
        payment_method: values.payment_method || null,
        bank_account_name: values.bank_account_name || null,
        notes: values.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batch-payments", activeEntityId] });
      toast.success("Batch payment created");
      setShowModal(false);
    },
    onError: () => toast.error("Failed to create batch payment"),
  });

  const deleteBatch = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("batch_payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["batch-payments", activeEntityId] }),
  });

  const columns: ColumnDef<BatchPayment, unknown>[] = [
    {
      accessorKey: "batch_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Batch #" />,
      cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.getValue("batch_number") ?? "—"}</span>,
    },
    {
      accessorKey: "payment_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => <span className="font-medium">{formatDate(row.getValue("payment_date"))}</span>,
    },
    {
      accessorKey: "payment_count",
      header: "Payments",
      cell: ({ row }) => {
        const val = row.getValue("payment_count") as number | null;
        return val ?? "—";
      },
    },
    {
      accessorKey: "total_amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
      cell: ({ row }) => {
        const val = row.getValue("total_amount") as number | null;
        return val ? <span className="font-medium">{formatCurrency(val)}</span> : "—";
      },
    },
    {
      accessorKey: "payment_method",
      header: "Method",
      cell: ({ row }) => <span className="text-xs text-muted">{row.getValue("payment_method") ?? "—"}</span>,
    },
    {
      accessorKey: "bank_account_name",
      header: "Bank Account",
      cell: ({ row }) => <span className="text-muted">{row.getValue("bank_account_name") ?? "—"}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteBatch.mutate(row.original.id);
          }}
          className="rounded p-1 text-muted transition-colors hover:text-destructive"
        ></button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Aggregate Payments</h1>
          <p className="mt-0.5 text-sm text-muted">{batches.length} batches</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + New Batch Payment
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : batches.length === 0 ? (
        <EmptyState title="No batch payments" description="Create aggregate payment batches for multiple vendors" />
      ) : (
        <DataTable columns={columns} data={batches} searchKey="batch_number" searchPlaceholder="Search batches..." />
      )}

      <CreateRecordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="New Batch Payment"
        fields={[
          {
            name: "payment_method",
            label: "Payment method",
            type: "select",
            placeholder: "Payment method",
            options: ["Check", "Wire", "ACH", "EFT"],
          },
          { name: "bank_account_name", label: "Bank account", type: "text", placeholder: "Bank account" },
          { name: "notes", label: "Notes", type: "textarea", placeholder: "Notes" },
        ]}
        onSubmit={async (values) => {
          await addBatch.mutateAsync(values);
        }}
        loading={addBatch.isPending}
      />
    </div>
  );
}

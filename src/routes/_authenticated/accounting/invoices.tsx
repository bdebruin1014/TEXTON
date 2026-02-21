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

export const Route = createFileRoute("/_authenticated/accounting/invoices")({
  component: Invoices,
});

interface Invoice {
  id: string;
  invoice_number: string | null;
  vendor_name: string | null;
  invoice_date: string | null;
  due_date: string | null;
  amount: number | null;
  paid_amount: number | null;
  status: string;
  description: string | null;
}

function Invoices() {
  const queryClient = useQueryClient();
  const activeEntityId = useEntityStore((s) => s.activeEntityId);
  const [showModal, setShowModal] = useState(false);

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["invoices", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("invoices").select("*").order("invoice_date", { ascending: false });
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const addInvoice = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const count = invoices.length + 1;
      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("invoices").insert({
        invoice_number: `INV-${String(count).padStart(4, "0")}`,
        invoice_date: today,
        status: "Draft",
        entity_id: activeEntityId,
        vendor_name: values.vendor_name || null,
        description: values.description || null,
        amount: values.amount ? Number(values.amount) : null,
        due_date: values.due_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", activeEntityId] });
      toast.success("Invoice created");
      setShowModal(false);
    },
    onError: () => toast.error("Failed to create invoice"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "Paid") {
        const inv = invoices.find((i) => i.id === id);
        updates.paid_amount = inv?.amount ?? 0;
      }
      const { error } = await supabase.from("invoices").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices", activeEntityId] }),
  });

  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices", activeEntityId] }),
  });

  const totalOutstanding = invoices
    .filter((i) => i.status !== "Paid" && i.status !== "Void")
    .reduce((sum, i) => sum + (i.amount ?? 0), 0);

  const columns: ColumnDef<Invoice, unknown>[] = [
    {
      accessorKey: "invoice_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Invoice #" />,
      cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.getValue("invoice_number") ?? "—"}</span>,
    },
    {
      accessorKey: "vendor_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vendor" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("vendor_name") ?? "—"}</span>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("description") ?? "—"}</span>,
    },
    {
      accessorKey: "invoice_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => <span>{formatDate(row.getValue("invoice_date"))}</span>,
    },
    {
      accessorKey: "due_date",
      header: "Due",
      cell: ({ row }) => {
        const val = row.getValue("due_date") as string | null;
        if (!val) return "—";
        const overdue = new Date(val) < new Date();
        return <span className={overdue ? "text-destructive" : ""}>{formatDate(val)}</span>;
      },
    },
    {
      accessorKey: "amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => {
        const val = row.getValue("amount") as number | null;
        return val ? <span className="font-medium">{formatCurrency(val)}</span> : "—";
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const inv = row.original;
        return (
          <div className="flex items-center gap-1">
            {inv.status === "Draft" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateStatus.mutate({ id: inv.id, status: "Approved" });
                }}
                className="rounded px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-info-bg"
              >
                Approve
              </button>
            )}
            {inv.status === "Approved" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateStatus.mutate({ id: inv.id, status: "Paid" });
                }}
                className="rounded px-2 py-1 text-xs font-medium text-success transition-colors hover:bg-success-bg"
              >
                Pay
              </button>
            )}
            {(inv.status === "Draft" || inv.status === "Approved") && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateStatus.mutate({ id: inv.id, status: "Void" });
                }}
                className="rounded px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive-bg"
              >
                Void
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteInvoice.mutate(inv.id);
              }}
              className="rounded p-1 text-muted transition-colors hover:text-destructive"
            ></button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Invoices</h1>
          <p className="mt-0.5 text-sm text-muted">
            {invoices.length} invoices · Outstanding: {formatCurrency(totalOutstanding)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + New Invoice
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : invoices.length === 0 ? (
        <EmptyState title="No invoices" description="Create and manage invoices with approval workflow" />
      ) : (
        <DataTable columns={columns} data={invoices} searchKey="vendor_name" searchPlaceholder="Search invoices..." />
      )}

      <CreateRecordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="New Invoice"
        fields={[
          { name: "vendor_name", label: "Vendor", type: "text", required: true, placeholder: "Vendor" },
          { name: "description", label: "Description", type: "text", placeholder: "Description" },
          { name: "amount", label: "Amount", type: "number", placeholder: "Amount" },
          { name: "due_date", label: "Due date", type: "date", placeholder: "Due date" },
        ]}
        onSubmit={async (values) => {
          await addInvoice.mutateAsync(values);
        }}
        loading={addInvoice.isPending}
      />
    </div>
  );
}

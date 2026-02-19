import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/accounting/ar")({
  component: AccountsReceivable,
});

interface Receivable {
  id: string;
  receivable_number: string | null;
  receivable_type: string;
  customer_name: string | null;
  description: string | null;
  invoice_date: string | null;
  due_date: string | null;
  amount: number | null;
  received_amount: number | null;
  status: string;
  project_name: string | null;
}

function AccountsReceivable() {
  const queryClient = useQueryClient();
  const activeEntityId = useEntityStore((s) => s.activeEntityId);

  const { data: receivables = [], isLoading } = useQuery<Receivable[]>({
    queryKey: ["ar-receivables", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("receivables").select("*").order("due_date", { ascending: true });
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const addDrawRequest = useMutation({
    mutationFn: async () => {
      const count = receivables.filter((r) => r.receivable_type === "Draw Request").length + 1;
      const { error } = await supabase.from("receivables").insert({
        receivable_number: `DR-${String(count).padStart(3, "0")}`,
        receivable_type: "Draw Request",
        invoice_date: new Date().toISOString().split("T")[0],
        status: "Draft",
        entity_id: activeEntityId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ar-receivables", activeEntityId] }),
  });

  const addInvoice = useMutation({
    mutationFn: async () => {
      const count = receivables.filter((r) => r.receivable_type === "Invoice").length + 1;
      const { error } = await supabase.from("receivables").insert({
        receivable_number: `AR-${String(count).padStart(4, "0")}`,
        receivable_type: "Invoice",
        invoice_date: new Date().toISOString().split("T")[0],
        status: "Draft",
        entity_id: activeEntityId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ar-receivables", activeEntityId] }),
  });

  const totalReceivable = receivables
    .filter((r) => r.status !== "Collected" && r.status !== "Void")
    .reduce((sum, r) => sum + ((r.amount ?? 0) - (r.received_amount ?? 0)), 0);

  const columns: ColumnDef<Receivable, unknown>[] = [
    {
      accessorKey: "receivable_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="#" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium">{row.getValue("receivable_number") ?? "—"}</span>
      ),
    },
    {
      accessorKey: "receivable_type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("receivable_type") as string;
        return (
          <span className={`text-xs font-medium ${type === "Draw Request" ? "text-primary" : "text-amber-700"}`}>
            {type}
          </span>
        );
      },
    },
    {
      accessorKey: "customer_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("customer_name") ?? "—"}</span>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("description") ?? "—"}</span>,
    },
    {
      accessorKey: "due_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Due" />,
      cell: ({ row }) => {
        const val = row.getValue("due_date") as string | null;
        if (!val) return "—";
        const overdue = new Date(val) < new Date() && row.original.status !== "Collected";
        return <span className={overdue ? "font-medium text-destructive" : ""}>{formatDate(val)}</span>;
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
      id: "balance",
      header: "Balance",
      cell: ({ row }) => {
        const amount = row.original.amount ?? 0;
        const received = row.original.received_amount ?? 0;
        const balance = amount - received;
        return balance > 0 ? (
          <span className="text-destructive">{formatCurrency(balance)}</span>
        ) : (
          <span className="text-success">Paid</span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Accounts Receivable</h1>
          <p className="mt-0.5 text-sm text-muted">
            {receivables.length} items · Outstanding: {formatCurrency(totalReceivable)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => addDrawRequest.mutate()}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
            New Draw Request
          </button>
          <button
            type="button"
            onClick={() => addInvoice.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            New Invoice
          </button>
        </div>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : receivables.length === 0 ? (
        <EmptyState title="No receivables" description="Track draw requests and invoices for accounts receivable" />
      ) : (
        <DataTable
          columns={columns}
          data={receivables}
          searchKey="customer_name"
          searchPlaceholder="Search receivables..."
        />
      )}
    </div>
  );
}

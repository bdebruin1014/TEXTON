import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/accounting/ap")({
  component: AccountsPayable,
});

interface Bill {
  id: string;
  bill_number: string | null;
  vendor_name: string | null;
  bill_date: string | null;
  due_date: string | null;
  amount: number | null;
  paid_amount: number | null;
  status: string;
  description: string | null;
  job_name: string | null;
  cost_code: string | null;
}

function AccountsPayable() {
  const queryClient = useQueryClient();
  const activeEntityId = useEntityStore((s) => s.activeEntityId);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: bills = [], isLoading } = useQuery<Bill[]>({
    queryKey: ["ap-bills", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("bills").select("*").order("due_date", { ascending: true });
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const addBill = useMutation({
    mutationFn: async () => {
      const count = bills.length + 1;
      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("bills").insert({
        bill_number: `BILL-${String(count).padStart(4, "0")}`,
        bill_date: today,
        status: "Pending",
        entity_id: activeEntityId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ap-bills", activeEntityId] }),
  });

  const bulkAction = useMutation({
    mutationFn: async (status: string) => {
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from("bills").update({ status }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["ap-bills", activeEntityId] });
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalPayable = bills
    .filter((b) => b.status !== "Paid" && b.status !== "Void")
    .reduce((sum, b) => sum + (b.amount ?? 0), 0);
  const overdueCount = bills.filter(
    (b) => b.due_date && new Date(b.due_date) < new Date() && b.status !== "Paid" && b.status !== "Void",
  ).length;

  const columns: ColumnDef<Bill, unknown>[] = [
    {
      id: "select",
      header: () => <span className="text-xs text-muted">Select</span>,
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.original.id)}
          onChange={() => toggleSelect(row.original.id)}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-border"
        />
      ),
      size: 40,
    },
    {
      accessorKey: "bill_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Bill #" />,
      cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.getValue("bill_number") ?? "—"}</span>,
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
      accessorKey: "due_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Due" />,
      cell: ({ row }) => {
        const val = row.getValue("due_date") as string | null;
        if (!val) return "—";
        const overdue = new Date(val) < new Date() && row.original.status !== "Paid";
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
      accessorKey: "job_name",
      header: "Job",
      cell: ({ row }) => <span className="text-xs text-muted">{row.getValue("job_name") ?? "—"}</span>,
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
          <h1 className="text-xl font-semibold text-foreground">Accounts Payable</h1>
          <p className="mt-0.5 text-sm text-muted">
            {bills.length} bills · Payable: {formatCurrency(totalPayable)}
            {overdueCount > 0 && <span className="text-destructive"> · {overdueCount} overdue</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <button
                type="button"
                onClick={() => bulkAction.mutate("Approved")}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-blue-50"
              >
                Approve Selected ({selectedIds.size})
              </button>
              <button
                type="button"
                onClick={() => bulkAction.mutate("Paid")}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-success transition-colors hover:bg-green-50"
              >
                Pay Selected ({selectedIds.size})
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => addBill.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            New Bill
          </button>
        </div>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : bills.length === 0 ? (
        <EmptyState title="No bills" description="Track accounts payable with approval and payment workflow" />
      ) : (
        <DataTable columns={columns} data={bills} searchKey="vendor_name" searchPlaceholder="Search bills..." />
      )}
    </div>
  );
}

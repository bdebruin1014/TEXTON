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

export const Route = createFileRoute("/_authenticated/investors/capital-calls")({
  component: CapitalCalls,
});

interface CapitalCall {
  id: string;
  call_number: string | null;
  fund_name: string | null;
  fund_id: string | null;
  call_date: string | null;
  due_date: string | null;
  total_amount: number | null;
  amount_received: number | null;
  purpose: string | null;
  status: string;
}

function CapitalCalls() {
  const queryClient = useQueryClient();

  const { data: calls = [], isLoading } = useQuery<CapitalCall[]>({
    queryKey: ["capital-calls"],
    queryFn: async () => {
      const { data, error } = await supabase.from("capital_calls").select("*").order("call_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addCall = useMutation({
    mutationFn: async () => {
      const count = calls.length + 1;
      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("capital_calls").insert({
        call_number: `CC-${String(count).padStart(4, "0")}`,
        call_date: today,
        status: "Draft",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["capital-calls"] }),
  });

  const issueNotice = useMutation({
    mutationFn: async (callId: string) => {
      const { error } = await supabase.from("capital_calls").update({ status: "Issued" }).eq("id", callId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["capital-calls"] }),
  });

  const totalCalled = calls.reduce((sum, c) => sum + (c.total_amount ?? 0), 0);
  const totalReceived = calls.reduce((sum, c) => sum + (c.amount_received ?? 0), 0);

  const columns: ColumnDef<CapitalCall, unknown>[] = [
    {
      accessorKey: "call_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Call #" />,
      cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.getValue("call_number") ?? "—"}</span>,
    },
    {
      accessorKey: "fund_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fund" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("fund_name") ?? "—"}</span>,
    },
    {
      accessorKey: "call_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Call Date" />,
      cell: ({ row }) => {
        const val = row.getValue("call_date") as string | null;
        return val ? formatDate(val) : "—";
      },
    },
    {
      accessorKey: "due_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Due Date" />,
      cell: ({ row }) => {
        const val = row.getValue("due_date") as string | null;
        if (!val) return "—";
        const overdue = new Date(val) < new Date() && row.original.status !== "Funded";
        return <span className={overdue ? "font-medium text-destructive" : ""}>{formatDate(val)}</span>;
      },
    },
    {
      accessorKey: "total_amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => {
        const val = row.getValue("total_amount") as number | null;
        return val != null ? <span className="font-medium">{formatCurrency(val)}</span> : "—";
      },
    },
    {
      accessorKey: "amount_received",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Received" />,
      cell: ({ row }) => {
        const val = row.getValue("amount_received") as number | null;
        return val != null ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "purpose",
      header: "Purpose",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("purpose") ?? "—"}</span>,
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
        row.original.status === "Draft" ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              issueNotice.mutate(row.original.id);
            }}
            className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-info-bg"
          >
            
            Issue Notice
          </button>
        ) : null,
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Capital Calls</h1>
          <p className="mt-0.5 text-sm text-muted">
            {calls.length} calls · Called: {formatCurrency(totalCalled)} · Received: {formatCurrency(totalReceived)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => addCall.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          +
          New Capital Call
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : calls.length === 0 ? (
        <EmptyState
          title="No capital calls"
          description="Issue capital calls to fund investors with allocation breakdowns"
        />
      ) : (
        <DataTable columns={columns} data={calls} searchKey="fund_name" searchPlaceholder="Search capital calls..." />
      )}
    </div>
  );
}

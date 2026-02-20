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

export const Route = createFileRoute("/_authenticated/construction/$jobId/subcontracts")({
  component: Subcontracts,
});

interface Subcontract {
  id: string;
  contract_number: string | null;
  subcontractor_name: string | null;
  scope: string | null;
  amount: number | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  cost_code: string | null;
}

function Subcontracts() {
  const { jobId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: subs = [], isLoading } = useQuery<Subcontract[]>({
    queryKey: ["subcontracts", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subcontracts")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addSub = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("subcontracts").insert({
        job_id: jobId,
        status: "Draft",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subcontracts", jobId] }),
  });

  const totalAmount = subs.reduce((sum, s) => sum + (s.amount ?? 0), 0);

  const columns: ColumnDef<Subcontract, unknown>[] = [
    {
      accessorKey: "contract_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Contract #" />,
      cell: ({ row }) => <span className="font-medium font-mono">{row.getValue("contract_number") ?? "—"}</span>,
    },
    {
      accessorKey: "subcontractor_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Subcontractor" />,
    },
    {
      accessorKey: "scope",
      header: "Scope",
      cell: ({ row }) => <span className="text-muted">{row.getValue("scope") ?? "—"}</span>,
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
      accessorKey: "start_date",
      header: "Start",
      cell: ({ row }) => formatDate(row.getValue("start_date")),
    },
    {
      accessorKey: "end_date",
      header: "End",
      cell: ({ row }) => formatDate(row.getValue("end_date")),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Subcontracts</h2>
          {subs.length > 0 && (
            <p className="mt-0.5 text-sm text-muted">
              {subs.length} contracts · {formatCurrency(totalAmount)} total
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => addSub.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + New Subcontract
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : subs.length === 0 ? (
        <EmptyState title="No subcontracts" description="Create subcontracts to manage trade relationships" />
      ) : (
        <DataTable
          columns={columns}
          data={subs}
          searchKey="subcontractor_name"
          searchPlaceholder="Search subcontracts..."
        />
      )}
    </div>
  );
}

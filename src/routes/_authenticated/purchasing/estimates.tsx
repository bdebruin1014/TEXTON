import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight, Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/purchasing/estimates")({
  component: Estimates,
});

interface Estimate {
  id: string;
  estimate_number: string | null;
  project_name: string | null;
  job_name: string | null;
  description: string | null;
  total_amount: number | null;
  status: string;
  created_at: string;
}

function Estimates() {
  const queryClient = useQueryClient();
  const activeEntityId = useEntityStore((s) => s.activeEntityId);

  const { data: estimates = [], isLoading } = useQuery<Estimate[]>({
    queryKey: ["estimates", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("estimates").select("*").order("created_at", { ascending: false });
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const addEstimate = useMutation({
    mutationFn: async () => {
      const count = estimates.length + 1;
      const { error } = await supabase.from("estimates").insert({
        estimate_number: `EST-${String(count).padStart(4, "0")}`,
        status: "Draft",
        entity_id: activeEntityId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["estimates", activeEntityId] }),
  });

  const convertToBudget = useMutation({
    mutationFn: async (estimateId: string) => {
      const { error } = await supabase.from("estimates").update({ status: "Converted" }).eq("id", estimateId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["estimates", activeEntityId] }),
  });

  const totalEstimated = estimates.reduce((sum, e) => sum + (e.total_amount ?? 0), 0);

  const columns: ColumnDef<Estimate, unknown>[] = [
    {
      accessorKey: "estimate_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estimate #" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium">{row.getValue("estimate_number") ?? "—"}</span>
      ),
    },
    {
      accessorKey: "project_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Project" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("project_name") ?? "—"}</span>,
    },
    {
      accessorKey: "job_name",
      header: "Job",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("job_name") ?? "—"}</span>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("description") ?? "—"}</span>,
    },
    {
      accessorKey: "total_amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
      cell: ({ row }) => {
        const val = row.getValue("total_amount") as number | null;
        return val != null ? <span className="font-medium">{formatCurrency(val)}</span> : "—";
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      cell: ({ row }) => formatDate(row.getValue("created_at")),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.status === "Draft" || row.original.status === "Approved" ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              convertToBudget.mutate(row.original.id);
            }}
            className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-blue-50"
          >
            <ArrowRight className="h-3 w-3" />
            Convert to Budget
          </button>
        ) : null,
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Estimates</h1>
          <p className="mt-0.5 text-sm text-muted">
            {estimates.length} estimates · Total: {formatCurrency(totalEstimated)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => addEstimate.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          New Estimate
        </button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : estimates.length === 0 ? (
        <EmptyState title="No estimates" description="Create estimates by cost code for projects and jobs" />
      ) : (
        <DataTable
          columns={columns}
          data={estimates}
          searchKey="project_name"
          searchPlaceholder="Search estimates..."
        />
      )}
    </div>
  );
}

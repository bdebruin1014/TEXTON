import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";

import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/construction/$jobId/selections")({
  component: Selections,
});

interface Selection {
  id: string;
  category: string | null;
  item_name: string;
  selected_option: string | null;
  allowance: number | null;
  actual_cost: number | null;
  status: string;
  notes: string | null;
}

function Selections() {
  const { jobId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: selections = [], isLoading } = useQuery<Selection[]>({
    queryKey: ["selections", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("selections")
        .select("*")
        .eq("job_id", jobId)
        .order("category", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addSelection = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("selections").insert({
        job_id: jobId,
        item_name: "New Selection",
        status: "Pending",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["selections", jobId] }),
  });

  const deleteSelection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("selections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["selections", jobId] }),
  });

  const columns: ColumnDef<Selection, unknown>[] = [
    {
      accessorKey: "category",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
      cell: ({ row }) => <span className="text-xs text-muted">{row.getValue("category") ?? "—"}</span>,
    },
    {
      accessorKey: "item_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Item" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("item_name")}</span>,
    },
    {
      accessorKey: "selected_option",
      header: "Selection",
      cell: ({ row }) => <span className="text-muted">{row.getValue("selected_option") ?? "—"}</span>,
    },
    {
      accessorKey: "allowance",
      header: "Allowance",
      cell: ({ row }) => {
        const val = row.getValue("allowance") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "actual_cost",
      header: "Actual",
      cell: ({ row }) => {
        const val = row.getValue("actual_cost") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      id: "variance",
      header: "Variance",
      cell: ({ row }) => {
        const allowance = row.original.allowance ?? 0;
        const actual = row.original.actual_cost ?? 0;
        if (!allowance && !actual) return "—";
        const variance = allowance - actual;
        return <span className={variance < 0 ? "text-destructive" : "text-success"}>{formatCurrency(variance)}</span>;
      },
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
            deleteSelection.mutate(row.original.id);
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
        <h2 className="text-lg font-semibold text-foreground">Selections</h2>
        <button
          type="button"
          onClick={() => addSelection.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          + Add Selection
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : selections.length === 0 ? (
        <EmptyState title="No selections" description="Track buyer option selections and allowances" />
      ) : (
        <DataTable columns={columns} data={selections} searchKey="item_name" searchPlaceholder="Search selections..." />
      )}
    </div>
  );
}

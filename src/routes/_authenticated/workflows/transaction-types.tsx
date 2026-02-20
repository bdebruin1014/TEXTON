import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/workflows/transaction-types")({
  component: TransactionTypes,
});

interface TransactionType {
  id: string;
  name: string;
  description: string | null;
  project_type: string | null;
  workflow_count: number | null;
  status: string;
}

function TransactionTypes() {
  const queryClient = useQueryClient();

  const { data: types = [], isLoading } = useQuery<TransactionType[]>({
    queryKey: ["transaction-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("transaction_types").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addType = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("transaction_types").insert({
        name: "New Transaction Type",
        status: "Active",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transaction-types"] }),
  });

  const columns: ColumnDef<TransactionType, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "project_type",
      header: "Maps To",
      cell: ({ row }) => {
        const val = row.getValue("project_type") as string | null;
        return val ? (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">{val}</span>
        ) : (
          "—"
        );
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("description") ?? "—"}</span>,
    },
    {
      accessorKey: "workflow_count",
      header: "Workflows",
      cell: ({ row }) => row.getValue("workflow_count") ?? 0,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const color = status === "Active" ? "bg-success-bg text-success-text" : "bg-accent text-muted-foreground";
        return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{status}</span>;
      },
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Transaction Types</h1>
          <p className="mt-0.5 text-sm text-muted">
            Maps to project types: Scattered Lot, Community Dev, Lot Dev, Lot Purchase
          </p>
        </div>
        <button
          type="button"
          onClick={() => addType.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          +
          Add Transaction Type
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : types.length === 0 ? (
        <EmptyState title="No transaction types" description="Define transaction types that map to project types" />
      ) : (
        <DataTable columns={columns} data={types} searchKey="name" searchPlaceholder="Search types..." />
      )}
    </div>
  );
}

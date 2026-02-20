import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";

import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/operations/rch-contracts/$contractId/units")({
  component: ContractUnits,
});

interface ContractUnit {
  id: string;
  contract_id: string;
  lot_number: string | null;
  plan_name: string | null;
  elevation: string | null;
  phase: string | null;
  sort_order: number;
  created_at: string;
}

function ContractUnits() {
  const { contractId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: units = [], isLoading } = useQuery<ContractUnit[]>({
    queryKey: ["rch-contract-units", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rch_contract_units")
        .select("*")
        .eq("contract_id", contractId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addUnit = useMutation({
    mutationFn: async () => {
      const nextOrder = units.length > 0 ? Math.max(...units.map((u) => u.sort_order)) + 1 : 1;
      const { error } = await supabase.from("rch_contract_units").insert({
        contract_id: contractId,
        lot_number: `Lot ${nextOrder}`,
        sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rch-contract-units", contractId] }),
  });

  const deleteUnit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rch_contract_units").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rch-contract-units", contractId] }),
  });

  const columns: ColumnDef<ContractUnit, unknown>[] = [
    {
      accessorKey: "lot_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Lot Number" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("lot_number") ?? "---"}</span>,
    },
    {
      accessorKey: "plan_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Plan Name" />,
      cell: ({ row }) => <span className="text-muted">{row.getValue("plan_name") ?? "---"}</span>,
    },
    {
      accessorKey: "elevation",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Elevation" />,
      cell: ({ row }) => <span className="text-muted">{row.getValue("elevation") ?? "---"}</span>,
    },
    {
      accessorKey: "phase",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Phase" />,
      cell: ({ row }) => <span className="text-muted">{row.getValue("phase") ?? "---"}</span>,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteUnit.mutate(row.original.id);
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
          <h2 className="text-lg font-semibold text-foreground">Contract Units</h2>
          {units.length > 0 && <p className="mt-0.5 text-sm text-muted">{units.length} units</p>}
        </div>
        <button
          type="button"
          onClick={() => addUnit.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Add Unit
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : units.length === 0 ? (
        <EmptyState
          title="No units added"
          description="Add units (lots) to this contract"
          action={
            <button
              type="button"
              onClick={() => addUnit.mutate()}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Add Unit
            </button>
          }
        />
      ) : (
        <DataTable columns={columns} data={units} searchKey="lot_number" searchPlaceholder="Search units..." />
      )}
    </div>
  );
}

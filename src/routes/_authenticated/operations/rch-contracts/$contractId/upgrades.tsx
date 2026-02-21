import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";

import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/operations/rch-contracts/$contractId/upgrades")({
  component: ContractUpgrades,
});

interface ContractUpgrade {
  id: string;
  contract_id: string;
  unit_lot_number: string | null;
  upgrade_category: string | null;
  upgrade_name: string | null;
  description: string | null;
  cost: number | null;
  price: number | null;
  created_at: string;
}

function ContractUpgrades() {
  const { contractId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: upgrades = [], isLoading } = useQuery<ContractUpgrade[]>({
    queryKey: ["rch-contract-upgrades", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rch_contract_upgrades")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addUpgrade = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("rch_contract_upgrades").insert({
        contract_id: contractId,
        upgrade_name: "New Upgrade",
        cost: 0,
        price: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rch-contract-upgrades", contractId] }),
  });

  const deleteUpgrade = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rch_contract_upgrades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rch-contract-upgrades", contractId] }),
  });

  const totalCost = upgrades.reduce((sum, u) => sum + (u.cost ?? 0), 0);
  const totalPrice = upgrades.reduce((sum, u) => sum + (u.price ?? 0), 0);

  const columns: ColumnDef<ContractUpgrade, unknown>[] = [
    {
      accessorKey: "unit_lot_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Unit / Lot" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("unit_lot_number") ?? "---"}</span>,
    },
    {
      accessorKey: "upgrade_category",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
      cell: ({ row }) => <span className="text-muted">{row.getValue("upgrade_category") ?? "---"}</span>,
    },
    {
      accessorKey: "upgrade_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Upgrade" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("upgrade_name") ?? "---"}</span>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="max-w-[200px] truncate text-sm text-muted">{row.getValue("description") ?? "---"}</span>
      ),
    },
    {
      accessorKey: "cost",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cost" />,
      cell: ({ row }) => {
        const val = row.getValue("cost") as number | null;
        return val ? formatCurrency(val) : "---";
      },
    },
    {
      accessorKey: "price",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Price" />,
      cell: ({ row }) => {
        const val = row.getValue("price") as number | null;
        return val ? formatCurrency(val) : "---";
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteUpgrade.mutate(row.original.id);
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
          <h2 className="text-lg font-semibold text-foreground">Upgrades</h2>
          {upgrades.length > 0 && (
            <p className="mt-0.5 text-sm text-muted">
              {upgrades.length} upgrades &middot; Cost: {formatCurrency(totalCost)} &middot; Price:{" "}
              {formatCurrency(totalPrice)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => addUpgrade.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Add Upgrade
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : upgrades.length === 0 ? (
        <EmptyState
          title="No upgrades"
          description="Add per-unit upgrade selections for this contract"
          action={
            <button
              type="button"
              onClick={() => addUpgrade.mutate()}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Add Upgrade
            </button>
          }
        />
      ) : (
        <DataTable columns={columns} data={upgrades} searchKey="upgrade_name" searchPlaceholder="Search upgrades..." />
      )}
    </div>
  );
}

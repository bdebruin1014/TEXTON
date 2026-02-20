import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/operations/rch-contracts/$contractId/lot-conditions")({
  component: LotConditions,
});

interface LotCondition {
  id: string;
  contract_id: string;
  unit_lot_number: string | null;
  assigned_cm: string | null;
  inspection_date: string | null;
  notes: string | null;
  site_specific_cost: number | null;
  created_at: string;
}

function LotConditions() {
  const { contractId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: conditions = [], isLoading } = useQuery<LotCondition[]>({
    queryKey: ["rch-contract-lot-conditions", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rch_contract_lot_conditions")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addCondition = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("rch_contract_lot_conditions").insert({
        contract_id: contractId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rch-contract-lot-conditions", contractId] }),
  });

  const deleteCondition = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rch_contract_lot_conditions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rch-contract-lot-conditions", contractId] }),
  });

  const totalSiteSpecific = conditions.reduce((sum, c) => sum + (c.site_specific_cost ?? 0), 0);

  const columns: ColumnDef<LotCondition, unknown>[] = [
    {
      accessorKey: "unit_lot_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Unit" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("unit_lot_number") ?? "---"}</span>,
    },
    {
      accessorKey: "assigned_cm",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Assigned CM" />,
      cell: ({ row }) => <span className="text-muted">{row.getValue("assigned_cm") ?? "---"}</span>,
    },
    {
      accessorKey: "inspection_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => formatDate(row.getValue("inspection_date")),
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => (
        <span className="max-w-[250px] truncate text-sm text-muted">{row.getValue("notes") ?? "---"}</span>
      ),
    },
    {
      accessorKey: "site_specific_cost",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Site-Specific Cost" />,
      cell: ({ row }) => {
        const val = row.getValue("site_specific_cost") as number | null;
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
            deleteCondition.mutate(row.original.id);
          }}
          className="rounded p-1 text-muted transition-colors hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Lot Conditions</h2>
          {conditions.length > 0 && (
            <p className="mt-0.5 text-sm text-muted">
              {conditions.length} reports &middot; Site costs: {formatCurrency(totalSiteSpecific)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => addCondition.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Add Lot Condition
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : conditions.length === 0 ? (
        <EmptyState
          title="No lot conditions"
          description="Add per-unit lot condition inspection reports"
          action={
            <button
              type="button"
              onClick={() => addCondition.mutate()}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              Add Lot Condition
            </button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={conditions}
          searchKey="unit_lot_number"
          searchPlaceholder="Search by unit..."
        />
      )}
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";

import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/admin/pricing-exclusions")({
  component: PricingExclusions,
});

interface PricingExclusion {
  id: string;
  category: string | null;
  description: string;
  notes: string | null;
  sort_order: number;
}

function PricingExclusions() {
  const queryClient = useQueryClient();

  const { data: exclusions = [], isLoading } = useQuery<PricingExclusion[]>({
    queryKey: ["pricing-exclusions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pricing_exclusions").select("*").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addExclusion = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pricing_exclusions").insert({
        description: "New exclusion",
        sort_order: exclusions.length + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pricing-exclusions"] }),
  });

  const deleteExclusion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pricing_exclusions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pricing-exclusions"] }),
  });

  const columns: ColumnDef<PricingExclusion, unknown>[] = [
    {
      accessorKey: "category",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
      cell: ({ row }) => <span className="text-sm font-medium">{row.getValue("category") ?? "—"}</span>,
    },
    {
      accessorKey: "description",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("description")}</span>,
    },
    {
      accessorKey: "notes",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Notes" />,
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("notes") ?? "—"}</span>,
    },
    {
      accessorKey: "sort_order",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Order" />,
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("sort_order")}</span>,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteExclusion.mutate(row.original.id);
          }}
          className="rounded p-1 text-muted transition-colors hover:text-destructive"
          aria-label="Delete exclusion"
        >
          <span className="text-xs font-medium">Delete</span>
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Pricing Exclusions</h1>
          <p className="mt-0.5 text-sm text-muted">{exclusions.length} pricing exclusion rules</p>
        </div>
        <button
          type="button"
          onClick={() => addExclusion.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Add Exclusion
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : exclusions.length === 0 ? (
        <EmptyState
          title="No pricing exclusions"
          description="Add items or costs to exclude from pricing calculations"
        />
      ) : (
        <DataTable
          columns={columns}
          data={exclusions}
          searchKey="description"
          searchPlaceholder="Search exclusions..."
        />
      )}
    </div>
  );
}

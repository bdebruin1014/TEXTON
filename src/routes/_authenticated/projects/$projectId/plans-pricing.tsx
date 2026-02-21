import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/$projectId/plans-pricing")({
  component: PlansPricing,
});

interface FloorPlan {
  id: string;
  name: string;
  bed_count: number | null;
  bath_count: number | null;
  heated_sqft: number | null;
  base_sale_price: number | null;
  base_construction_cost: number | null;
}

function PlansPricing() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading } = useQuery<FloorPlan[]>({
    queryKey: ["floor-plans", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("floor_plans")
        .select("*")
        .eq("project_id", projectId)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addPlan = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("floor_plans").insert({
        project_id: projectId,
        name: "New Plan",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["floor-plans", projectId] }),
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("floor_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["floor-plans", projectId] }),
  });

  const avgPrice = plans.length > 0 ? plans.reduce((sum, p) => sum + (p.base_sale_price ?? 0), 0) / plans.length : 0;

  const columns: ColumnDef<FloorPlan, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Plan Name" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "bed_count",
      header: "Beds",
    },
    {
      accessorKey: "bath_count",
      header: "Baths",
    },
    {
      accessorKey: "heated_sqft",
      header: "Heated SF",
      cell: ({ row }) => {
        const val = row.getValue("heated_sqft") as number | null;
        return val ? `${val.toLocaleString()}` : "—";
      },
    },
    {
      accessorKey: "base_sale_price",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Base Price" />,
      cell: ({ row }) => {
        const val = row.getValue("base_sale_price") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "base_construction_cost",
      header: "Build Cost",
      cell: ({ row }) => {
        const val = row.getValue("base_construction_cost") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      id: "margin",
      header: "Margin",
      cell: ({ row }) => {
        const price = row.original.base_sale_price;
        const cost = row.original.base_construction_cost;
        if (!price || !cost) return "—";
        const margin = ((price - cost) / price) * 100;
        return `${margin.toFixed(1)}%`;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deletePlan.mutate(row.original.id);
          }}
          className="rounded p-1 text-muted transition-colors hover:text-destructive"
        ></button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Home Plans & Pricing</h2>
          {plans.length > 0 && (
            <p className="mt-0.5 text-sm text-muted">
              {plans.length} plans · Avg {formatCurrency(avgPrice)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary-50"
          >
            Edit Pricing
          </button>
          <button
            type="button"
            onClick={() => addPlan.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
          >
            + Add Plan
          </button>
        </div>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : plans.length === 0 ? (
        <EmptyState title="No floor plans" description="Add floor plans to define your product mix and pricing" />
      ) : (
        <DataTable columns={columns} data={plans} searchKey="name" searchPlaceholder="Search plans..." />
      )}
    </div>
  );
}

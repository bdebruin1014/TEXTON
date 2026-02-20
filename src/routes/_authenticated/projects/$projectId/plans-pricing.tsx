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
  plan_name: string;
  bedrooms: number | null;
  bathrooms: number | null;
  square_footage: number | null;
  base_price: number | null;
  construction_cost: number | null;
  lot_count: number | null;
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
        .order("plan_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addPlan = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("floor_plans").insert({
        project_id: projectId,
        plan_name: "New Plan",
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

  const totalUnits = plans.reduce((sum, p) => sum + (p.lot_count ?? 0), 0);
  const avgPrice = plans.length > 0 ? plans.reduce((sum, p) => sum + (p.base_price ?? 0), 0) / plans.length : 0;

  const columns: ColumnDef<FloorPlan, unknown>[] = [
    {
      accessorKey: "plan_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Plan Name" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("plan_name")}</span>,
    },
    {
      accessorKey: "bedrooms",
      header: "Beds",
    },
    {
      accessorKey: "bathrooms",
      header: "Baths",
    },
    {
      accessorKey: "square_footage",
      header: "Sq Ft",
      cell: ({ row }) => {
        const val = row.getValue("square_footage") as number | null;
        return val ? `${val.toLocaleString()}` : "—";
      },
    },
    {
      accessorKey: "base_price",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Base Price" />,
      cell: ({ row }) => {
        const val = row.getValue("base_price") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "construction_cost",
      header: "Build Cost",
      cell: ({ row }) => {
        const val = row.getValue("construction_cost") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      id: "margin",
      header: "Margin",
      cell: ({ row }) => {
        const price = row.original.base_price;
        const cost = row.original.construction_cost;
        if (!price || !cost) return "—";
        const margin = ((price - cost) / price) * 100;
        return `${margin.toFixed(1)}%`;
      },
    },
    {
      accessorKey: "lot_count",
      header: "Units",
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
        >
          
        </button>
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
              {plans.length} plans · {totalUnits} units · Avg {formatCurrency(avgPrice)}
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
            +
            Add Plan
          </button>
        </div>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : plans.length === 0 ? (
        <EmptyState title="No floor plans" description="Add floor plans to define your product mix and pricing" />
      ) : (
        <DataTable columns={columns} data={plans} searchKey="plan_name" searchPlaceholder="Search plans..." />
      )}
    </div>
  );
}

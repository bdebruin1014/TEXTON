import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/floor-plans")({
  component: FloorPlansAdmin,
});

interface FloorPlan {
  id: string;
  name: string;
  elevation: string | null;
  heated_sqft: number | null;
  total_sqft: number | null;
  bed_count: number | null;
  bath_count: number | null;
  stories: number | null;
  garage_bays: number | null;
  base_construction_cost: number | null;
  base_sale_price: number | null;
  status: string;
}

function FloorPlansAdmin() {
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading } = useQuery<FloorPlan[]>({
    queryKey: ["admin-floor-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("floor_plans").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addPlan = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("floor_plans").insert({
        name: "New Floor Plan",
        status: "Active",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-floor-plans"] }),
  });

  const columns: ColumnDef<FloorPlan, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Plan Name" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "elevation",
      header: "Elevation",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("elevation") ?? "—"}</span>,
    },
    {
      accessorKey: "heated_sqft",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Heated SF" />,
      cell: ({ row }) => {
        const val = row.getValue("heated_sqft") as number | null;
        return val ? val.toLocaleString() : "—";
      },
    },
    {
      accessorKey: "total_sqft",
      header: "Total SF",
      cell: ({ row }) => {
        const val = row.getValue("total_sqft") as number | null;
        return val ? val.toLocaleString() : "—";
      },
    },
    {
      accessorKey: "bed_count",
      header: "Beds",
      cell: ({ row }) => row.getValue("bed_count") ?? "—",
    },
    {
      accessorKey: "bath_count",
      header: "Baths",
      cell: ({ row }) => row.getValue("bath_count") ?? "—",
    },
    {
      accessorKey: "stories",
      header: "Stories",
      cell: ({ row }) => row.getValue("stories") ?? "—",
    },
    {
      accessorKey: "garage_bays",
      header: "Garage",
      cell: ({ row }) => {
        const val = row.getValue("garage_bays") as number | null;
        return val != null ? `${val}-car` : "—";
      },
    },
    {
      accessorKey: "base_construction_cost",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Build Cost" />,
      cell: ({ row }) => {
        const val = row.getValue("base_construction_cost") as number | null;
        return val != null ? <span className="font-medium">{formatCurrency(val)}</span> : "—";
      },
    },
    {
      accessorKey: "base_sale_price",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Base Price" />,
      cell: ({ row }) => {
        const val = row.getValue("base_sale_price") as number | null;
        return val != null ? <span className="font-medium">{formatCurrency(val)}</span> : "—";
      },
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
          <h1 className="text-xl font-semibold text-foreground">Floor Plans</h1>
          <p className="mt-0.5 text-sm text-muted">{plans.length} floor plan configurations</p>
        </div>
        <button
          type="button"
          onClick={() => addPlan.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          +
          Add Floor Plan
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : plans.length === 0 ? (
        <EmptyState title="No floor plans" description="Add floor plans with specs, elevations, and base costs" />
      ) : (
        <DataTable columns={columns} data={plans} searchKey="name" searchPlaceholder="Search floor plans..." />
      )}
    </div>
  );
}

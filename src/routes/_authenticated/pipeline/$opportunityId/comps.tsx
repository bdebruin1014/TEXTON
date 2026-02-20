import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";

import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pipeline/$opportunityId/comps")({
  component: Comps,
});

interface Comp {
  id: string;
  address: string | null;
  sale_price: number | null;
  sale_date: string | null;
  square_footage: number | null;
  price_per_sqft: number | null;
  beds: number | null;
  baths: number | null;
}

function Comps() {
  const { opportunityId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: comps = [], isLoading } = useQuery<Comp[]>({
    queryKey: ["comps", opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comparable_sales")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addComp = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("comparable_sales").insert({
        opportunity_id: opportunityId,
        address: "New Comp",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comps", opportunityId] }),
  });

  const deleteComp = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comparable_sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comps", opportunityId] }),
  });

  const columns: ColumnDef<Comp, unknown>[] = [
    {
      accessorKey: "address",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Address" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("address") ?? "—"}</span>,
    },
    {
      accessorKey: "sale_price",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sale Price" />,
      cell: ({ row }) => {
        const val = row.getValue("sale_price") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "sale_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => formatDate(row.getValue("sale_date")),
    },
    {
      accessorKey: "square_footage",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sq Ft" />,
      cell: ({ row }) => {
        const val = row.getValue("square_footage") as number | null;
        return val ? val.toLocaleString() : "—";
      },
    },
    {
      accessorKey: "price_per_sqft",
      header: ({ column }) => <DataTableColumnHeader column={column} title="$/SqFt" />,
      cell: ({ row }) => {
        const val = row.getValue("price_per_sqft") as number | null;
        return val ? `$${val.toFixed(0)}` : "—";
      },
    },
    {
      accessorKey: "beds",
      header: "Beds",
    },
    {
      accessorKey: "baths",
      header: "Baths",
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteComp.mutate(row.original.id);
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
        <h2 className="text-lg font-semibold text-foreground">Comparable Sales</h2>
        <button
          type="button"
          onClick={() => addComp.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + Add Comp
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : comps.length === 0 ? (
        <EmptyState title="No comparable sales" description="Add comparable sales to support your analysis" />
      ) : (
        <DataTable columns={columns} data={comps} searchKey="address" searchPlaceholder="Search comps..." />
      )}
    </div>
  );
}

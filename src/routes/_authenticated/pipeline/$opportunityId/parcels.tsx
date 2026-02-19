import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pipeline/$opportunityId/parcels")({
  component: Parcels,
});

interface Parcel {
  id: string;
  parcel_number: string | null;
  owner_name: string | null;
  acreage: number | null;
  asking_price: number | null;
  address: string | null;
  zoning: string | null;
  notes: string | null;
}

function Parcels() {
  const { opportunityId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: parcels = [], isLoading } = useQuery<Parcel[]>({
    queryKey: ["parcels", opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcels")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addParcel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("parcels").insert({
        opportunity_id: opportunityId,
        parcel_number: "New Parcel",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["parcels", opportunityId] }),
  });

  const deleteParcel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("parcels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["parcels", opportunityId] }),
  });

  const columns: ColumnDef<Parcel, unknown>[] = [
    {
      accessorKey: "parcel_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Parcel #" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("parcel_number") ?? "—"}</span>,
    },
    {
      accessorKey: "owner_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Owner" />,
    },
    {
      accessorKey: "acreage",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Acreage" />,
      cell: ({ row }) => {
        const val = row.getValue("acreage") as number | null;
        return val ? `${val} ac` : "—";
      },
    },
    {
      accessorKey: "asking_price",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Asking Price" />,
      cell: ({ row }) => {
        const val = row.getValue("asking_price") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "zoning",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Zoning" />,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteParcel.mutate(row.original.id);
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
        <h2 className="text-lg font-semibold text-foreground">Parcels</h2>
        <button
          type="button"
          onClick={() => addParcel.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Add Parcel
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : (
        <DataTable columns={columns} data={parcels} searchKey="parcel_number" searchPlaceholder="Search parcels..." />
      )}
    </div>
  );
}

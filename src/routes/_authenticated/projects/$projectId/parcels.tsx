import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/$projectId/parcels")({
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
}

interface LotTakedown {
  id: string;
  tranche_name: string | null;
  lot_count: number | null;
  price_per_lot: number | null;
  total_price: number | null;
  scheduled_date: string | null;
  status: string;
}

function Parcels() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: parcels = [], isLoading: parcelsLoading } = useQuery<Parcel[]>({
    queryKey: ["project-parcels", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcels")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: takedowns = [], isLoading: takedownsLoading } = useQuery<LotTakedown[]>({
    queryKey: ["lot-takedowns", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lot_takedowns")
        .select("*")
        .eq("project_id", projectId)
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addParcel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("parcels").insert({
        project_id: projectId,
        parcel_number: "New Parcel",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-parcels", projectId] }),
  });

  const deleteParcel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("parcels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-parcels", projectId] }),
  });

  const addTakedown = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lot_takedowns").insert({
        project_id: projectId,
        tranche_name: "New Tranche",
        status: "Scheduled",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lot-takedowns", projectId] }),
  });

  const parcelColumns: ColumnDef<Parcel, unknown>[] = [
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
          
        </button>
      ),
    },
  ];

  const takedownColumns: ColumnDef<LotTakedown, unknown>[] = [
    {
      accessorKey: "tranche_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tranche" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("tranche_name") ?? "—"}</span>,
    },
    {
      accessorKey: "lot_count",
      header: "Lots",
    },
    {
      accessorKey: "price_per_lot",
      header: "Price/Lot",
      cell: ({ row }) => {
        const val = row.getValue("price_per_lot") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "total_price",
      header: "Total",
      cell: ({ row }) => {
        const val = row.getValue("total_price") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "scheduled_date",
      header: "Scheduled",
      cell: ({ row }) => formatDate(row.getValue("scheduled_date")),
    },
    {
      accessorKey: "status",
      header: "Status",
    },
  ];

  return (
    <div>
      {/* Parcels */}
      <div className="mb-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Parcels & Land</h2>
          <button
            type="button"
            onClick={() => addParcel.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            +
            Add Parcel
          </button>
        </div>

        {parcelsLoading ? (
          <FormSkeleton />
        ) : parcels.length === 0 ? (
          <EmptyState title="No parcels" description="Add parcels associated with this project" />
        ) : (
          <DataTable
            columns={parcelColumns}
            data={parcels}
            searchKey="parcel_number"
            searchPlaceholder="Search parcels..."
          />
        )}
      </div>

      {/* Lot Takedowns */}
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Lot Takedowns</h2>
            <p className="mt-0.5 text-sm text-muted">Scheduled lot purchase tranches</p>
          </div>
          <button
            type="button"
            onClick={() => addTakedown.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            +
            Add Takedown Tranche
          </button>
        </div>

        {takedownsLoading ? (
          <FormSkeleton />
        ) : takedowns.length === 0 ? (
          <EmptyState title="No takedowns scheduled" description="Add lot takedown tranches for this project" />
        ) : (
          <DataTable
            columns={takedownColumns}
            data={takedowns}
            searchKey="tranche_name"
            searchPlaceholder="Search tranches..."
          />
        )}
      </div>
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";

import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/municipalities")({
  component: Municipalities,
});

interface Municipality {
  id: string;
  name: string;
  county: string | null;
  state: string | null;
  water_tap: number | null;
  sewer_tap: number | null;
  gas_tap: number | null;
  permitting: number | null;
  impact: number | null;
  architect: number | null;
  engineering: number | null;
  survey: number | null;
  verified_date: string | null;
  verified_by: string | null;
}

function Municipalities() {
  const queryClient = useQueryClient();

  const { data: municipalities = [], isLoading } = useQuery<Municipality[]>({
    queryKey: ["municipalities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("municipalities").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addMunicipality = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("municipalities").insert({
        name: "New Municipality",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["municipalities"] }),
  });

  const deleteMunicipality = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("municipalities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["municipalities"] }),
  });

  const computeTotal = (row: Municipality): number => {
    return (
      (row.water_tap ?? 0) +
      (row.sewer_tap ?? 0) +
      (row.gas_tap ?? 0) +
      (row.permitting ?? 0) +
      (row.impact ?? 0) +
      (row.architect ?? 0) +
      (row.engineering ?? 0) +
      (row.survey ?? 0)
    );
  };

  const columns: ColumnDef<Municipality, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "county",
      header: ({ column }) => <DataTableColumnHeader column={column} title="County" />,
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("county") ?? "—"}</span>,
    },
    {
      accessorKey: "state",
      header: "State",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("state") ?? "—"}</span>,
    },
    {
      accessorKey: "water_tap",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Water Tap" />,
      cell: ({ row }) => formatCurrency(row.getValue("water_tap")),
    },
    {
      accessorKey: "sewer_tap",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sewer Tap" />,
      cell: ({ row }) => formatCurrency(row.getValue("sewer_tap")),
    },
    {
      accessorKey: "permitting",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Permitting" />,
      cell: ({ row }) => formatCurrency(row.getValue("permitting")),
    },
    {
      accessorKey: "impact",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Impact" />,
      cell: ({ row }) => formatCurrency(row.getValue("impact")),
    },
    {
      id: "total",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total Fees" />,
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">{formatCurrency(computeTotal(row.original))}</span>
      ),
    },
    {
      accessorKey: "verified_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Verified" />,
      cell: ({ row }) => (
        <span className="text-sm text-muted">
          {row.getValue("verified_date") ? formatDate(row.getValue("verified_date")) : "—"}
        </span>
      ),
    },
    {
      accessorKey: "verified_by",
      header: ({ column }) => <DataTableColumnHeader column={column} title="By" />,
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("verified_by") ?? "—"}</span>,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteMunicipality.mutate(row.original.id);
          }}
          className="rounded p-1 text-muted transition-colors hover:text-destructive"
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
          <h1 className="text-xl font-semibold text-foreground">Municipalities</h1>
          <p className="mt-0.5 text-sm text-muted">{municipalities.length} municipalities with fee schedules</p>
        </div>
        <button
          type="button"
          onClick={() => addMunicipality.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Add Municipality
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : municipalities.length === 0 ? (
        <EmptyState
          title="No municipalities"
          description="Add municipalities with their associated tap, permit, and impact fees"
        />
      ) : (
        <DataTable
          columns={columns}
          data={municipalities}
          searchKey="name"
          searchPlaceholder="Search municipalities..."
        />
      )}
    </div>
  );
}

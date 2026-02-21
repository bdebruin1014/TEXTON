import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { LOT_STATUSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/$projectId/lot-inventory")({
  component: LotInventory,
});

interface Lot {
  id: string;
  lot_number: string;
  status: string;
  floor_plan_name: string | null;
  lot_premium: number | null;
  base_price: number | null;
  square_footage: number | null;
  job_id: string | null;
}

function LotInventory() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: lots = [], isLoading } = useQuery<Lot[]>({
    queryKey: ["lots", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lots")
        .select("id, lot_number, status, floor_plan_name, lot_premium, base_price, square_footage, job_id")
        .eq("project_id", projectId)
        .order("lot_number", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addLot = useMutation({
    mutationFn: async () => {
      const nextNum = lots.length > 0 ? Math.max(...lots.map((l) => Number.parseInt(l.lot_number, 10) || 0)) + 1 : 1;
      const { error } = await supabase.from("lots").insert({
        project_id: projectId,
        lot_number: String(nextNum),
        status: "Future",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lots", projectId] }),
  });

  const updateLotStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("lots").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lots", projectId] }),
  });

  // Status counts for summary
  const statusCounts: Record<string, number> = {};
  for (const lot of lots) {
    statusCounts[lot.status] = (statusCounts[lot.status] ?? 0) + 1;
  }

  const columns: ColumnDef<Lot, unknown>[] = [
    {
      accessorKey: "lot_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Lot #" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("lot_number")}</span>,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const lot = row.original;
        return (
          <select
            value={lot.status}
            onChange={(e) => {
              e.stopPropagation();
              updateLotStatus.mutate({ id: lot.id, status: e.target.value });
            }}
            onClick={(e) => e.stopPropagation()}
            className="rounded border border-border bg-transparent px-2 py-1 text-xs outline-none"
          >
            {LOT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      accessorKey: "floor_plan_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Floor Plan" />,
      cell: ({ row }) => <span className="text-muted">{row.getValue("floor_plan_name") ?? "—"}</span>,
    },
    {
      accessorKey: "square_footage",
      header: "Sq Ft",
      cell: ({ row }) => {
        const val = row.getValue("square_footage") as number | null;
        return val ? `${val.toLocaleString()} sf` : "—";
      },
    },
    {
      accessorKey: "base_price",
      header: "Base Price",
      cell: ({ row }) => {
        const val = row.getValue("base_price") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "lot_premium",
      header: "Premium",
      cell: ({ row }) => {
        const val = row.getValue("lot_premium") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      id: "job",
      header: "Job",
      cell: ({ row }) => {
        const lot = row.original;
        if (lot.job_id) {
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate({ to: `/construction/${lot.job_id}` as string });
              }}
              className="text-xs text-info hover:underline"
            >
              View Job
            </button>
          );
        }
        if (lot.status === "Available" || lot.status === "Reserved") {
          return <span className="text-xs text-muted">Assign to Job</span>;
        }
        return <span className="text-xs text-muted">—</span>;
      },
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Lot Inventory</h2>
          <p className="mt-0.5 text-sm text-muted">{lots.length} lots total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary-50"
          >
            Bulk Import Lots
          </button>
          <button
            type="button"
            onClick={() => addLot.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
          >
            + Add Lot
          </button>
        </div>
      </div>

      {/* Status summary */}
      {lots.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {LOT_STATUSES.map((s) => {
            const count = statusCounts[s] ?? 0;
            if (count === 0) return null;
            return (
              <div key={s} className="flex items-center gap-1.5">
                <StatusBadge status={s} />
                <span className="text-xs text-muted">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <FormSkeleton />
      ) : lots.length === 0 ? (
        <EmptyState title="No lots" description="Add lots to this project's inventory" />
      ) : (
        <DataTable columns={columns} data={lots} searchKey="lot_number" searchPlaceholder="Search lots..." />
      )}
    </div>
  );
}

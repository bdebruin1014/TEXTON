import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";

import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/disposition/$dispositionId/offers")({
  component: Offers,
});

interface Offer {
  id: string;
  offer_date: string | null;
  buyer_name: string | null;
  offer_amount: number | null;
  financing_type: string | null;
  concessions: number | null;
  net_to_seller: number | null;
  expiration_date: string | null;
  status: string;
  notes: string | null;
}

function Offers() {
  const { dispositionId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: offers = [], isLoading } = useQuery<Offer[]>({
    queryKey: ["offers", dispositionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("disposition_id", dispositionId)
        .order("offer_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addOffer = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("offers").insert({
        disposition_id: dispositionId,
        offer_date: today,
        status: "Pending",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["offers", dispositionId] }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("offers").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["offers", dispositionId] }),
  });

  const deleteOffer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("offers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["offers", dispositionId] }),
  });

  const columns: ColumnDef<Offer, unknown>[] = [
    {
      accessorKey: "offer_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => <span className="font-medium">{formatDate(row.getValue("offer_date"))}</span>,
    },
    {
      accessorKey: "buyer_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Buyer" />,
      cell: ({ row }) => <span className="text-muted">{row.getValue("buyer_name") ?? "—"}</span>,
    },
    {
      accessorKey: "offer_amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => {
        const val = row.getValue("offer_amount") as number | null;
        return val ? <span className="font-medium">{formatCurrency(val)}</span> : "—";
      },
    },
    {
      accessorKey: "financing_type",
      header: "Financing",
      cell: ({ row }) => <span className="text-xs text-muted">{row.getValue("financing_type") ?? "—"}</span>,
    },
    {
      accessorKey: "concessions",
      header: "Concessions",
      cell: ({ row }) => {
        const val = row.getValue("concessions") as number | null;
        return val ? <span className="text-xs text-warning">{formatCurrency(val)}</span> : "—";
      },
    },
    {
      accessorKey: "net_to_seller",
      header: "Net to Seller",
      cell: ({ row }) => {
        const val = row.getValue("net_to_seller") as number | null;
        return val ? <span className="font-medium text-success">{formatCurrency(val)}</span> : "—";
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const offer = row.original;
        const isPending = offer.status === "Pending";
        return (
          <div className="flex items-center gap-1">
            {isPending && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateStatus.mutate({ id: offer.id, status: "Accepted" });
                  }}
                  className="rounded px-2 py-1 text-xs font-medium text-success transition-colors hover:bg-success-bg"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateStatus.mutate({ id: offer.id, status: "Countered" });
                  }}
                  className="rounded px-2 py-1 text-xs font-medium text-warning transition-colors hover:bg-warning-bg"
                >
                  Counter
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateStatus.mutate({ id: offer.id, status: "Rejected" });
                  }}
                  className="rounded px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive-bg"
                >
                  Reject
                </button>
              </>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteOffer.mutate(offer.id);
              }}
              className="rounded p-1 text-muted transition-colors hover:text-destructive"
            >
              Delete
            </button>
          </div>
        );
      },
    },
  ];

  const acceptedCount = offers.filter((o) => o.status === "Accepted").length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Offers</h2>
          {offers.length > 0 && (
            <p className="mt-0.5 text-sm text-muted">
              {offers.length} offers · {acceptedCount} accepted
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => addOffer.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + Add Offer
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : offers.length === 0 ? (
        <EmptyState title="No offers" description="Track buyer offers with Accept, Counter, and Reject actions" />
      ) : (
        <DataTable columns={columns} data={offers} searchKey="buyer_name" searchPlaceholder="Search offers..." />
      )}
    </div>
  );
}

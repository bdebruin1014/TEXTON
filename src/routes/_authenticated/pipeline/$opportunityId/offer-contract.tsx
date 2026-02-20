import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";

import { AutoSaveField, AutoSaveSelect } from "@/components/forms/AutoSaveField";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pipeline/$opportunityId/offer-contract")({
  component: OfferContract,
});

interface CounterOffer {
  id: string;
  counter_number: number;
  offered_by: string | null;
  amount: number | null;
  terms: string | null;
  status: string;
  date: string | null;
}

const OFFER_STATUSES = ["Draft", "Submitted", "Countered", "Accepted", "Rejected", "Expired", "Withdrawn"] as const;

function OfferContract() {
  const { opportunityId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: opp, isLoading } = useQuery({
    queryKey: ["opportunity", opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase.from("opportunities").select("*").eq("id", opportunityId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: counterOffers = [] } = useQuery<CounterOffer[]>({
    queryKey: ["counter-offers", opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("counter_offers")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("counter_number", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("opportunities").update(updates).eq("id", opportunityId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["opportunity", opportunityId] }),
  });

  const addCounterOffer = useMutation({
    mutationFn: async () => {
      const nextNum = counterOffers.length > 0 ? Math.max(...counterOffers.map((c) => c.counter_number)) + 1 : 1;
      const { error } = await supabase.from("counter_offers").insert({
        opportunity_id: opportunityId,
        counter_number: nextNum,
        status: "Draft",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["counter-offers", opportunityId] }),
  });

  const deleteCounterOffer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("counter_offers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["counter-offers", opportunityId] }),
  });

  const save = (field: string) => async (value: string | number) => {
    await mutation.mutateAsync({ [field]: value });
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  if (!opp) return <div className="py-12 text-center text-sm text-muted">Opportunity not found</div>;

  const counterColumns: ColumnDef<CounterOffer, unknown>[] = [
    {
      accessorKey: "counter_number",
      header: "#",
      cell: ({ row }) => <span className="font-medium">#{row.getValue("counter_number")}</span>,
      size: 60,
    },
    {
      accessorKey: "offered_by",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Offered By" />,
    },
    {
      accessorKey: "amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => {
        const val = row.getValue("amount") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => formatDate(row.getValue("date")),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteCounterOffer.mutate(row.original.id);
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
      <h2 className="mb-6 text-lg font-semibold text-foreground">Offer & Contract</h2>

      {/* Initial Offer */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Initial Offer</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CurrencyInput label="Offer Amount" value={opp.offer_amount} onSave={save("offer_amount")} />
          <AutoSaveField label="Offer Date" value={opp.offer_date} onSave={save("offer_date")} type="date" />
          <AutoSaveSelect
            label="Offer Status"
            value={opp.offer_status}
            onSave={save("offer_status")}
            options={OFFER_STATUSES}
            placeholder="Select..."
          />
          <CurrencyInput label="Earnest Money" value={opp.earnest_money} onSave={save("earnest_money")} />
        </div>
      </div>

      {/* Contract Details */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Contract Details</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CurrencyInput label="Contract Price" value={opp.contract_price} onSave={save("contract_price")} />
          <AutoSaveField
            label="Effective Date"
            value={opp.effective_date}
            onSave={save("effective_date")}
            type="date"
          />
          <AutoSaveField label="DD Period End" value={opp.dd_period_end} onSave={save("dd_period_end")} type="date" />
          <AutoSaveField label="Closing Date" value={opp.closing_date} onSave={save("closing_date")} type="date" />
          <div className="md:col-span-2">
            <AutoSaveField
              label="Special Conditions"
              value={opp.special_conditions}
              onSave={save("special_conditions")}
              type="textarea"
              rows={3}
              placeholder="Contingencies, special terms..."
            />
          </div>
        </div>
      </div>

      {/* Counter Offers */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Counter Offers</h3>
          <button
            type="button"
            onClick={() => addCounterOffer.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            + Add Counter Offer
          </button>
        </div>
        <DataTable columns={counterColumns} data={counterOffers} />
      </div>
    </div>
  );
}

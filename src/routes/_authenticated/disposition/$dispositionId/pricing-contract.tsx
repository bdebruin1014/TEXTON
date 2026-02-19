import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AutoSaveField } from "@/components/forms/AutoSaveField";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/disposition/$dispositionId/pricing-contract")({
  component: PricingContract,
});

function PricingContract() {
  const { dispositionId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: disposition, isLoading } = useQuery({
    queryKey: ["disposition", dispositionId],
    queryFn: async () => {
      const { data, error } = await supabase.from("dispositions").select("*").eq("id", dispositionId).single();
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("dispositions").update(updates).eq("id", dispositionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disposition", dispositionId] });
    },
  });

  const save = (field: string) => async (value: string | number) => {
    await mutation.mutateAsync({ [field]: value });
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  if (!disposition) {
    return <div className="py-12 text-center text-sm text-muted">Disposition not found</div>;
  }

  // Computed totals
  const basePrice = disposition.base_price ?? 0;
  const lotPremium = disposition.lot_premium ?? 0;
  const optionsTotal = disposition.options_total ?? 0;
  const incentives = disposition.incentives ?? 0;
  const contractPrice = basePrice + lotPremium + optionsTotal - incentives;

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-foreground">Pricing & Contract</h2>

      {/* Computed Price Summary */}
      <div className="mb-8 rounded-lg border border-primary/20 bg-primary/5 p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">Contract Price Summary</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Base Price</span>
            <span>{formatCurrency(basePrice)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Lot Premium</span>
            <span>{formatCurrency(lotPremium)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Options / Upgrades</span>
            <span>{formatCurrency(optionsTotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Incentives / Credits</span>
            <span className="text-destructive">-{formatCurrency(incentives)}</span>
          </div>
          <div className="border-t border-border pt-2">
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Contract Price</span>
              <span className="text-primary">{formatCurrency(contractPrice)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Pricing</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CurrencyInput label="Base Price" value={disposition.base_price} onSave={save("base_price")} />
          <CurrencyInput label="Lot Premium" value={disposition.lot_premium} onSave={save("lot_premium")} />
          <CurrencyInput label="Options Total" value={disposition.options_total} onSave={save("options_total")} />
          <CurrencyInput label="Incentives / Credits" value={disposition.incentives} onSave={save("incentives")} />
          <CurrencyInput
            label="Contract Price (override)"
            value={disposition.contract_price}
            onSave={save("contract_price")}
          />
        </div>
      </div>

      {/* Earnest Money */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Earnest Money Deposit</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CurrencyInput label="EMD Amount" value={disposition.emd_amount} onSave={save("emd_amount")} />
          <AutoSaveField
            label="EMD Received Date"
            value={disposition.emd_received_date}
            onSave={save("emd_received_date")}
            type="date"
          />
          <AutoSaveField
            label="EMD Held By"
            value={disposition.emd_held_by}
            onSave={save("emd_held_by")}
            placeholder="Title company or escrow"
          />
        </div>
      </div>

      {/* Contract Dates */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Contract Dates</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveField
            label="Contract Date"
            value={disposition.contract_date}
            onSave={save("contract_date")}
            type="date"
          />
          <AutoSaveField
            label="Inspection Deadline"
            value={disposition.inspection_deadline}
            onSave={save("inspection_deadline")}
            type="date"
          />
          <AutoSaveField
            label="Appraisal Deadline"
            value={disposition.appraisal_deadline}
            onSave={save("appraisal_deadline")}
            type="date"
          />
          <AutoSaveField
            label="Financing Deadline"
            value={disposition.financing_deadline}
            onSave={save("financing_deadline")}
            type="date"
          />
          <AutoSaveField
            label="Closing Date"
            value={disposition.closing_date}
            onSave={save("closing_date")}
            type="date"
          />
        </div>
      </div>
    </div>
  );
}

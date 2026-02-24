import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { toast } from "sonner";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { PercentageInput } from "@/components/forms/PercentageInput";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/disposition/$dispositionId/settlement")({
  component: Settlement,
});

function Settlement() {
  const { dispositionId } = Route.useParams();
  const queryClient = useQueryClient();
  const settlementInputRef = useRef<HTMLInputElement>(null);
  const wireInputRef = useRef<HTMLInputElement>(null);

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

  const uploadDocument = useMutation({
    mutationFn: async ({ file, field }: { file: File; field: string }) => {
      const path = `dispositions/${dispositionId}/settlement/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
      if (uploadError) throw uploadError;
      await mutation.mutateAsync({ [field]: path });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to upload document"),
  });

  const handleUpload = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadDocument.mutate({ file, field });
    }
    e.target.value = "";
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  if (!disposition) {
    return <div className="py-12 text-center text-sm text-muted">Disposition not found</div>;
  }

  // Net proceeds computation
  const grossSale = disposition.gross_sale_price ?? 0;
  const buyerCredits = disposition.buyer_credits ?? 0;
  const sellerConcessions = disposition.seller_concessions ?? 0;
  const listingCommission = disposition.listing_commission ?? 0;
  const buyerAgentCommission = disposition.buyer_agent_commission ?? 0;
  const totalCommissions = listingCommission + buyerAgentCommission;
  const closingCosts = disposition.closing_costs ?? 0;
  const loanPayoff = disposition.loan_payoff ?? 0;
  const otherCosts = disposition.other_settlement_costs ?? 0;
  const netProceeds =
    grossSale - buyerCredits - sellerConcessions - totalCommissions - closingCosts - loanPayoff - otherCosts;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Settlement & Proceeds</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => settlementInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-card-hover"
          >
            Upload Settlement Statement
          </button>
          <button
            type="button"
            onClick={() => wireInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-card-hover"
          >
            Upload Wire Confirmation
          </button>
          <input
            ref={settlementInputRef}
            type="file"
            className="hidden"
            onChange={handleUpload("settlement_statement_path")}
          />
          <input ref={wireInputRef} type="file" className="hidden" onChange={handleUpload("wire_confirmation_path")} />
        </div>
      </div>

      {/* Net Proceeds Summary */}
      <div className="mb-8 rounded-lg border border-primary/20 bg-primary/5 p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">Net Proceeds</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Gross Sale Price</span>
            <span>{formatCurrency(grossSale)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Buyer Credits</span>
            <span className="text-destructive">-{formatCurrency(buyerCredits)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Seller Concessions</span>
            <span className="text-destructive">-{formatCurrency(sellerConcessions)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Commissions</span>
            <span className="text-destructive">-{formatCurrency(totalCommissions)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Closing Costs</span>
            <span className="text-destructive">-{formatCurrency(closingCosts)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Loan Payoff</span>
            <span className="text-destructive">-{formatCurrency(loanPayoff)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Other Costs</span>
            <span className="text-destructive">-{formatCurrency(otherCosts)}</span>
          </div>
          <div className="border-t border-border pt-2">
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Net Proceeds</span>
              <span className={netProceeds >= 0 ? "text-success" : "text-destructive"}>
                {formatCurrency(netProceeds)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sale Price */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Sale Price</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CurrencyInput
            label="Gross Sale Price"
            value={disposition.gross_sale_price}
            onSave={save("gross_sale_price")}
          />
          <CurrencyInput label="Buyer Credits" value={disposition.buyer_credits} onSave={save("buyer_credits")} />
          <CurrencyInput
            label="Seller Concessions"
            value={disposition.seller_concessions}
            onSave={save("seller_concessions")}
          />
        </div>
      </div>

      {/* Commissions */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Commissions</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PercentageInput
            label="Listing Commission %"
            value={disposition.listing_commission_pct}
            onSave={save("listing_commission_pct")}
          />
          <CurrencyInput
            label="Listing Commission $"
            value={disposition.listing_commission}
            onSave={save("listing_commission")}
          />
          <PercentageInput
            label="Buyer Agent Commission %"
            value={disposition.buyer_agent_commission_pct}
            onSave={save("buyer_agent_commission_pct")}
          />
          <CurrencyInput
            label="Buyer Agent Commission $"
            value={disposition.buyer_agent_commission}
            onSave={save("buyer_agent_commission")}
          />
        </div>
      </div>

      {/* Costs & Payoffs */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Costs & Payoffs</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CurrencyInput label="Closing Costs" value={disposition.closing_costs} onSave={save("closing_costs")} />
          <CurrencyInput label="Loan Payoff" value={disposition.loan_payoff} onSave={save("loan_payoff")} />
          <CurrencyInput
            label="Other Settlement Costs"
            value={disposition.other_settlement_costs}
            onSave={save("other_settlement_costs")}
          />
          <CurrencyInput
            label="Net Proceeds (override)"
            value={disposition.net_proceeds}
            onSave={save("net_proceeds")}
          />
        </div>
      </div>

      {/* Upload Status */}
      {(disposition.settlement_statement_path || disposition.wire_confirmation_path) && (
        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Uploaded Documents</h3>
          <div className="space-y-1">
            {disposition.settlement_statement_path && (
              <p className="text-xs text-success">Settlement statement uploaded</p>
            )}
            {disposition.wire_confirmation_path && <p className="text-xs text-success">Wire confirmation uploaded</p>}
          </div>
        </div>
      )}
    </div>
  );
}

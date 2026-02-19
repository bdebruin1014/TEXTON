import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AutoSaveField, AutoSaveSelect } from "@/components/forms/AutoSaveField";
import { PercentageInput } from "@/components/forms/PercentageInput";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/pipeline/$opportunityId/underwriting")({
  component: Underwriting,
});

function Underwriting() {
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

  const mutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("opportunities").update(updates).eq("id", opportunityId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["opportunity", opportunityId] }),
  });

  const save = (field: string) => async (value: string | number) => {
    await mutation.mutateAsync({ [field]: value });
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  if (!opp) return <div className="py-12 text-center text-sm text-muted">Opportunity not found</div>;

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-foreground">Underwriting</h2>

      {/* Deal Structure */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Deal Structure</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveSelect
            label="Financing Type"
            value={opp.financing_type}
            onSave={save("financing_type")}
            options={["Construction Loan", "Cash", "Seller Finance", "Hard Money", "Other"]}
            placeholder="Select..."
          />
          <PercentageInput label="LTC Ratio" value={opp.ltc_ratio} onSave={save("ltc_ratio")} />
          <PercentageInput label="Interest Rate" value={opp.interest_rate} onSave={save("interest_rate")} />
          <AutoSaveField
            label="Loan Term (months)"
            value={opp.loan_term_months}
            onSave={save("loan_term_months")}
            type="number"
          />
        </div>
      </div>

      {/* Returns */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Target Returns</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PercentageInput
            label="Target Gross Margin"
            value={opp.target_gross_margin}
            onSave={save("target_gross_margin")}
          />
          <PercentageInput label="Target Net Margin" value={opp.target_net_margin} onSave={save("target_net_margin")} />
          <PercentageInput label="Target ROI" value={opp.target_roi} onSave={save("target_roi")} />
          <PercentageInput
            label="Target Annualized ROI"
            value={opp.target_annualized_roi}
            onSave={save("target_annualized_roi")}
          />
        </div>
      </div>

      {/* Risk Assessment */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Risk Assessment</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveSelect
            label="Market Risk"
            value={opp.market_risk}
            onSave={save("market_risk")}
            options={["Low", "Medium", "High"]}
            placeholder="Assess risk..."
          />
          <AutoSaveSelect
            label="Execution Risk"
            value={opp.execution_risk}
            onSave={save("execution_risk")}
            options={["Low", "Medium", "High"]}
            placeholder="Assess risk..."
          />
          <AutoSaveSelect
            label="Entitlement Risk"
            value={opp.entitlement_risk}
            onSave={save("entitlement_risk")}
            options={["Low", "Medium", "High"]}
            placeholder="Assess risk..."
          />
          <AutoSaveSelect
            label="Overall Risk"
            value={opp.overall_risk}
            onSave={save("overall_risk")}
            options={["Low", "Medium", "High"]}
            placeholder="Assess risk..."
          />
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Underwriting Notes</h3>
        <AutoSaveField
          label="Notes"
          value={opp.underwriting_notes}
          onSave={save("underwriting_notes")}
          type="textarea"
          rows={6}
          placeholder="Underwriting analysis, assumptions, and rationale..."
        />
      </div>
    </div>
  );
}

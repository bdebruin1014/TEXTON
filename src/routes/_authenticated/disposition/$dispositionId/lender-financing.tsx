import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AutoSaveField, AutoSaveSelect } from "@/components/forms/AutoSaveField";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { PercentageInput } from "@/components/forms/PercentageInput";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/disposition/$dispositionId/lender-financing")({
  component: LenderFinancing,
});

function LenderFinancing() {
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

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-foreground">Lender & Financing</h2>

      {/* Loan Details */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Loan Details</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveSelect
            label="Financing Type"
            value={disposition.financing_type}
            onSave={save("financing_type")}
            options={["Conventional", "FHA", "VA", "USDA", "Cash", "Other"]}
            placeholder="Select..."
          />
          <AutoSaveField
            label="Lender Name"
            value={disposition.lender_name}
            onSave={save("lender_name")}
            placeholder="Lender / bank"
          />
          <AutoSaveField
            label="Loan Officer"
            value={disposition.loan_officer}
            onSave={save("loan_officer")}
            placeholder="Loan officer name"
          />
          <AutoSaveField
            label="Loan Officer Email"
            value={disposition.loan_officer_email}
            onSave={save("loan_officer_email")}
            type="email"
            placeholder="email@example.com"
          />
          <AutoSaveField
            label="Loan Officer Phone"
            value={disposition.loan_officer_phone}
            onSave={save("loan_officer_phone")}
            type="tel"
            placeholder="(555) 555-5555"
          />
          <CurrencyInput label="Loan Amount" value={disposition.loan_amount} onSave={save("loan_amount")} />
          <PercentageInput label="Interest Rate" value={disposition.interest_rate} onSave={save("interest_rate")} />
          <PercentageInput
            label="Down Payment %"
            value={disposition.down_payment_pct}
            onSave={save("down_payment_pct")}
          />
        </div>
      </div>

      {/* Appraisal */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Appraisal</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveSelect
            label="Appraisal Status"
            value={disposition.appraisal_status}
            onSave={save("appraisal_status")}
            options={["Not Ordered", "Ordered", "Scheduled", "Completed", "Waived"]}
            placeholder="Select..."
          />
          <AutoSaveField
            label="Appraisal Date"
            value={disposition.appraisal_date}
            onSave={save("appraisal_date")}
            type="date"
          />
          <CurrencyInput label="Appraised Value" value={disposition.appraised_value} onSave={save("appraised_value")} />
        </div>
      </div>

      {/* Clear to Close */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Clear to Close</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveSelect
            label="CTC Status"
            value={disposition.ctc_status}
            onSave={save("ctc_status")}
            options={["Pending", "Conditional", "Clear to Close", "Suspended"]}
            placeholder="Select..."
          />
          <AutoSaveField label="CTC Date" value={disposition.ctc_date} onSave={save("ctc_date")} type="date" />
          <AutoSaveField
            label="Conditions / Notes"
            value={disposition.ctc_notes}
            onSave={save("ctc_notes")}
            type="textarea"
            rows={3}
            placeholder="Outstanding conditions..."
          />
        </div>
      </div>
    </div>
  );
}

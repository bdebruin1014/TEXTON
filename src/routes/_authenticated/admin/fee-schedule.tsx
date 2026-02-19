import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/admin/fee-schedule")({
  component: FeeSchedule,
});

interface FeeDefaults {
  id: string;
  builder_fee: number | null;
  warranty: number | null;
  builders_risk: number | null;
  po_fee: number | null;
  pm_fee: number | null;
  utility: number | null;
  contingency_cap: number | null;
  permit_fee: number | null;
  impact_fee: number | null;
  survey: number | null;
  architecture: number | null;
  closing_costs: number | null;
}

function FeeSchedule() {
  const queryClient = useQueryClient();

  const { data: fees, isLoading } = useQuery<FeeDefaults>({
    queryKey: ["fee-schedule"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fee_schedule").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      if (fees?.id) {
        const { error } = await supabase.from("fee_schedule").update(updates).eq("id", fees.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("fee_schedule").insert(updates);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fee-schedule"] }),
  });

  const save = (field: string) => async (value: string | number) => {
    await mutation.mutateAsync({ [field]: Number(value) });
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Fee Schedule</h1>
        <p className="mt-0.5 text-sm text-muted">Organization default fixed per-house costs (auto-saves)</p>
      </div>

      {/* Core Fees */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Core Builder Fees</h2>
        <div className="grid grid-cols-1 gap-x-8 gap-y-1 md:grid-cols-2">
          <CurrencyInput label="Builder Fee" value={fees?.builder_fee ?? 15000} onSave={save("builder_fee")} />
          <CurrencyInput label="Warranty Reserve" value={fees?.warranty ?? 5000} onSave={save("warranty")} />
          <CurrencyInput
            label="Builder's Risk Insurance"
            value={fees?.builders_risk ?? 1500}
            onSave={save("builders_risk")}
          />
          <CurrencyInput label="PO Fee" value={fees?.po_fee ?? 3000} onSave={save("po_fee")} />
          <CurrencyInput label="PM Fee" value={fees?.pm_fee ?? 3500} onSave={save("pm_fee")} />
          <CurrencyInput label="Utility Hookup" value={fees?.utility ?? 1400} onSave={save("utility")} />
          <CurrencyInput
            label="Contingency Cap"
            value={fees?.contingency_cap ?? 10000}
            onSave={save("contingency_cap")}
          />
        </div>
      </div>

      {/* Additional Fees */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Additional Fees</h2>
        <div className="grid grid-cols-1 gap-x-8 gap-y-1 md:grid-cols-2">
          <CurrencyInput label="Permit Fee" value={fees?.permit_fee ?? 0} onSave={save("permit_fee")} />
          <CurrencyInput label="Impact Fee" value={fees?.impact_fee ?? 0} onSave={save("impact_fee")} />
          <CurrencyInput label="Survey" value={fees?.survey ?? 0} onSave={save("survey")} />
          <CurrencyInput label="Architecture" value={fees?.architecture ?? 0} onSave={save("architecture")} />
          <CurrencyInput label="Closing Costs" value={fees?.closing_costs ?? 0} onSave={save("closing_costs")} />
        </div>
      </div>
    </div>
  );
}

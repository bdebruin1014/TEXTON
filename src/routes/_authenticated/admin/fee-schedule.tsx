import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { computeBuilderFee, computeContingency, FIXED_PER_HOUSE_FEES, totalFixedPerHouse } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/fee-schedule")({
  component: FeeSchedule,
});

interface FeeDefaults {
  id: string;
  builder_fee: number | null;
  am_fee: number | null;
  builder_warranty: number | null;
  builders_risk: number | null;
  po_fee: number | null;
  bookkeeping: number | null;
  pm_fee: number | null;
  utilities: number | null;
}

const FEE_LABELS: Record<keyof typeof FIXED_PER_HOUSE_FEES, string> = {
  builder_fee: "Builder Fee",
  am_fee: "Asset Management Fee",
  builder_warranty: "Builder Warranty Reserve",
  builders_risk: "Builder's Risk Insurance",
  po_fee: "PO Fee",
  bookkeeping: "Bookkeeping",
  pm_fee: "Project Management Fee",
  utilities: "Utilities During Construction",
};

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
        <p className="mt-0.5 text-sm text-muted">
          Fixed per-house fees (8 standard line items), builder fee formula, and contingency formula
        </p>
      </div>

      {/* Reference Card: Fixed Per-House Fees */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
          Fixed Per-House Fees (Reference)
        </h2>
        <div className="space-y-2">
          {(Object.entries(FIXED_PER_HOUSE_FEES) as [keyof typeof FIXED_PER_HOUSE_FEES, number][]).map(
            ([key, amount]) => (
              <div key={key} className="flex items-center justify-between rounded-md bg-background px-4 py-2">
                <span className="text-sm font-medium text-foreground">{FEE_LABELS[key]}</span>
                <span className="font-mono text-sm font-semibold text-foreground">{formatCurrency(amount)}</span>
              </div>
            ),
          )}
        </div>

        {/* Totals */}
        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-center justify-between px-4 py-1">
            <span className="text-sm font-semibold text-foreground">Total (RCH-related entity)</span>
            <span className="font-mono text-sm font-bold text-primary">{formatCurrency(totalFixedPerHouse(true))}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-1">
            <span className="text-sm font-semibold text-foreground">Total (Third-party, no AM fee)</span>
            <span className="font-mono text-sm font-bold text-primary">
              {formatCurrency(totalFixedPerHouse(false))}
            </span>
          </div>
        </div>
      </div>

      {/* Builder Fee & Contingency Formulas */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Computed Fee Formulas</h2>
        <div className="space-y-3">
          <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-sm font-semibold text-blue-900">Section 6 — Builder Fee</p>
            <p className="mt-1 text-sm text-blue-800">
              GREATER of <span className="font-mono font-bold">{formatCurrency(25_000)}</span> or{" "}
              <span className="font-mono font-bold">10%</span> of Sections 1-5
            </p>
            <p className="mt-1 text-xs text-blue-600">
              Example: If Sections 1-5 = $300,000 → Builder Fee = {formatCurrency(computeBuilderFee(300_000))}
            </p>
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900">Section 7 — Contingency</p>
            <p className="mt-1 text-sm text-amber-800">
              LOWER of <span className="font-mono font-bold">{formatCurrency(10_000)}</span> or{" "}
              <span className="font-mono font-bold">5%</span> of Sections 1-5 (capped at $10K)
            </p>
            <p className="mt-1 text-xs text-amber-600">
              Example: If Sections 1-5 = $300,000 → Contingency = {formatCurrency(computeContingency(300_000))}
            </p>
          </div>
        </div>
      </div>

      {/* Organization-Level Overrides */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted">Organization-Level Overrides</h2>
        <p className="mb-4 text-xs text-muted">Override default amounts for your organization. Changes auto-save.</p>
        <div className="grid grid-cols-1 gap-x-8 gap-y-1 md:grid-cols-2">
          <CurrencyInput
            label="Builder Fee"
            value={fees?.builder_fee ?? FIXED_PER_HOUSE_FEES.builder_fee}
            onSave={save("builder_fee")}
          />
          <CurrencyInput
            label="Asset Management Fee"
            value={fees?.am_fee ?? FIXED_PER_HOUSE_FEES.am_fee}
            onSave={save("am_fee")}
          />
          <CurrencyInput
            label="Builder Warranty Reserve"
            value={fees?.builder_warranty ?? FIXED_PER_HOUSE_FEES.builder_warranty}
            onSave={save("builder_warranty")}
          />
          <CurrencyInput
            label="Builder's Risk Insurance"
            value={fees?.builders_risk ?? FIXED_PER_HOUSE_FEES.builders_risk}
            onSave={save("builders_risk")}
          />
          <CurrencyInput label="PO Fee" value={fees?.po_fee ?? FIXED_PER_HOUSE_FEES.po_fee} onSave={save("po_fee")} />
          <CurrencyInput
            label="Bookkeeping"
            value={fees?.bookkeeping ?? FIXED_PER_HOUSE_FEES.bookkeeping}
            onSave={save("bookkeeping")}
          />
          <CurrencyInput
            label="Project Management Fee"
            value={fees?.pm_fee ?? FIXED_PER_HOUSE_FEES.pm_fee}
            onSave={save("pm_fee")}
          />
          <CurrencyInput
            label="Utilities During Construction"
            value={fees?.utilities ?? FIXED_PER_HOUSE_FEES.utilities}
            onSave={save("utilities")}
          />
        </div>
      </div>
    </div>
  );
}

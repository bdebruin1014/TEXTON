import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/accounting/period-close")({
  component: PeriodClose,
});

const CLOSE_STEPS = [
  { key: "review_unposted_je", label: "Review & Post All Journal Entries" },
  { key: "reconcile_bank_accounts", label: "Reconcile All Bank Accounts" },
  { key: "review_ap_aging", label: "Review AP Aging Report" },
  { key: "review_ar_aging", label: "Review AR Aging Report" },
  { key: "accrue_expenses", label: "Accrue Outstanding Expenses" },
  { key: "recognize_revenue", label: "Recognize Revenue (Percentage of Completion)" },
  { key: "review_intercompany", label: "Review Intercompany Transactions" },
  { key: "run_trial_balance", label: "Run Trial Balance" },
  { key: "review_variance", label: "Review Budget vs Actual Variance" },
  { key: "generate_financial_statements", label: "Generate Financial Statements" },
  { key: "management_review", label: "Management Review & Sign-off" },
  { key: "lock_period", label: "Lock Period" },
] as const;

function PeriodClose() {
  const queryClient = useQueryClient();
  const activeEntityId = useEntityStore((s) => s.activeEntityId);

  const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM

  const { data: periodData, isLoading } = useQuery({
    queryKey: ["period-close", activeEntityId, currentPeriod],
    queryFn: async () => {
      let query = supabase.from("period_close").select("*").eq("period", currentPeriod);
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      if (periodData?.id) {
        const { error } = await supabase.from("period_close").update(updates).eq("id", periodData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("period_close").insert({
          period: currentPeriod,
          entity_id: activeEntityId,
          ...updates,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["period-close", activeEntityId, currentPeriod] });
    },
  });

  const toggleStep = (key: string) => {
    const current = periodData?.[key] as string | null;
    const today = new Date().toISOString().split("T")[0];
    mutation.mutate({ [key]: current ? null : today });
  };

  const completedSteps = CLOSE_STEPS.filter((s) => periodData?.[s.key]).length;
  const allComplete = completedSteps === CLOSE_STEPS.length;
  const isClosed = periodData?.status === "Closed";

  const closePeriod = () => {
    if (allComplete) {
      mutation.mutate({ status: "Closed" });
    }
  };

  const reopenPeriod = () => {
    mutation.mutate({ status: "Open" });
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Period Close</h1>
          <p className="mt-0.5 text-sm text-muted">
            {currentPeriod} · {completedSteps} of {CLOSE_STEPS.length} steps complete
            {isClosed && <span className="ml-2 font-medium text-success">Period Closed</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isClosed ? (
            <button
              type="button"
              onClick={reopenPeriod}
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
            >
              Reopen Period
            </button>
          ) : (
            <button
              type="button"
              onClick={closePeriod}
              disabled={!allComplete}
              className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Close Period
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-2 w-full rounded-full bg-accent">
          <div
            className={`h-2 rounded-full transition-all ${isClosed ? "bg-success" : "bg-primary"}`}
            style={{ width: `${(completedSteps / CLOSE_STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Month-End Checklist</h3>
        <div className="space-y-1">
          {CLOSE_STEPS.map((step, index) => {
            const dateValue = periodData?.[step.key] as string | null;
            const isComplete = !!dateValue;
            return (
              <div
                key={step.key}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-card-hover"
              >
                <button
                  type="button"
                  onClick={() => toggleStep(step.key)}
                  disabled={isClosed}
                  className="shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isComplete ? (
                    <span className="text-success font-bold">{"\u2022"}</span>
                  ) : (
                    <span className="text-muted">{"\u25CB"}</span>
                  )}
                </button>
                <div className="flex min-w-0 flex-1 items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted">{index + 1}.</span>
                    <span
                      className={`text-sm font-medium ${isComplete ? "text-muted line-through" : "text-foreground"}`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {isComplete && <span className="text-xs text-muted">{dateValue}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

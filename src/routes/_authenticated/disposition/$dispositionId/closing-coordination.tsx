import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle, Circle } from "lucide-react";
import { AutoSaveField } from "@/components/forms/AutoSaveField";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/disposition/$dispositionId/closing-coordination")({
  component: ClosingCoordination,
});

const CLOSING_STEPS = [
  { key: "contract_executed", label: "Contract Executed" },
  { key: "title_ordered", label: "Title Ordered" },
  { key: "earnest_money_received", label: "Earnest Money Received" },
  { key: "inspections_complete", label: "Inspections Complete" },
  { key: "appraisal_ordered", label: "Appraisal Ordered" },
  { key: "appraisal_received", label: "Appraisal Received" },
  { key: "loan_approved", label: "Loan Approved" },
  { key: "clear_to_close", label: "Clear to Close" },
  { key: "closing_disclosure_sent", label: "Closing Disclosure Sent" },
  { key: "final_walkthrough", label: "Final Walkthrough" },
  { key: "closing_scheduled", label: "Closing Scheduled" },
  { key: "closed_funded", label: "Closed & Funded" },
] as const;

function ClosingCoordination() {
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

  const toggleStep = async (key: string, currentValue: string | null) => {
    const today = new Date().toISOString().split("T")[0];
    await mutation.mutateAsync({
      [key]: currentValue ? null : today,
    });
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  if (!disposition) {
    return <div className="py-12 text-center text-sm text-muted">Disposition not found</div>;
  }

  const completedSteps = CLOSING_STEPS.filter((s) => disposition[s.key]).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Closing Coordination</h2>
          <p className="mt-0.5 text-sm text-muted">
            {completedSteps} of {CLOSING_STEPS.length} steps complete
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-2 w-full rounded-full bg-gray-100">
          <div
            className="h-2 rounded-full bg-success transition-all"
            style={{ width: `${(completedSteps / CLOSING_STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* 12-Step Timeline */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Closing Timeline</h3>
        <div className="space-y-1">
          {CLOSING_STEPS.map((step, index) => {
            const dateValue = disposition[step.key] as string | null;
            const isComplete = !!dateValue;
            return (
              <div
                key={step.key}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50"
              >
                <button type="button" onClick={() => toggleStep(step.key, dateValue)} className="shrink-0">
                  {isComplete ? (
                    <CheckCircle className="h-5 w-5 text-success" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted" />
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

      {/* Closing Details */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Closing Details</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveField
            label="Title Company"
            value={disposition.title_company}
            onSave={save("title_company")}
            placeholder="Title company name"
          />
          <AutoSaveField
            label="Closing Agent"
            value={disposition.closing_agent}
            onSave={save("closing_agent")}
            placeholder="Closing agent name"
          />
          <AutoSaveField
            label="Closing Location"
            value={disposition.closing_location}
            onSave={save("closing_location")}
            placeholder="Address or virtual"
          />
          <AutoSaveField
            label="Closing Date"
            value={disposition.closing_date}
            onSave={save("closing_date")}
            type="date"
          />
          <AutoSaveField
            label="Closing Time"
            value={disposition.closing_time}
            onSave={save("closing_time")}
            placeholder="e.g. 2:00 PM"
          />
          <AutoSaveField
            label="Closing Notes"
            value={disposition.closing_notes}
            onSave={save("closing_notes")}
            type="textarea"
            rows={3}
            placeholder="Special instructions..."
          />
        </div>
      </div>
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AutoSaveField, AutoSaveSelect } from "@/components/forms/AutoSaveField";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/disposition/$dispositionId/post-closing")({
  component: PostClosing,
});

function PostClosing() {
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
      <h2 className="mb-6 text-lg font-semibold text-foreground">Post-Closing</h2>

      {/* Warranty Dates */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Warranty Dates</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveField
            label="Warranty Start"
            value={disposition.warranty_start_date}
            onSave={save("warranty_start_date")}
            type="date"
          />
          <AutoSaveField
            label="Warranty End (1yr)"
            value={disposition.warranty_end_1yr}
            onSave={save("warranty_end_1yr")}
            type="date"
          />
          <AutoSaveField
            label="Structural Warranty End"
            value={disposition.warranty_end_structural}
            onSave={save("warranty_end_structural")}
            type="date"
          />
        </div>
      </div>

      {/* Walkthrough Schedule */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Walkthrough Schedule</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveField
            label="30-Day Walk Date"
            value={disposition.walk_30_day_date}
            onSave={save("walk_30_day_date")}
            type="date"
          />
          <AutoSaveSelect
            label="30-Day Walk Status"
            value={disposition.walk_30_day_status}
            onSave={save("walk_30_day_status")}
            options={["Not Scheduled", "Scheduled", "Completed", "Skipped"]}
            placeholder="Select..."
          />
          <AutoSaveField
            label="11-Month Walk Date"
            value={disposition.walk_11_month_date}
            onSave={save("walk_11_month_date")}
            type="date"
          />
          <AutoSaveSelect
            label="11-Month Walk Status"
            value={disposition.walk_11_month_status}
            onSave={save("walk_11_month_status")}
            options={["Not Scheduled", "Scheduled", "Completed", "Skipped"]}
            placeholder="Select..."
          />
        </div>
      </div>

      {/* Satisfaction */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Customer Satisfaction</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveSelect
            label="Satisfaction Rating"
            value={disposition.satisfaction_rating}
            onSave={save("satisfaction_rating")}
            options={["Excellent", "Good", "Fair", "Poor", "Not Collected"]}
            placeholder="Select..."
          />
          <AutoSaveField label="Survey Date" value={disposition.survey_date} onSave={save("survey_date")} type="date" />
          <AutoSaveField
            label="Feedback"
            value={disposition.customer_feedback}
            onSave={save("customer_feedback")}
            type="textarea"
            rows={3}
            placeholder="Customer feedback..."
          />
          <AutoSaveSelect
            label="Referral Willing"
            value={disposition.referral_willing}
            onSave={save("referral_willing")}
            options={["Yes", "No", "Not Asked"]}
            placeholder="Select..."
          />
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Post-Closing Notes</h3>
        <AutoSaveField
          label="Notes"
          value={disposition.post_closing_notes}
          onSave={save("post_closing_notes")}
          type="textarea"
          rows={4}
          placeholder="Post-closing items, outstanding issues..."
        />
      </div>
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AutoSaveField, AutoSaveSelect } from "@/components/forms/AutoSaveField";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { PercentageInput } from "@/components/forms/PercentageInput";
import { StatusSelect } from "@/components/forms/StatusSelect";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { RecordTeamAssignment } from "@/components/teams/RecordTeamAssignment";
import { OPPORTUNITY_STATUSES, PROJECT_TYPES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/pipeline/$opportunityId/basic-info")({
  component: BasicInfo,
});

function BasicInfo() {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunity", opportunityId] });
    },
  });

  const save = (field: string) => async (value: string | number) => {
    await mutation.mutateAsync({ [field]: value });
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  if (!opp) {
    return <div className="py-12 text-center text-sm text-muted">Opportunity not found</div>;
  }

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-foreground">Basic Info</h2>

      {/* Opportunity Identity */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Opportunity Identity</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveField label="Opportunity Name" value={opp.opportunity_name} onSave={save("opportunity_name")} required />
          <StatusSelect label="Status" value={opp.status} onSave={save("status")} statuses={OPPORTUNITY_STATUSES} required />
          <AutoSaveSelect
            label="Project Type"
            value={opp.project_type}
            onSave={save("project_type")}
            options={PROJECT_TYPES}
            placeholder="Select type..."
          />
          <AutoSaveField
            label="Source"
            value={opp.source}
            onSave={save("source")}
            placeholder="How was this sourced?"
          />
        </div>
      </div>

      {/* Assignment & Priority */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Assignment & Priority</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveField
            label="Assigned To"
            value={opp.assigned_to}
            onSave={save("assigned_to")}
            placeholder="Team member..."
          />
          <AutoSaveSelect
            label="Priority"
            value={opp.priority}
            onSave={save("priority")}
            options={["High", "Medium", "Low"]}
            placeholder="Select priority..."
          />
          <PercentageInput label="Probability" value={opp.probability} onSave={save("probability")} />
          <CurrencyInput label="Estimated Value" value={opp.estimated_value} onSave={save("estimated_value")} />
        </div>
      </div>

      {/* Team & Assignments */}
      <div className="mb-8">
        <RecordTeamAssignment recordType="opportunity" recordId={opportunityId} />
      </div>

      {/* Notes */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Notes</h3>
        <AutoSaveField
          label="Description"
          value={opp.description}
          onSave={save("description")}
          type="textarea"
          rows={4}
          placeholder="Describe this opportunity..."
        />
      </div>
    </div>
  );
}

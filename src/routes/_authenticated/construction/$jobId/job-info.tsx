import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AutoSaveField, AutoSaveSelect } from "@/components/forms/AutoSaveField";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { ProjectSelect } from "@/components/forms/ProjectSelect";
import { StatusSelect } from "@/components/forms/StatusSelect";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { RecordTeamAssignment } from "@/components/teams/RecordTeamAssignment";
import { JOB_STATUSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/construction/$jobId/job-info")({
  component: JobInfo,
});

function JobInfo() {
  const { jobId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: job, isLoading } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").eq("id", jobId).single();
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("jobs").update(updates).eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
    },
  });

  const save = (field: string) => async (value: string | number) => {
    await mutation.mutateAsync({ [field]: value });
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  if (!job) {
    return <div className="py-12 text-center text-sm text-muted">Job not found</div>;
  }

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-foreground">Job Info</h2>

      {/* Project & Lot Link (required) */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Project & Lot Assignment</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ProjectSelect label="Project" value={job.project_id} onSave={save("project_id")} />
          <AutoSaveField
            label="Lot Number"
            value={job.lot_number}
            onSave={save("lot_number")}
            placeholder="Lot #"
            required
          />
          <AutoSaveField label="Lot ID" value={job.lot_id} onSave={save("lot_id")} placeholder="Lot record ID" />
        </div>
      </div>

      {/* Job Identity */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Job Identity</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <StatusSelect label="Status" value={job.status} onSave={save("status")} statuses={JOB_STATUSES} required />
          <AutoSaveField
            label="Floor Plan"
            value={job.floor_plan_name}
            onSave={save("floor_plan_name")}
            placeholder="Plan name"
          />
          <AutoSaveField
            label="Project Name"
            value={job.project_name}
            onSave={save("project_name")}
            placeholder="Project name"
          />
          <AutoSaveSelect
            label="Builder"
            value={job.builder}
            onSave={save("builder")}
            options={["In-House", "Contracted"]}
            placeholder="Select..."
          />
        </div>
      </div>

      {/* Schedule */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Schedule</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveField label="Start Date" value={job.start_date} onSave={save("start_date")} type="date" />
          <AutoSaveField
            label="Target Completion"
            value={job.target_completion}
            onSave={save("target_completion")}
            type="date"
          />
          <AutoSaveField
            label="Actual Completion"
            value={job.actual_completion}
            onSave={save("actual_completion")}
            type="date"
          />
          <AutoSaveField
            label="Build Duration (days)"
            value={job.build_duration}
            onSave={save("build_duration")}
            type="number"
            placeholder="Days"
          />
        </div>
      </div>

      {/* Financials */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Financials</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CurrencyInput label="Budget Total" value={job.budget_total} onSave={save("budget_total")} />
          <CurrencyInput label="Spent Total" value={job.spent_total} onSave={save("spent_total")} />
          <CurrencyInput label="Contract Amount" value={job.contract_amount} onSave={save("contract_amount")} />
        </div>
      </div>

      {/* Team & Assignments */}
      <div className="mb-8">
        <RecordTeamAssignment recordType="job" recordId={jobId} />
      </div>

      {/* Notes */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Notes</h3>
        <AutoSaveField
          label="Job Notes"
          value={job.notes}
          onSave={save("notes")}
          type="textarea"
          rows={4}
          placeholder="Construction notes, special conditions..."
        />
      </div>
    </div>
  );
}

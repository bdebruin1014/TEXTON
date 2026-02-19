import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AutoSaveField } from "@/components/forms/AutoSaveField";
import { ProjectSelect } from "@/components/forms/ProjectSelect";
import { StatusSelect } from "@/components/forms/StatusSelect";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DISPOSITION_STATUSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/disposition/$dispositionId/overview")({
  component: Overview,
});

function Overview() {
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
      <h2 className="mb-6 text-lg font-semibold text-foreground">Overview</h2>

      {/* Project & Lot Link (required) */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Project & Lot Assignment</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ProjectSelect label="Project *" value={disposition.project_id} onSave={save("project_id")} />
          <AutoSaveField
            label="Lot Number *"
            value={disposition.lot_number}
            onSave={save("lot_number")}
            placeholder="Lot #"
          />
          <AutoSaveField
            label="Lot ID"
            value={disposition.lot_id}
            onSave={save("lot_id")}
            placeholder="Lot record ID"
          />
          <AutoSaveField
            label="Job ID"
            value={disposition.job_id}
            onSave={save("job_id")}
            placeholder="Linked job (optional)"
          />
        </div>
      </div>

      {/* Identity */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Disposition Identity</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <StatusSelect
            label="Status"
            value={disposition.status}
            onSave={save("status")}
            statuses={DISPOSITION_STATUSES}
          />
          <AutoSaveField
            label="Project Name"
            value={disposition.project_name}
            onSave={save("project_name")}
            placeholder="Project name"
          />
          <AutoSaveField
            label="Address"
            value={disposition.address}
            onSave={save("address")}
            placeholder="Property address"
          />
          <AutoSaveField
            label="Floor Plan"
            value={disposition.floor_plan}
            onSave={save("floor_plan")}
            placeholder="Floor plan name"
          />
        </div>
      </div>

      {/* Key Dates */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Key Dates</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveField label="Listed Date" value={disposition.listed_date} onSave={save("listed_date")} type="date" />
          <AutoSaveField
            label="Contract Date"
            value={disposition.contract_date}
            onSave={save("contract_date")}
            type="date"
          />
          <AutoSaveField
            label="Closing Date"
            value={disposition.closing_date}
            onSave={save("closing_date")}
            type="date"
          />
          <AutoSaveField
            label="Actual Closed"
            value={disposition.actual_closed_date}
            onSave={save("actual_closed_date")}
            type="date"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Notes</h3>
        <AutoSaveField
          label="Notes"
          value={disposition.notes}
          onSave={save("notes")}
          type="textarea"
          rows={4}
          placeholder="Disposition notes..."
        />
      </div>
    </div>
  );
}

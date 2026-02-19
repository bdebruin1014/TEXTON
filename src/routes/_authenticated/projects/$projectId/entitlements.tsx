import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AutoSaveField, AutoSaveSelect } from "@/components/forms/AutoSaveField";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/projects/$projectId/entitlements")({
  component: Entitlements,
});

function Entitlements() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("projects").update(updates).eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });

  const save = (field: string) => async (value: string | number) => {
    await mutation.mutateAsync({ [field]: value });
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  if (!project) {
    return <div className="py-12 text-center text-sm text-muted">Project not found</div>;
  }

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-foreground">Entitlements</h2>

      {/* Zoning & Plat */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Zoning & Plat</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveField
            label="Current Zoning"
            value={project.zoning}
            onSave={save("zoning")}
            placeholder="R-1, PUD, etc."
          />
          <AutoSaveSelect
            label="Rezoning Required"
            value={project.rezoning_required}
            onSave={save("rezoning_required")}
            options={["Yes", "No", "Pending Review"]}
            placeholder="Select..."
          />
          <AutoSaveSelect
            label="Plat Status"
            value={project.plat_status}
            onSave={save("plat_status")}
            options={["Not Filed", "Filed", "Under Review", "Approved", "Recorded"]}
            placeholder="Select..."
          />
          <AutoSaveField
            label="Plat Recording Date"
            value={project.plat_recording_date}
            onSave={save("plat_recording_date")}
            type="date"
          />
        </div>
      </div>

      {/* Permits & Approvals */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Permits & Approvals</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveSelect
            label="Site Plan Approval"
            value={project.site_plan_status}
            onSave={save("site_plan_status")}
            options={["Not Submitted", "Under Review", "Approved", "Approved with Conditions"]}
            placeholder="Select..."
          />
          <AutoSaveField
            label="Site Plan Approval Date"
            value={project.site_plan_date}
            onSave={save("site_plan_date")}
            type="date"
          />
          <AutoSaveSelect
            label="Stormwater Permit"
            value={project.stormwater_status}
            onSave={save("stormwater_status")}
            options={["Not Required", "Not Submitted", "Under Review", "Approved"]}
            placeholder="Select..."
          />
          <AutoSaveSelect
            label="Grading Permit"
            value={project.grading_status}
            onSave={save("grading_status")}
            options={["Not Required", "Not Submitted", "Under Review", "Approved"]}
            placeholder="Select..."
          />
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Notes</h3>
        <AutoSaveField
          label="Entitlement Notes"
          value={project.entitlement_notes}
          onSave={save("entitlement_notes")}
          type="textarea"
          rows={4}
          placeholder="Notes on entitlement process, conditions, timelines..."
        />
      </div>
    </div>
  );
}

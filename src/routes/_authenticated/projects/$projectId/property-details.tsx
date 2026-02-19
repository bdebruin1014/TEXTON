import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AutoSaveField, AutoSaveSelect } from "@/components/forms/AutoSaveField";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/projects/$projectId/property-details")({
  component: PropertyDetails,
});

function PropertyDetails() {
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
      <h2 className="mb-6 text-lg font-semibold text-foreground">Property Details</h2>

      {/* Address */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Address</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <AutoSaveField
              label="Street Address"
              value={project.address_street}
              onSave={save("address_street")}
              placeholder="123 Main St"
            />
          </div>
          <AutoSaveField label="City" value={project.address_city} onSave={save("address_city")} placeholder="City" />
          <AutoSaveField
            label="State"
            value={project.address_state}
            onSave={save("address_state")}
            placeholder="State"
          />
          <AutoSaveField label="ZIP" value={project.address_zip} onSave={save("address_zip")} placeholder="ZIP Code" />
          <AutoSaveField label="County" value={project.county} onSave={save("county")} placeholder="County" />
        </div>
      </div>

      {/* Zoning & Land */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Zoning & Land</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveField label="Zoning" value={project.zoning} onSave={save("zoning")} placeholder="R-1, PUD, etc." />
          <AutoSaveField
            label="Total Acreage"
            value={project.total_acreage}
            onSave={save("total_acreage")}
            type="number"
            placeholder="Acres"
          />
          <AutoSaveField
            label="Front Setback"
            value={project.setback_front}
            onSave={save("setback_front")}
            placeholder="ft"
          />
          <AutoSaveField
            label="Rear Setback"
            value={project.setback_rear}
            onSave={save("setback_rear")}
            placeholder="ft"
          />
          <AutoSaveField
            label="Side Setback"
            value={project.setback_side}
            onSave={save("setback_side")}
            placeholder="ft"
          />
          <AutoSaveField label="Max Height" value={project.max_height} onSave={save("max_height")} placeholder="ft" />
        </div>
      </div>

      {/* Utilities */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Utility Status</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveSelect
            label="Water"
            value={project.utility_water}
            onSave={save("utility_water")}
            options={["Available", "Needs Extension", "Well Required", "N/A"]}
            placeholder="Select..."
          />
          <AutoSaveSelect
            label="Sewer"
            value={project.utility_sewer}
            onSave={save("utility_sewer")}
            options={["Available", "Needs Extension", "Septic Required", "N/A"]}
            placeholder="Select..."
          />
          <AutoSaveSelect
            label="Electric"
            value={project.utility_electric}
            onSave={save("utility_electric")}
            options={["Available", "Needs Extension", "N/A"]}
            placeholder="Select..."
          />
          <AutoSaveSelect
            label="Gas"
            value={project.utility_gas}
            onSave={save("utility_gas")}
            options={["Available", "Needs Extension", "N/A"]}
            placeholder="Select..."
          />
        </div>
      </div>

      {/* Conditional: Community Development fields */}
      {project.project_type === "Community Development" && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Community Details</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <AutoSaveField
              label="Number of Phases"
              value={project.phases}
              onSave={save("phases")}
              type="number"
              placeholder="Phases"
            />
            <AutoSaveField
              label="HOA Name"
              value={project.hoa_name}
              onSave={save("hoa_name")}
              placeholder="HOA name..."
            />
            <AutoSaveField
              label="HOA Monthly Fee"
              value={project.hoa_fee}
              onSave={save("hoa_fee")}
              type="number"
              placeholder="Monthly fee"
            />
          </div>
        </div>
      )}
    </div>
  );
}

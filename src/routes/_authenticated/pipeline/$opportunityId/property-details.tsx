import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AutoSaveField, AutoSaveSelect } from "@/components/forms/AutoSaveField";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/pipeline/$opportunityId/property-details")({
  component: PropertyDetails,
});

function PropertyDetails() {
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

  if (!opp) return <div className="py-12 text-center text-sm text-muted">Opportunity not found</div>;

  const isCommDev = opp.project_type === "Community Development";
  const isScattered = opp.project_type === "Scattered Lot";

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
              value={opp.address_street}
              onSave={save("address_street")}
              placeholder="123 Main St"
            />
          </div>
          <AutoSaveField label="City" value={opp.address_city} onSave={save("address_city")} placeholder="City" />
          <div className="grid grid-cols-2 gap-4">
            <AutoSaveField label="State" value={opp.address_state} onSave={save("address_state")} placeholder="SC" />
            <AutoSaveField label="ZIP" value={opp.address_zip} onSave={save("address_zip")} placeholder="29601" />
          </div>
          <AutoSaveField label="County" value={opp.county} onSave={save("county")} placeholder="County" />
          <AutoSaveField
            label="Parcel ID"
            value={opp.parcel_id}
            onSave={save("parcel_id")}
            placeholder="Tax parcel number"
          />
        </div>
      </div>

      {/* Land Details */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Land Details</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveField
            label="Acreage"
            value={opp.acreage}
            onSave={save("acreage")}
            type="number"
            placeholder="0.00"
          />
          <AutoSaveSelect
            label="Zoning"
            value={opp.zoning}
            onSave={save("zoning")}
            options={["R-1", "R-2", "R-3", "R-4", "PUD", "MF", "Commercial", "Agricultural", "Mixed Use", "Other"]}
            placeholder="Select zoning..."
          />
          <AutoSaveSelect
            label="Topography"
            value={opp.topography}
            onSave={save("topography")}
            options={["Flat", "Gentle Slope", "Moderate Slope", "Steep", "Rolling"]}
            placeholder="Select..."
          />
          <AutoSaveField
            label="Flood Zone"
            value={opp.flood_zone}
            onSave={save("flood_zone")}
            placeholder="Zone X, AE..."
          />
        </div>
      </div>

      {/* Utilities */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Utilities</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveSelect
            label="Water"
            value={opp.water_status}
            onSave={save("water_status")}
            options={["Available", "Requires Extension", "Well", "None", "Unknown"]}
            placeholder="Select..."
          />
          <AutoSaveSelect
            label="Sewer"
            value={opp.sewer_status}
            onSave={save("sewer_status")}
            options={["Available", "Requires Extension", "Septic", "None", "Unknown"]}
            placeholder="Select..."
          />
          <AutoSaveSelect
            label="Electric"
            value={opp.electric_status}
            onSave={save("electric_status")}
            options={["Available", "Requires Extension", "None", "Unknown"]}
            placeholder="Select..."
          />
          <AutoSaveSelect
            label="Gas"
            value={opp.gas_status}
            onSave={save("gas_status")}
            options={["Available", "Requires Extension", "None", "Unknown"]}
            placeholder="Select..."
          />
        </div>
      </div>

      {/* Scattered Lot Fields */}
      {isScattered && (
        <div className="mb-8 rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Scattered Lot Details</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <CurrencyInput label="Lot Price" value={opp.lot_price} onSave={save("lot_price")} />
            <AutoSaveField
              label="Lot Dimensions"
              value={opp.lot_dimensions}
              onSave={save("lot_dimensions")}
              placeholder="e.g. 60x120"
            />
          </div>
        </div>
      )}

      {/* Community Dev Fields */}
      {isCommDev && (
        <div className="mb-8 rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Community Development</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <AutoSaveField
              label="Total Lots Planned"
              value={opp.total_lots}
              onSave={save("total_lots")}
              type="number"
              placeholder="0"
            />
            <AutoSaveField
              label="Number of Phases"
              value={opp.num_phases}
              onSave={save("num_phases")}
              type="number"
              placeholder="1"
            />
            <CurrencyInput
              label="Infrastructure Budget"
              value={opp.infrastructure_budget}
              onSave={save("infrastructure_budget")}
            />
            <AutoSaveField
              label="HOA Required"
              value={opp.hoa_required}
              onSave={save("hoa_required")}
              placeholder="Yes/No"
            />
          </div>
        </div>
      )}
    </div>
  );
}

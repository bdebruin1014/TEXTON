import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AutoSaveField, AutoSaveSelect } from "@/components/forms/AutoSaveField";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { StatusSelect } from "@/components/forms/StatusSelect";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/operations/rch-contracts/$contractId/overview")({
  component: ContractOverview,
});

const CONTRACT_STATUSES = [
  "Draft",
  "In Progress",
  "Pending Signature",
  "Executed",
  "Jobs Created",
  "Cancelled",
] as const;

const CONTRACT_TYPES = [
  "New Construction",
  "Renovation",
  "Lot Purchase",
  "Community Development",
] as const;

function ContractOverview() {
  const { contractId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: contract, isLoading } = useQuery({
    queryKey: ["rch-contract", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rch_contracts")
        .select("*")
        .eq("id", contractId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("rch_contracts").update(updates).eq("id", contractId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rch-contract", contractId] });
    },
  });

  const save = (field: string) => async (value: string | number) => {
    await mutation.mutateAsync({ [field]: value });
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  if (!contract) {
    return <div className="py-12 text-center text-sm text-muted">Contract not found</div>;
  }

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-foreground">Contract Overview</h2>

      {/* Contract Identity */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Contract Identity</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveField
            label="Contract Number"
            value={contract.contract_number}
            onSave={save("contract_number")}
            placeholder="e.g. RCH-2026-001"
          />
          <AutoSaveSelect
            label="Contract Type"
            value={contract.contract_type}
            onSave={save("contract_type")}
            options={[...CONTRACT_TYPES]}
            placeholder="Select type..."
          />
          <StatusSelect
            label="Status"
            value={contract.status}
            onSave={save("status")}
            statuses={CONTRACT_STATUSES}
          />
          <AutoSaveField
            label="Owner Name"
            value={contract.owner_name}
            onSave={save("owner_name")}
            placeholder="Property owner / entity"
          />
        </div>
      </div>

      {/* Project & Financial */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Project & Financial</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveField
            label="Project ID"
            value={contract.project_id}
            onSave={save("project_id")}
            placeholder="Linked project (optional)"
          />
          <CurrencyInput
            label="Contract Amount"
            value={contract.contract_amount}
            onSave={save("contract_amount")}
          />
          <AutoSaveField
            label="Unit Count"
            value={contract.unit_count}
            onSave={save("unit_count")}
            type="number"
            placeholder="Number of units"
          />
        </div>
      </div>

      {/* Key Dates */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Key Dates</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AutoSaveField
            label="Contract Date"
            value={contract.contract_date}
            onSave={save("contract_date")}
            type="date"
          />
          <AutoSaveField
            label="Effective Date"
            value={contract.effective_date}
            onSave={save("effective_date")}
            type="date"
          />
          <AutoSaveField
            label="Expiration Date"
            value={contract.expiration_date}
            onSave={save("expiration_date")}
            type="date"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Notes</h3>
        <AutoSaveField
          label="Contract Notes"
          value={contract.notes}
          onSave={save("notes")}
          type="textarea"
          rows={4}
          placeholder="Special conditions, notes..."
        />
      </div>
    </div>
  );
}

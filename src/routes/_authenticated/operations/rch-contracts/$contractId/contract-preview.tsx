import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { useState } from "react";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/operations/rch-contracts/$contractId/contract-preview")({
  component: ContractPreview,
});

function ContractPreview() {
  const { contractId } = Route.useParams();
  const [generating, setGenerating] = useState(false);

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

  const { data: units = [] } = useQuery({
    queryKey: ["rch-contract-units", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rch_contract_units")
        .select("*")
        .eq("contract_id", contractId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleGenerate = async () => {
    setGenerating(true);
    // Placeholder for contract generation logic
    // In production, this would call an Edge Function to generate a PDF
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setGenerating(false);
    alert("Contract generation is not yet implemented. This will generate a PDF from contract data.");
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  if (!contract) {
    return <div className="py-12 text-center text-sm text-muted">Contract not found</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Contract Preview</h2>
          <p className="mt-0.5 text-sm text-muted">Review contract details before generating the final document</p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? "Generating..." : "Generate Contract"}
        </button>
      </div>

      {/* Contract Summary Card */}
      <div className="mb-6 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Contract Summary</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs text-muted">Contract Number</p>
            <p className="text-sm font-medium text-foreground">{contract.contract_number ?? "Not assigned"}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Status</p>
            <StatusBadge status={contract.status} />
          </div>
          <div>
            <p className="text-xs text-muted">Contract Type</p>
            <p className="text-sm font-medium text-foreground">{contract.contract_type ?? "---"}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Owner</p>
            <p className="text-sm font-medium text-foreground">{contract.owner_name ?? "---"}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Contract Amount</p>
            <p className="text-sm font-medium text-foreground">{formatCurrency(contract.contract_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Unit Count</p>
            <p className="text-sm font-medium text-foreground">{units.length || contract.unit_count || 0} units</p>
          </div>
          <div>
            <p className="text-xs text-muted">Contract Date</p>
            <p className="text-sm font-medium text-foreground">{formatDate(contract.contract_date) || "---"}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Created</p>
            <p className="text-sm font-medium text-foreground">{formatDate(contract.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Units Preview */}
      {units.length > 0 && (
        <div className="mb-6 rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
            Units ({units.length})
          </h3>
          <div className="space-y-2">
            {units.map((unit: { id: string; lot_number?: string | null; plan_name?: string | null; elevation?: string | null }) => (
              <div
                key={unit.id}
                className="flex items-center gap-4 rounded-lg border border-border bg-background px-4 py-2"
              >
                <span className="text-sm font-medium text-foreground">{unit.lot_number ?? "---"}</span>
                <span className="text-sm text-muted">{unit.plan_name ?? "---"}</span>
                <span className="text-sm text-muted">{unit.elevation ?? "---"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Placeholder for PDF preview */}
      <div className="rounded-lg border-2 border-dashed border-border bg-gray-50 p-12 text-center">
        <p className="mb-3 text-center text-sm font-medium text-muted">Preview</p>
        <p className="text-sm font-medium text-foreground">Document Preview</p>
        <p className="mt-1 text-sm text-muted">
          Click "Generate Contract" to create a PDF document from the contract data above.
        </p>
      </div>
    </div>
  );
}

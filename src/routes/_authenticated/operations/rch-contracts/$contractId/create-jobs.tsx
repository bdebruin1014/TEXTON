import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/operations/rch-contracts/$contractId/create-jobs")({
  component: CreateJobs,
});

function CreateJobs() {
  const { contractId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [createdJobIds, setCreatedJobIds] = useState<string[]>([]);

  const { data: contract, isLoading: contractLoading } = useQuery({
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

  const { data: units = [], isLoading: unitsLoading } = useQuery({
    queryKey: ["rch-contract-units", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rch_contract_units")
        .select("*")
        .eq("contract_id", contractId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateContract = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("rch_contracts").update(updates).eq("id", contractId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rch-contract", contractId] });
    },
  });

  const handleCreateJobs = async () => {
    if (units.length === 0) return;
    setCreating(true);

    try {
      const jobInserts = units.map((unit: { lot_number?: string | null; plan_name?: string | null }) => ({
        lot_number: unit.lot_number ?? "New",
        floor_plan_name: unit.plan_name,
        project_id: contract?.project_id,
        project_name: contract?.owner_name,
        status: "Pre-Construction",
        contract_id: contractId,
      }));

      const { data: jobs, error } = await supabase.from("jobs").insert(jobInserts).select("id");
      if (error) throw error;

      const ids = (jobs ?? []).map((j: { id: string }) => j.id);
      setCreatedJobIds(ids);

      // Update contract status
      await updateContract.mutateAsync({ status: "Jobs Created" });
    } catch (err) {
      alert("Failed to create jobs. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  if (contractLoading || unitsLoading) {
    return <FormSkeleton />;
  }

  if (!contract) {
    return <div className="py-12 text-center text-sm text-muted">Contract not found</div>;
  }

  const jobsAlreadyCreated = contract.status === "Jobs Created";

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Create Jobs</h2>
        <p className="mt-0.5 text-sm text-muted">
          Create construction jobs from the {units.length} unit(s) in this contract
        </p>
      </div>

      {/* Contract Status */}
      <div className="mb-6 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted">Contract Status:</span>
          <StatusBadge status={contract.status} />
        </div>
      </div>

      {/* Units to become jobs */}
      {units.length === 0 ? (
        <EmptyState
          title="No units to create jobs from"
          description="Add units to this contract first before creating jobs"
        />
      ) : (
        <>
          <div className="mb-6 rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
              Units to Create as Jobs ({units.length})
            </h3>
            <div className="space-y-2">
              {units.map((unit: { id: string; lot_number?: string | null; plan_name?: string | null; elevation?: string | null; phase?: string | null }) => (
                <div
                  key={unit.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{unit.lot_number ?? "---"}</p>
                      <p className="text-xs text-muted">
                        {[unit.plan_name, unit.elevation, unit.phase].filter(Boolean).join(" / ") || "No details"}
                      </p>
                    </div>
                  </div>
                  {createdJobIds.length > 0 && <span className="text-sm text-success">{"✓"}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Create Jobs Button */}
          {jobsAlreadyCreated || createdJobIds.length > 0 ? (
            <div className="rounded-lg border-2 border-success bg-green-50 px-4 py-4 text-center">
              <span className="mx-auto mb-2 block text-2xl text-success">{"✓"}</span>
              <p className="text-sm font-semibold text-success">Jobs Created Successfully</p>
              <p className="mt-1 text-xs text-muted">
                {createdJobIds.length || units.length} job(s) have been created from this contract
              </p>
              {createdJobIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate({ to: "/construction" })}
                  className="mt-3 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-gray-50"
                >
                  View Jobs in Construction
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleCreateJobs}
              disabled={creating || units.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creating {units.length} Job(s)...
                </>
              ) : (
                <>
                  Create {units.length} Job(s)
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}

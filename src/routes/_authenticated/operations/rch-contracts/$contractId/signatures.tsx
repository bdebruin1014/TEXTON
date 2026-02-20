import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle, Clock, Send } from "lucide-react";
import { useState } from "react";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/operations/rch-contracts/$contractId/signatures")({
  component: Signatures,
});

function Signatures() {
  const { contractId } = Route.useParams();
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);

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

  const updateContract = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("rch_contracts").update(updates).eq("id", contractId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rch-contract", contractId] });
    },
  });

  const handleSendForSignature = async () => {
    setSending(true);
    // Placeholder - would integrate with DocuSign or similar e-sign provider
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await updateContract.mutateAsync({ status: "Pending Signature" });
    setSending(false);
    alert("E-sign integration is not yet connected. Status has been updated to Pending Signature.");
  };

  const handleMarkClientSigned = async () => {
    await updateContract.mutateAsync({
      client_signed_at: new Date().toISOString(),
    });
  };

  const handleMarkRchSigned = async () => {
    await updateContract.mutateAsync({
      rch_signed_at: new Date().toISOString(),
      status: "Executed",
    });
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  if (!contract) {
    return <div className="py-12 text-center text-sm text-muted">Contract not found</div>;
  }

  const clientSigned = !!contract.client_signed_at;
  const rchSigned = !!contract.rch_signed_at;
  const fullyExecuted = clientSigned && rchSigned;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Signatures</h2>
          <p className="mt-0.5 text-sm text-muted">E-signature status and actions</p>
        </div>
        {!fullyExecuted && (
          <button
            type="button"
            onClick={handleSendForSignature}
            disabled={sending}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {sending ? "Sending..." : "Send for Signature"}
          </button>
        )}
      </div>

      {/* Overall Status */}
      <div className="mb-6 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted">Contract Status:</span>
          <StatusBadge status={contract.status} />
        </div>
      </div>

      {/* Signature Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Client Signature */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-3">
            {clientSigned ? (
              <CheckCircle className="h-6 w-6 text-success" />
            ) : (
              <Clock className="h-6 w-6 text-warning" />
            )}
            <h3 className="text-sm font-semibold text-foreground">Client Signature</h3>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted">Signer</p>
              <p className="text-sm font-medium text-foreground">{contract.owner_name ?? "Not specified"}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Signed At</p>
              <p className="text-sm font-medium text-foreground">
                {contract.client_signed_at ? formatDate(contract.client_signed_at) : "Awaiting signature"}
              </p>
            </div>
          </div>
          {!clientSigned && (
            <button
              type="button"
              onClick={handleMarkClientSigned}
              className="mt-4 flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary-50"
            >
              <CheckCircle className="h-4 w-4" />
              Mark as Signed
            </button>
          )}
        </div>

        {/* RCH Signature */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-3">
            {rchSigned ? (
              <CheckCircle className="h-6 w-6 text-success" />
            ) : (
              <Clock className="h-6 w-6 text-warning" />
            )}
            <h3 className="text-sm font-semibold text-foreground">RCH Signature</h3>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted">Signer</p>
              <p className="text-sm font-medium text-foreground">Red Cedar Homes</p>
            </div>
            <div>
              <p className="text-xs text-muted">Signed At</p>
              <p className="text-sm font-medium text-foreground">
                {contract.rch_signed_at ? formatDate(contract.rch_signed_at) : "Awaiting signature"}
              </p>
            </div>
          </div>
          {!rchSigned && (
            <button
              type="button"
              onClick={handleMarkRchSigned}
              className="mt-4 flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary-50"
            >
              <CheckCircle className="h-4 w-4" />
              Mark as Signed
            </button>
          )}
        </div>
      </div>

      {/* Fully Executed Banner */}
      {fullyExecuted && (
        <div className="mt-6 rounded-lg border-2 border-success bg-green-50 px-4 py-4 text-center">
          <CheckCircle className="mx-auto mb-2 h-8 w-8 text-success" />
          <p className="text-sm font-semibold text-success">Contract Fully Executed</p>
          <p className="mt-1 text-xs text-muted">
            Client signed {formatDate(contract.client_signed_at)} &middot; RCH signed{" "}
            {formatDate(contract.rch_signed_at)}
          </p>
        </div>
      )}
    </div>
  );
}

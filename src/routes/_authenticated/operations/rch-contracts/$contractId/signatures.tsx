import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useDocuSealConfig } from "@/hooks/useDocuSeal";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/operations/rch-contracts/$contractId/signatures")({
  component: Signatures,
});

function Signatures() {
  const { contractId } = Route.useParams();
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [signerEmail, setSignerEmail] = useState("");
  const [signerName, setSignerName] = useState("");

  const { data: docuSealConfig, isLoading: configLoading } = useDocuSealConfig();

  const { data: contract, isLoading } = useQuery({
    queryKey: ["rch-contract", contractId],
    queryFn: async () => {
      const { data, error } = await supabase.from("rch_contracts").select("*").eq("id", contractId).single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch esign templates for contract signing
  const { data: esignTemplates = [] } = useQuery({
    queryKey: ["esign-templates-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("esign_templates")
        .select("id, name, docuseal_template_id, category")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Pre-fill signer info from contract
  useEffect(() => {
    if (contract?.client_name) {
      setSignerName(contract.client_name);
    }
  }, [contract?.client_name]);

  const updateContract = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("rch_contracts").update(updates).eq("id", contractId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rch-contract", contractId] });
    },
  });

  const handleSendClick = () => {
    // Validate required fields
    if (!contract?.client_name) {
      toast.error("Client name is required. Fill it in on the Overview tab first.");
      return;
    }
    if (!contract?.contract_amount) {
      toast.error("Contract amount is required before sending for signature.");
      return;
    }

    // Check DocuSeal configuration
    if (!docuSealConfig?.is_active) {
      toast.error("E-sign integration not configured. Contact admin to set up DocuSeal in Admin > Integrations.");
      return;
    }

    if (esignTemplates.length === 0) {
      toast.error("No e-sign templates available. Sync templates in Admin > E-Sign Templates.");
      return;
    }

    // Show confirmation
    setShowConfirm(true);
  };

  const handleConfirmSend = async () => {
    if (!signerEmail.trim()) {
      toast.error("Signer email is required.");
      return;
    }
    if (!signerEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    const templateId = selectedTemplateId ?? esignTemplates[0]?.id;
    if (!templateId) {
      toast.error("No e-sign template selected.");
      return;
    }

    setSending(true);
    try {
      // 1. Create an esign_document record to track this submission
      const { data: esignDoc, error: docErr } = await supabase
        .from("esign_documents")
        .insert({
          title: `RCH Contract ${contract?.contract_number ?? ""}`.trim(),
          template_id: templateId,
          record_type: "rch_contract",
          record_id: contractId,
          status: "Sent",
        })
        .select("id")
        .single();

      if (docErr) throw docErr;

      // 2. Call the DocuSeal Edge Function to create the submission
      const { error: fnErr } = await supabase.functions.invoke("docuseal-create-submission", {
        body: {
          entityId: docuSealConfig?.entity_id,
          documentId: esignDoc.id,
          templateId,
          signers: [
            {
              name: signerName.trim() || contract?.client_name || "Client",
              email: signerEmail.trim(),
              role: "Client",
            },
          ],
          fieldValues: [
            [
              { name: "contract_number", default_value: contract?.contract_number ?? "" },
              { name: "client_name", default_value: contract?.client_name ?? "" },
              { name: "contract_amount", default_value: String(contract?.contract_amount ?? "") },
              { name: "effective_date", default_value: contract?.effective_date ?? "" },
              { name: "contract_type", default_value: contract?.contract_type ?? "" },
            ],
          ],
        },
      });

      if (fnErr) throw fnErr;

      // 3. Update contract status
      await updateContract.mutateAsync({ status: "Pending Signature" });

      toast.success(`Sent to ${signerEmail.trim()} for signature`);
      setShowConfirm(false);
      queryClient.invalidateQueries({ queryKey: ["esign-documents"] });
    } catch (err) {
      toast.error(`Failed to send: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSending(false);
    }
  };

  const handleMarkClientSigned = async () => {
    await updateContract.mutateAsync({
      client_signed_at: new Date().toISOString(),
    });
    toast.success("Client signature recorded");
  };

  const handleMarkRchSigned = async () => {
    await updateContract.mutateAsync({
      rch_signed_at: new Date().toISOString(),
      status: "Executed",
    });
    toast.success("Contract marked as fully executed");
  };

  if (isLoading || configLoading) {
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
            onClick={handleSendClick}
            disabled={sending}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send for Signature"}
          </button>
        )}
      </div>

      {/* DocuSeal config warning */}
      {!docuSealConfig?.is_active && (
        <div className="mb-6 rounded-lg border border-warning-bg bg-warning-bg px-4 py-3">
          <p className="text-sm font-medium text-warning-text">
            E-sign integration not configured. Contact admin to set up DocuSeal in Admin &gt; Integrations.
          </p>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowConfirm(false)}
            aria-label="Close"
          />
          <div className="relative z-10 w-full max-w-md rounded-lg border border-border bg-card shadow-xl">
            <div className="px-6 pt-6 pb-2">
              <h3 className="text-lg font-semibold text-foreground">Send for Signature</h3>
              <p className="mt-0.5 text-sm text-muted">
                Send contract {contract.contract_number ?? ""} for e-signature via DocuSeal.
              </p>
            </div>
            <div className="space-y-4 px-6 py-4">
              <div>
                <label
                  htmlFor="signer-name"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted"
                >
                  Signer Name
                </label>
                <input
                  id="signer-name"
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
                />
              </div>
              <div>
                <label
                  htmlFor="signer-email"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted"
                >
                  Signer Email <span className="text-destructive">*</span>
                </label>
                <input
                  id="signer-email"
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
                />
              </div>
              {esignTemplates.length > 1 && (
                <div>
                  <label
                    htmlFor="esign-template"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted"
                  >
                    E-Sign Template
                  </label>
                  <select
                    id="esign-template"
                    value={selectedTemplateId ?? esignTemplates[0]?.id ?? ""}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
                  >
                    {esignTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                disabled={sending || !signerEmail.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? "Sending..." : `Send to ${signerName || "signer"}`}
              </button>
            </div>
          </div>
        </div>
      )}

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
            {clientSigned ? <span className="text-lg text-success">{"\u2713"}</span> : null}
            <h3 className="text-sm font-semibold text-foreground">Client Signature</h3>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted">Signer</p>
              <p className="text-sm font-medium text-foreground">{contract.client_name ?? "Not specified"}</p>
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
              {"\u2713"} Mark as Signed
            </button>
          )}
        </div>

        {/* RCH Signature */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-3">
            {rchSigned ? <span className="text-lg text-success">{"\u2713"}</span> : null}
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
              {"\u2713"} Mark as Signed
            </button>
          )}
        </div>
      </div>

      {/* Fully Executed Banner */}
      {fullyExecuted && (
        <div className="mt-6 rounded-lg border-2 border-success bg-green-50 px-4 py-4 text-center">
          <span className="mx-auto mb-2 block text-2xl text-success">{"\u2713"}</span>
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

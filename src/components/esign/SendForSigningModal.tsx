import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useCreateDocuSealSubmission } from "@/hooks/useDocuSeal";
import { supabase } from "@/lib/supabase";

interface SendForSigningModalProps {
  documentId: string;
  onClose: () => void;
}

interface EsignTemplate {
  id: string;
  name: string;
  description: string | null;
  docuseal_template_id: number | null;
  status: string;
}

interface Signer {
  id: number;
  name: string;
  email: string;
  role: string;
}

export function SendForSigningModal({ documentId, onClose }: SendForSigningModalProps) {
  const [step, setStep] = useState<"template" | "signers" | "sending" | "done">("template");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [nextId, setNextId] = useState(2);
  const [signers, setSigners] = useState<Signer[]>([{ id: 1, name: "", email: "", role: "Signer 1" }]);

  const createSubmission = useCreateDocuSealSubmission();

  const { data: templates = [] } = useQuery<EsignTemplate[]>({
    queryKey: ["esign-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("esign_templates")
        .select("id, name, description, docuseal_template_id, status")
        .eq("status", "Active")
        .not("docuseal_template_id", "is", null)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addSigner = () => {
    setSigners([...signers, { id: nextId, name: "", email: "", role: `Signer ${signers.length + 1}` }]);
    setNextId((n) => n + 1);
  };

  const removeSigner = (idx: number) => {
    if (signers.length <= 1) return;
    setSigners(signers.filter((_, i) => i !== idx));
  };

  const updateSigner = (idx: number, field: keyof Signer, value: string) => {
    setSigners(signers.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const handleSend = async () => {
    const validSigners = signers.filter((s) => s.name && s.email);
    if (!selectedTemplateId || validSigners.length === 0) {
      toast.error("Select a template and add at least one signer");
      return;
    }

    setStep("sending");

    try {
      await createSubmission.mutateAsync({
        documentId,
        templateId: selectedTemplateId,
        signers: validSigners,
      });
      setStep("done");
      toast.success("Document sent for signing!");
    } catch {
      toast.error("Failed to send for signing");
      setStep("signers");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Send for Signing</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-foreground" aria-label="Close">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {step === "template" && (
            <div>
              <p className="mb-3 text-sm text-muted">Select a DocuSeal template:</p>
              {templates.length === 0 ? (
                <p className="text-sm text-muted">No synced templates. Sync from Admin &gt; Integrations first.</p>
              ) : (
                <div className="space-y-2">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedTemplateId(t.id);
                        setStep("signers");
                      }}
                      className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:border-primary/30 hover:bg-accent"
                    >
                      <div>
                        <div className="text-sm font-medium">{t.name}</div>
                        {t.description && <div className="text-xs text-muted">{t.description}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === "signers" && (
            <div>
              <p className="mb-3 text-sm text-muted">Add signers:</p>
              <div className="space-y-3">
                {signers.map((signer, idx) => (
                  <div key={signer.id} className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={signer.name}
                        onChange={(e) => updateSigner(idx, "name", e.target.value)}
                        placeholder="Full name"
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                      />
                      <input
                        type="email"
                        value={signer.email}
                        onChange={(e) => updateSigner(idx, "email", e.target.value)}
                        placeholder="Email address"
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                      />
                      <input
                        type="text"
                        value={signer.role}
                        onChange={(e) => updateSigner(idx, "role", e.target.value)}
                        placeholder="Role (e.g. Buyer)"
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                      />
                    </div>
                    {signers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSigner(idx)}
                        className="mt-1 text-muted hover:text-destructive"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addSigner}
                className="mt-3 text-sm font-medium text-primary hover:underline"
              >
                + Add Signer
              </button>
            </div>
          )}

          {step === "sending" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted">Sending to DocuSeal...</p>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-bg">
                <svg
                  className="h-6 w-6 text-success-text"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-medium">Sent for signing!</p>
              <p className="text-sm text-muted">Signers will receive an email with signing instructions.</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 rounded-lg bg-button px-4 py-2 text-sm font-medium text-white hover:bg-button-hover"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {step === "signers" && (
          <div className="flex justify-between border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={() => setStep("template")}
              className="text-sm text-muted hover:text-foreground"
            >
              &larr; Back
            </button>
            <button
              type="button"
              onClick={handleSend}
              className="rounded-lg bg-button px-6 py-2 text-sm font-semibold text-white hover:bg-button-hover"
            >
              Send for Signing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

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
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const { data: contract, isLoading } = useQuery({
    queryKey: ["rch-contract", contractId],
    queryFn: async () => {
      const { data, error } = await supabase.from("rch_contracts").select("*").eq("id", contractId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: units = [] } = useQuery({
    queryKey: ["rch-contract-units", contractId],
    queryFn: async () => {
      const { data, error } = await supabase.from("rch_contract_units").select("*").eq("contract_id", contractId);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch document templates that support rch_contract record type
  const { data: templates = [] } = useQuery({
    queryKey: ["doc-templates-rch"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("id, name, description, category")
        .eq("is_active", true)
        .contains("record_types", ["rch_contract"])
        .order("name");
      if (error) {
        // Fallback: get all active templates if contains filter fails
        const { data: all } = await supabase
          .from("document_templates")
          .select("id, name, description, category")
          .eq("is_active", true)
          .order("name");
        return all ?? [];
      }
      return data ?? [];
    },
  });

  // Check if a previously generated document exists
  const { data: existingDoc } = useQuery({
    queryKey: ["rch-contract-generated-doc", contractId],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("id, file_url, storage_path, generation_status, name")
        .eq("record_type", "rch_contract")
        .eq("record_id", contractId)
        .eq("source", "generated")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      // 1. Create document record
      const template = templates.find((t) => t.id === templateId);
      const { data: doc, error: insertErr } = await supabase
        .from("documents")
        .insert({
          name: template?.name ?? "RCH Contract",
          file_type: "html",
          record_type: "rch_contract",
          record_id: contractId,
          source: "generated",
          generated_from_template_id: templateId,
          status: "processing",
          generation_status: "pending",
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;

      // 2. Call Edge Function
      const { data, error: fnErr } = await supabase.functions.invoke("generate-document", {
        body: {
          documentId: doc.id,
          templateId,
          recordType: "rch_contract",
          recordId: contractId,
        },
      });

      if (fnErr) {
        await supabase
          .from("documents")
          .update({ generation_status: "failed", generation_error: fnErr.message })
          .eq("id", doc.id);
        throw fnErr;
      }

      return { documentId: doc.id, url: data?.url };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ["rch-contract-generated-doc", contractId] });
      toast.success("Contract generated successfully");

      // Fetch the generated HTML for preview
      if (result.url) {
        try {
          const resp = await fetch(result.url);
          const html = await resp.text();
          setPreviewHtml(html);
          setPreviewUrl(result.url);
        } catch {
          setPreviewUrl(result.url);
        }
      }
    },
    onError: (err) => {
      toast.error(`Generation failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    },
  });

  const handleGenerate = () => {
    const templateId = selectedTemplateId ?? templates[0]?.id;
    if (!templateId) {
      toast.error("No document template available. Create one in Admin > Documents first.");
      return;
    }
    generateMutation.mutate(templateId);
  };

  // Load existing preview if available
  const loadExistingPreview = async () => {
    if (!existingDoc?.file_url) return;
    try {
      const resp = await fetch(existingDoc.file_url);
      const html = await resp.text();
      setPreviewHtml(html);
      setPreviewUrl(existingDoc.file_url);
    } catch {
      setPreviewUrl(existingDoc.file_url);
    }
  };

  const handleDownloadHtml = () => {
    if (!previewHtml && !previewUrl) {
      toast.error("Generate a contract first");
      return;
    }
    if (previewHtml) {
      const blob = new Blob([previewHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${contract?.contract_number ?? "contract"}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (previewUrl) {
      window.open(previewUrl, "_blank");
    }
  };

  const handleDownloadPdf = async () => {
    if (!previewHtml) {
      toast.error("Generate a contract first");
      return;
    }
    setPdfGenerating(true);
    try {
      // Create a temporary container with the HTML content for pdf rendering
      const container = document.createElement("div");
      container.innerHTML = previewHtml;
      container.style.width = "8.5in";
      container.style.padding = "0.5in";
      container.style.fontFamily = "Arial, sans-serif";
      container.style.fontSize = "12px";
      container.style.lineHeight = "1.6";
      document.body.appendChild(container);

      const { default: html2pdf } = await import("html2pdf.js");
      await html2pdf()
        .from(container)
        .set({
          margin: [0.5, 0.5, 0.5, 0.5],
          filename: `${contract?.contract_number ?? "contract"}.pdf`,
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
        })
        .save();

      document.body.removeChild(container);
      toast.success("PDF downloaded");
    } catch (err) {
      toast.error(`PDF generation failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setPdfGenerating(false);
    }
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  if (!contract) {
    return <div className="py-12 text-center text-sm text-muted">Contract not found</div>;
  }

  const hasPreview = !!previewHtml || !!previewUrl;
  const hasExisting = existingDoc?.generation_status === "completed" && existingDoc.file_url;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Contract Preview</h2>
          <p className="mt-0.5 text-sm text-muted">Generate and preview the contract document</p>
        </div>
        <div className="flex items-center gap-2">
          {hasPreview && (
            <>
              <button
                type="button"
                onClick={handleDownloadHtml}
                className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary-50"
              >
                Download HTML
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfGenerating || !previewHtml}
                className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pdfGenerating ? "Generating PDF..." : "Download PDF"}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generateMutation.isPending ? "Generating..." : hasPreview ? "Regenerate" : "Generate Contract"}
          </button>
        </div>
      </div>

      {/* Template selector (if multiple templates available) */}
      {templates.length > 1 && (
        <div className="mb-4">
          <label htmlFor="template-select" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
            Template
          </label>
          <select
            id="template-select"
            value={selectedTemplateId ?? templates[0]?.id ?? ""}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={hasPreview ? "grid grid-cols-1 gap-6 lg:grid-cols-2" : ""}>
        {/* Contract Summary Card */}
        <div>
          <div className="mb-4 rounded-lg border border-border bg-card p-6">
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
                <p className="text-xs text-muted">Client</p>
                <p className="text-sm font-medium text-foreground">{contract.client_name ?? "---"}</p>
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
                <p className="text-xs text-muted">Effective Date</p>
                <p className="text-sm font-medium text-foreground">{formatDate(contract.effective_date) || "---"}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Created</p>
                <p className="text-sm font-medium text-foreground">{formatDate(contract.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Units Preview */}
          {units.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
                Units ({units.length})
              </h3>
              <div className="space-y-2">
                {units.map(
                  (unit: {
                    id: string;
                    lot_number?: string | null;
                    plan_name?: string | null;
                    elevation?: string | null;
                  }) => (
                    <div
                      key={unit.id}
                      className="flex items-center gap-4 rounded-lg border border-border bg-background px-4 py-2"
                    >
                      <span className="text-sm font-medium text-foreground">{unit.lot_number ?? "---"}</span>
                      <span className="text-sm text-muted">{unit.plan_name ?? "---"}</span>
                      <span className="text-sm text-muted">{unit.elevation ?? "---"}</span>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </div>

        {/* Preview Pane */}
        {hasPreview ? (
          <div className="rounded-lg border border-border bg-white">
            <div className="border-b border-border px-4 py-2">
              <p className="text-xs font-medium text-muted">Document Preview</p>
            </div>
            <iframe
              srcDoc={previewHtml ?? undefined}
              src={!previewHtml && previewUrl ? previewUrl : undefined}
              title="Contract Preview"
              className="h-[700px] w-full"
              sandbox="allow-same-origin"
            />
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-border bg-gray-50 p-12 text-center">
            <p className="text-sm font-medium text-foreground">Document Preview</p>
            <p className="mt-1 text-sm text-muted">
              {templates.length === 0
                ? "No document templates found. Create one in Admin > Documents with record type 'rch_contract'."
                : "Click \"Generate Contract\" to create a document from the contract data above."}
            </p>
            {hasExisting && !hasPreview && (
              <button
                type="button"
                onClick={loadExistingPreview}
                className="mt-4 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary-50"
              >
                Load Previous Preview
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

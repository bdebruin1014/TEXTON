import type { UploadedFile } from "@/components/intake/FileUploadZone";
import type { LinkedRecord } from "@/components/intake/RecordLinker";
import type { IntakeModuleConfig } from "@/lib/intake-configs";

interface AIIntakePreviewPanelProps {
  config: IntakeModuleConfig;
  currentStep: number;
  stepTexts: Record<string, string>;
  linkedRecords: LinkedRecord[];
  uploadedFiles: UploadedFile[];
}

const TYPE_BADGE_COLORS: Record<string, string> = {
  project: "bg-blue-100 text-blue-700",
  opportunity: "bg-amber-100 text-amber-700",
  contact: "bg-green-100 text-green-700",
  entity: "bg-purple-100 text-purple-700",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function deriveSuggestedName(text: string): string {
  if (!text.trim()) return "";
  const cleaned = text.trim().replace(/\s+/g, " ");
  if (cleaned.length <= 60) return cleaned;
  const truncated = cleaned.slice(0, 60);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${truncated.slice(0, lastSpace > 30 ? lastSpace : 60)}...`;
}

function truncateText(text: string, maxLen = 200): string {
  if (!text || text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}...`;
}

export function AIIntakePreviewPanel({
  config,
  currentStep,
  stepTexts,
  linkedRecords,
  uploadedFiles,
}: AIIntakePreviewPanelProps) {
  const { label, previewFields, steps } = config;
  const hasLinkedRecords = linkedRecords.length > 0;
  const hasFiles = uploadedFiles.length > 0;

  // Find the file upload step index (1-based)
  const fileUploadStepIndex = steps.findIndex((s) => s.showFileUpload) + 1;
  // Find the record linker step index (1-based)
  const recordLinkerStepIndex = steps.findIndex((s) => s.showRecordLinker) + 1;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">{label} Preview</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Builds as you describe the details</p>
      </div>

      <div className="divide-y divide-border">
        {/* Preview fields */}
        {previewFields.map((field) => {
          // Derive value from step texts
          let displayValue = "";
          if (field.deriveFrom) {
            displayValue = deriveSuggestedName(stepTexts[field.deriveFrom] ?? "");
          }

          // Show placeholder for fields that derive from step data
          const showValue = currentStep >= 1 && displayValue;

          return (
            <div key={field.key} className="px-5 py-4">
              <span className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                {field.label}
              </span>
              {field.type === "badge" ? (
                showValue ? (
                  <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {displayValue}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">AI-assigned after creation</span>
                )
              ) : field.type === "currency" ? (
                <span className="text-sm text-foreground">
                  {showValue ? (
                    displayValue
                  ) : (
                    <span className="text-muted-foreground">AI-extracted after creation</span>
                  )}
                </span>
              ) : field.type === "date" ? (
                <span className="text-sm text-foreground">
                  {showValue ? displayValue : <span className="text-muted-foreground">AI-assigned after creation</span>}
                </span>
              ) : (
                <p className="text-sm text-foreground leading-relaxed">
                  {showValue ? truncateText(displayValue) : <span className="text-muted-foreground">---</span>}
                </p>
              )}
            </div>
          );
        })}

        {/* Step text summaries */}
        {steps
          .filter((step) => !step.showFileUpload && stepTexts[step.stateKey])
          .map((step, index) => {
            const text = stepTexts[step.stateKey] ?? "";
            if (!text) return null;
            // Skip if this is the first step and we already show it as the derived name
            const isShownAsPreviewField = previewFields.some((f) => f.deriveFrom === step.stateKey);
            if (isShownAsPreviewField) return null;

            return (
              <div key={step.id} className="px-5 py-4">
                <span className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                  Step {index + 1} Response
                </span>
                <p className="text-sm text-foreground leading-relaxed">{truncateText(text)}</p>
              </div>
            );
          })}

        {/* Linked Records */}
        {recordLinkerStepIndex > 0 && (
          <div className="px-5 py-4">
            <span className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              Linked Records
            </span>
            {currentStep >= recordLinkerStepIndex && hasLinkedRecords ? (
              <div className="flex flex-wrap gap-1.5">
                {linkedRecords.map((r) => (
                  <span
                    key={`${r.record_type}-${r.record_id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs"
                  >
                    <span
                      className={`rounded px-1 py-0.5 text-[10px] font-medium ${TYPE_BADGE_COLORS[r.record_type] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {r.record_type}
                    </span>
                    <span className="text-foreground truncate max-w-[140px]">{r.label}</span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">---</span>
            )}
          </div>
        )}

        {/* Documents */}
        <div className="px-5 py-4">
          <span className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            Documents
          </span>
          {currentStep >= fileUploadStepIndex && hasFiles ? (
            <ul className="space-y-1.5">
              {uploadedFiles.map((f) => (
                <li key={f.storage_path} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0">[file]</span>
                  <span className="truncate text-foreground">{f.file_name}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatFileSize(f.file_size)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-sm text-muted-foreground">
              {currentStep >= fileUploadStepIndex ? "No documents attached" : "---"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

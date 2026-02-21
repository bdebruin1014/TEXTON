import { useMemo } from "react";

interface MatterPreviewPanelProps {
  currentStep: number;
  situationText: string;
  relevantInfoText: string;
  goalsText: string;
  linkedRecords: Array<{ record_type: string; record_id: string; label: string }>;
  uploadedFiles: Array<{ file_name: string; storage_path: string; file_size: number; mime_type: string }>;
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

/** Derive a suggested title from the first ~80 chars of the situation */
function deriveSuggestedTitle(text: string): string {
  if (!text.trim()) return "";
  const cleaned = text.trim().replace(/\s+/g, " ");
  if (cleaned.length <= 60) return cleaned;
  const truncated = cleaned.slice(0, 60);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${truncated.slice(0, lastSpace > 30 ? lastSpace : 60)}...`;
}

/** Simple keyword-based category suggestion */
function suggestCategory(situation: string, info: string): string | null {
  const combined = `${situation} ${info}`.toLowerCase();
  const keywords: [string, string[]][] = [
    ["Contract Dispute", ["contract dispute", "breach of contract", "contract issue"]],
    ["Insurance Claim", ["insurance", "claim", "coverage"]],
    ["Legal", ["attorney", "lawsuit", "litigation", "legal"]],
    ["Zoning", ["zoning", "variance", "rezoning"]],
    ["Permitting", ["permit", "permitting", "building permit"]],
    ["Title Issue", ["title", "lien", "encumbrance"]],
    ["Construction Defect", ["defect", "construction defect", "warranty claim"]],
    ["Environmental", ["environmental", "remediation", "contamination"]],
    ["Tax", ["tax", "assessment", "abatement"]],
    ["Refinance", ["refinance", "refi", "refinancing"]],
    ["Compliance", ["compliance", "violation", "code enforcement"]],
    ["Vendor Dispute", ["vendor", "supplier", "subcontractor dispute"]],
    ["Partnership", ["partnership", "partner dispute", "operating agreement"]],
    ["Investor Relations", ["investor", "distribution", "capital call"]],
  ];

  for (const [label, kws] of keywords) {
    if (kws.some((kw) => combined.includes(kw))) return label;
  }
  return null;
}

export function MatterPreviewPanel({
  currentStep,
  situationText,
  relevantInfoText,
  goalsText,
  linkedRecords,
  uploadedFiles,
}: MatterPreviewPanelProps) {
  const suggestedTitle = useMemo(() => deriveSuggestedTitle(situationText), [situationText]);
  const suggestedCategory = useMemo(
    () => suggestCategory(situationText, relevantInfoText),
    [situationText, relevantInfoText],
  );

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">Matter Preview</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Builds as you describe the situation</p>
      </div>

      <div className="divide-y divide-border">
        {/* Title */}
        <div className="px-5 py-4">
          <span className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            Suggested Title
          </span>
          <p className="text-sm text-foreground">
            {currentStep >= 1 && suggestedTitle ? suggestedTitle : <span className="text-muted-foreground">---</span>}
          </p>
        </div>

        {/* Category */}
        <div className="px-5 py-4">
          <span className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            Category
          </span>
          {currentStep >= 1 && suggestedCategory ? (
            <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {suggestedCategory}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">---</span>
          )}
        </div>

        {/* Situation Summary */}
        <div className="px-5 py-4">
          <span className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            Situation
          </span>
          <p className="text-sm text-foreground leading-relaxed">
            {currentStep >= 2 && situationText ? (
              situationText.length > 200 ? (
                `${situationText.slice(0, 200)}...`
              ) : (
                situationText
              )
            ) : (
              <span className="text-muted-foreground">---</span>
            )}
          </p>
        </div>

        {/* Linked Records */}
        <div className="px-5 py-4">
          <span className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            Linked Records
          </span>
          {currentStep >= 2 && linkedRecords.length > 0 ? (
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

        {/* Goals & Priority */}
        <div className="px-5 py-4">
          <span className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            Goals / Desired Outcome
          </span>
          <p className="text-sm text-foreground leading-relaxed">
            {currentStep >= 3 && goalsText ? (
              goalsText.length > 200 ? (
                `${goalsText.slice(0, 200)}...`
              ) : (
                goalsText
              )
            ) : (
              <span className="text-muted-foreground">---</span>
            )}
          </p>
        </div>

        {/* Priority / Target Date placeholders */}
        <div className="px-5 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                Priority
              </span>
              <span className="text-sm text-muted-foreground">
                {currentStep >= 3 ? "AI-assigned after creation" : "---"}
              </span>
            </div>
            <div>
              <span className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                Target Date
              </span>
              <span className="text-sm text-muted-foreground">
                {currentStep >= 3 ? "AI-assigned after creation" : "---"}
              </span>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="px-5 py-4">
          <span className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            Documents
          </span>
          {currentStep >= 4 && uploadedFiles.length > 0 ? (
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
            <span className="text-sm text-muted-foreground">{currentStep >= 4 ? "No documents attached" : "---"}</span>
          )}
        </div>
      </div>
    </div>
  );
}

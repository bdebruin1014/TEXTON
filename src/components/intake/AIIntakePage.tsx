import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { AIIntakeChat } from "@/components/intake/AIIntakeChat";
import { AIIntakePreviewPanel } from "@/components/intake/AIIntakePreviewPanel";
import type { UploadedFile } from "@/components/intake/FileUploadZone";
import type { LinkedRecord } from "@/components/intake/RecordLinker";
import type { IntakeModuleConfig } from "@/lib/intake-configs";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useEntityStore } from "@/stores/entityStore";

interface AIIntakePageProps {
  config: IntakeModuleConfig;
}

export function AIIntakePage({ config }: AIIntakePageProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const activeEntityId = useEntityStore((s) => s.activeEntityId);

  // ── Intake state ───────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);
  const [stepTexts, setStepTexts] = useState<Record<string, string>>({});
  const [linkedRecords, setLinkedRecords] = useState<LinkedRecord[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Step completion handler ────────────────────────────────────────────
  const handleStepComplete = useCallback(
    (step: number, text: string) => {
      const stepConfig = config.steps[step - 1];
      if (!stepConfig) return;

      setStepTexts((prev) => ({ ...prev, [stepConfig.stateKey]: text }));
      if (step < config.steps.length) {
        setCurrentStep(step + 1);
      }
    },
    [config.steps],
  );

  // ── Create record handler ─────────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    if (!user?.id) {
      setError("You must be logged in to create a record.");
      return;
    }

    const firstStepKey = config.steps[0]?.stateKey ?? "";
    const firstStepText = stepTexts[firstStepKey] ?? "";

    if (!firstStepText.trim()) {
      setError(`Please provide a description before creating this ${config.label.toLowerCase()}.`);
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const payload = {
        moduleKey: config.moduleKey,
        userId: user.id,
        entityId: activeEntityId,
        steps: stepTexts,
        linkedRecords,
        uploadedFiles,
      };

      // For matters, use the existing generate-matter function
      const { data, error: fnError } = await supabase.functions.invoke(config.edgeFunctionName, {
        body: payload,
      });

      if (fnError) throw fnError;
      if (!data?.success || !data?.record_id) {
        throw new Error(`Failed to create ${config.label.toLowerCase()}. Please try again.`);
      }

      // Navigate to the detail page
      const detailRoute = config.detailRoute;
      const paramKey = config.detailParamKey;

      navigate({
        to: detailRoute,
        params: { [paramKey]: data.record_id },
      } as Parameters<typeof navigate>[0]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
      setIsCreating(false);
    }
  }, [user?.id, config, stepTexts, linkedRecords, uploadedFiles, activeEntityId, navigate]);

  const lastBreadcrumb = config.breadcrumbs[config.breadcrumbs.length - 1] ?? "";
  const parentBreadcrumbs = config.breadcrumbs.slice(0, -1);

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          {parentBreadcrumbs.map((crumb, i) => (
            <span key={crumb} className="flex items-center gap-2">
              {i > 0 && <span>/</span>}
              {i === parentBreadcrumbs.length - 1 ? (
                <button
                  type="button"
                  onClick={() => navigate({ to: config.listRoute } as Parameters<typeof navigate>[0])}
                  className="hover:text-foreground transition-colors"
                >
                  {crumb}
                </button>
              ) : (
                <span>{crumb}</span>
              )}
            </span>
          ))}
          <span>/</span>
          <span className="text-foreground font-medium">{lastBreadcrumb}</span>
        </div>
        <h1 className="text-xl font-semibold text-foreground">New {config.label}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Describe the details and we'll create your {config.label.toLowerCase()} with AI-extracted fields.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 font-medium underline hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Two-column layout */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left: Chat (60%) */}
        <div className="w-full lg:w-[60%]">
          <div className="h-[calc(100vh-14rem)]">
            <AIIntakeChat
              config={config}
              currentStep={currentStep}
              onStepComplete={handleStepComplete}
              onLinkedRecordsChange={setLinkedRecords}
              onFilesChange={setUploadedFiles}
              onCreate={handleCreate}
              isCreating={isCreating}
              linkedRecords={linkedRecords}
              uploadedFiles={uploadedFiles}
            />
          </div>
        </div>

        {/* Right: Preview (40%) */}
        <div className="w-full lg:w-[40%]">
          <div className="lg:sticky lg:top-6">
            <AIIntakePreviewPanel
              config={config}
              currentStep={currentStep}
              stepTexts={stepTexts}
              linkedRecords={linkedRecords}
              uploadedFiles={uploadedFiles}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

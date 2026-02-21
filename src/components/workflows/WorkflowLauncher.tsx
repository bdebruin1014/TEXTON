import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useCreateWorkflowInstance, useGenerateWorkflow } from "@/hooks/useWorkflowInstances";
import { supabase } from "@/lib/supabase";
import type { ChatMessage, WorkflowTemplate } from "@/types/workflows";
import { WorkflowChat } from "./WorkflowChat";

interface WorkflowLauncherProps {
  onClose: () => void;
  defaultRecordType?: string;
  defaultRecordId?: string;
}

type Step = "select-template" | "select-record" | "customize" | "generating" | "done";

export function WorkflowLauncher({ onClose, defaultRecordType, defaultRecordId }: WorkflowLauncherProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(defaultRecordType ? "select-template" : "select-record");
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [recordType, setRecordType] = useState(defaultRecordType ?? "");
  const [recordId, setRecordId] = useState(defaultRecordId ?? "");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [instanceId, setInstanceId] = useState<string | null>(null);

  const createInstance = useCreateWorkflowInstance();
  const generateWorkflow = useGenerateWorkflow();

  const { data: templates = [] } = useQuery<WorkflowTemplate[]>({
    queryKey: ["workflow-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_templates")
        .select("id, name, description, status, entity_id")
        .eq("status", "Active")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleTemplateSelect = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setMessages([
      {
        role: "assistant",
        content: `I'll help you set up the "${template.name}" workflow. Tell me about any customizations you'd like — specific due dates, team member assignments, tasks to add or remove, or anything specific to this record.`,
      },
    ]);
    if (recordType && recordId) {
      setStep("customize");
    } else {
      setStep("select-record");
    }
  };

  const handleRecordSelected = () => {
    if (recordType && recordId) {
      setStep("customize");
    }
  };

  const handleChatSend = useCallback((message: string) => {
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Got it! I'll incorporate that into the workflow. Any other customizations? When you're ready, click \"Generate Workflow\" to create the tasks.",
        },
      ]);
    }, 500);
  }, []);

  const handleGenerate = async () => {
    if (!selectedTemplate || !recordType || !recordId) return;

    setStep("generating");

    try {
      // Create the instance first
      const instance = await createInstance.mutateAsync({
        templateId: selectedTemplate.id,
        recordType,
        recordId,
        name: selectedTemplate.name,
        chatConversation: messages,
      });

      setInstanceId(instance.id);

      // Call edge function to generate tasks
      await generateWorkflow.mutateAsync({
        instanceId: instance.id,
        templateId: selectedTemplate.id,
        recordType,
        recordId,
        chatMessages: messages,
      });

      setStep("done");
    } catch {
      // If edge function fails, the instance still exists — user can re-generate
      setStep("customize");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Launch Workflow</h2>
            <p className="text-xs text-muted">
              {step === "select-template" && "Choose a workflow template"}
              {step === "select-record" && "Select the record to attach this workflow to"}
              {step === "customize" && "Customize with AI — or skip to generate"}
              {step === "generating" && "Generating workflow tasks..."}
              {step === "done" && "Workflow created successfully!"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-muted hover:text-foreground" aria-label="Close">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {step === "select-template" && (
            <div className="space-y-2">
              {templates.length === 0 ? (
                <p className="text-sm text-muted">
                  No active workflow templates. Create one in Workflows &gt; Templates.
                </p>
              ) : (
                templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTemplateSelect(t)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary/30 hover:bg-accent"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                      W
                    </div>
                    <div>
                      <div className="text-sm font-medium">{t.name}</div>
                      {t.description && <div className="text-xs text-muted">{t.description}</div>}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {step === "select-record" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="wf-record-type" className="mb-1.5 block text-sm font-medium">
                  Record Type
                </label>
                <select
                  id="wf-record-type"
                  value={recordType}
                  onChange={(e) => setRecordType(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select type...</option>
                  <option value="opportunity">Opportunity</option>
                  <option value="project">Project</option>
                  <option value="job">Job</option>
                  <option value="disposition">Disposition</option>
                  <option value="rch_contract">RCH Contract</option>
                  <option value="matter">Matter</option>
                </select>
              </div>
              <div>
                <label htmlFor="wf-record-id" className="mb-1.5 block text-sm font-medium">
                  Record ID
                </label>
                <input
                  id="wf-record-id"
                  type="text"
                  value={recordId}
                  onChange={(e) => setRecordId(e.target.value)}
                  placeholder="Paste record ID..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={handleRecordSelected}
                disabled={!recordType || !recordId}
                className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white hover:bg-button-hover disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          )}

          {step === "customize" && (
            <div>
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-accent p-2">
                <span className="text-xs font-medium text-muted">Template:</span>
                <span className="text-xs font-semibold">{selectedTemplate?.name}</span>
              </div>
              <div className="rounded-lg border border-border">
                <WorkflowChat
                  messages={messages}
                  onSend={handleChatSend}
                  placeholder="Describe customizations (dates, assignments, extra tasks)..."
                />
              </div>
            </div>
          )}

          {step === "generating" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted">AI is generating your workflow tasks...</p>
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
              <p className="font-medium">Workflow created!</p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (instanceId) {
                    navigate({ to: "/workflows/instances/$instanceId", params: { instanceId } });
                  }
                }}
                className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white hover:bg-button-hover"
              >
                View Workflow
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "customize" && (
          <div className="flex justify-end border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generateWorkflow.isPending}
              className="rounded-lg bg-button px-6 py-2 text-sm font-semibold text-white hover:bg-button-hover disabled:opacity-50"
            >
              Generate Workflow
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

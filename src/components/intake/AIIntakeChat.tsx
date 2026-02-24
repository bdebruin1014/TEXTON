import { useCallback, useEffect, useRef, useState } from "react";
import { FileUploadZone, type UploadedFile } from "@/components/intake/FileUploadZone";
import { type LinkedRecord, RecordLinker } from "@/components/intake/RecordLinker";
import { VoiceInputButton } from "@/components/intake/VoiceInputButton";
import type { IntakeModuleConfig } from "@/lib/intake-configs";

// ── Types ──────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "system" | "user";
  content: string;
  step: number;
}

interface AIIntakeChatProps {
  config: IntakeModuleConfig;
  currentStep: number;
  onStepComplete: (step: number, text: string) => void;
  onLinkedRecordsChange: (records: LinkedRecord[]) => void;
  onFilesChange: (files: UploadedFile[]) => void;
  onCreate: () => void;
  isCreating: boolean;
  linkedRecords: LinkedRecord[];
  uploadedFiles: UploadedFile[];
}

let messageIdCounter = 0;
function nextId(): string {
  messageIdCounter += 1;
  return `msg-${messageIdCounter}-${Date.now()}`;
}

// ── Component ──────────────────────────────────────────────────────────

export function AIIntakeChat({
  config,
  currentStep,
  onStepComplete,
  onLinkedRecordsChange,
  onFilesChange,
  onCreate,
  isCreating,
  linkedRecords,
  uploadedFiles,
}: AIIntakeChatProps) {
  const { steps, storageBucket, label } = config;
  const totalSteps = steps.length;
  const currentStepConfig = steps[currentStep - 1];
  const isFileUploadStep = currentStepConfig?.showFileUpload ?? false;
  const isTextInputStep = !isFileUploadStep && currentStep <= totalSteps;

  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: nextId(), role: "system", content: steps[0]?.prompt ?? "", step: 1 },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastStepRef = useRef(1);

  // Auto-scroll to bottom on new messages
  const messagesLength = messages.length;
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll must re-fire when message count changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesLength]);

  // Add system message when step advances
  useEffect(() => {
    if (currentStep > lastStepRef.current && currentStep <= totalSteps) {
      const step = steps[currentStep - 1];
      if (step) {
        setMessages((prev) => [...prev, { id: nextId(), role: "system", content: step.prompt, step: currentStep }]);
      }
      lastStepRef.current = currentStep;
    }
  }, [currentStep, totalSteps, steps]);

  // Auto-resize textarea
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }, []);

  // Send message handler
  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || !isTextInputStep) return;

    setMessages((prev) => [...prev, { id: nextId(), role: "user", content: text, step: currentStep }]);
    setInputValue("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    onStepComplete(currentStep, text);
  }, [inputValue, currentStep, onStepComplete, isTextInputStep]);

  // Keyboard handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // Voice transcript handler
  const handleVoiceTranscript = useCallback((text: string) => {
    setInputValue(text);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, []);

  // Handle file upload messages
  const handleFilesChange = useCallback(
    (files: UploadedFile[]) => {
      // Find new files that weren't in the previous list
      const prevCount = uploadedFiles.length;
      const newFiles = files.slice(prevCount);

      if (newFiles.length > 0) {
        const names = newFiles.map((f) => f.file_name).join(", ");
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "user", content: `Uploaded: ${names}`, step: currentStep },
        ]);
      }

      onFilesChange(files);
    },
    [uploadedFiles.length, onFilesChange, currentStep],
  );

  // Determine which step shows the record linker
  const showRecordLinker = currentStepConfig?.showRecordLinker && currentStep <= totalSteps;
  // Show create button once we have at least the first step text
  const showCreateButton = currentStep >= 2;

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card shadow-sm">
      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user" ? "bg-primary text-white" : "bg-accent text-muted-foreground"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Record linker (shown at the configured step) */}
        {showRecordLinker && (
          <div className="px-1 py-2">
            <RecordLinker linkedRecords={linkedRecords} onChange={onLinkedRecordsChange} />
          </div>
        )}

        {/* File upload zone (shown at the configured step) */}
        {isFileUploadStep && (
          <FileUploadZone
            storageBucket={storageBucket}
            uploadedFiles={uploadedFiles}
            onFilesChange={handleFilesChange}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border px-4 py-3">
        {/* Text input row (hidden at file upload steps) */}
        {isTextInputStep && (
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={currentStepConfig?.placeholder ?? "Type your response..."}
              rows={1}
              className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <VoiceInputButton onTranscript={handleVoiceTranscript} disabled={!isTextInputStep} />
            <button
              type="button"
              onClick={handleSend}
              disabled={inputValue.trim().length === 0}
              className="flex h-9 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        )}

        {/* Create button */}
        {showCreateButton && (
          <div className={isTextInputStep ? "mt-3" : ""}>
            <button
              type="button"
              onClick={onCreate}
              disabled={isCreating}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? `Creating ${label}...` : `Create ${label}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

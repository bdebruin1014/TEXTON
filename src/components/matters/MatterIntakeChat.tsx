import { useCallback, useEffect, useRef, useState } from "react";
import { RecordLinker } from "@/components/matters/RecordLinker";
import { VoiceInputButton } from "@/components/matters/VoiceInputButton";
import { Sentry } from "@/lib/sentry";
import { supabase } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "system" | "user";
  content: string;
  step: number;
}

interface LinkedRecord {
  record_type: string;
  record_id: string;
  label: string;
}

interface UploadedFile {
  file_name: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
}

interface MatterIntakeChatProps {
  currentStep: number;
  onStepComplete: (step: number, text: string) => void;
  onLinkedRecordsChange: (records: LinkedRecord[]) => void;
  onFilesChange: (files: UploadedFile[]) => void;
  onCreateMatter: () => void;
  isCreating: boolean;
  linkedRecords: LinkedRecord[];
}

// ── Step System Messages ───────────────────────────────────────────────

const STEP_PROMPTS: Record<number, string> = {
  1: "Let's create a new matter. Describe the situation \u2014 what's going on?",
  2: "Tell me about the relevant parties and any important background. You can also search and link existing records below.",
  3: "What's the desired outcome? What needs to happen, and by when?",
  4: "Upload any relevant documents (optional). When ready, click 'Create Matter' below.",
};

let messageIdCounter = 0;
function nextId(): string {
  messageIdCounter += 1;
  return `msg-${messageIdCounter}-${Date.now()}`;
}

// ── Component ──────────────────────────────────────────────────────────

export function MatterIntakeChat({
  currentStep,
  onStepComplete,
  onLinkedRecordsChange,
  onFilesChange,
  onCreateMatter,
  isCreating,
  linkedRecords,
}: MatterIntakeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: nextId(), role: "system", content: STEP_PROMPTS[1] as string, step: 1 },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastStepRef = useRef(1);

  // Auto-scroll to bottom on new messages
  const messagesLength = messages.length;
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll must re-fire when message count changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesLength]);

  // Add system message when step advances
  useEffect(() => {
    if (currentStep > lastStepRef.current && currentStep <= 4) {
      const prompt = STEP_PROMPTS[currentStep];
      if (prompt) {
        setMessages((prev) => [...prev, { id: nextId(), role: "system", content: prompt, step: currentStep }]);
      }
      lastStepRef.current = currentStep;
    }
  }, [currentStep]);

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
    if (!text || currentStep > 3) return;

    // Add user message
    setMessages((prev) => [...prev, { id: nextId(), role: "user", content: text, step: currentStep }]);
    setInputValue("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Notify parent
    onStepComplete(currentStep, text);
  }, [inputValue, currentStep, onStepComplete]);

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

  // File upload handler
  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setIsUploading(true);

      const newFiles: UploadedFile[] = [];

      for (const file of Array.from(files)) {
        try {
          const path = `intake-uploads/${Date.now()}-${file.name}`;
          const { error } = await supabase.storage.from("matter-documents").upload(path, file);
          if (error) {
            Sentry.captureException(error);
            continue;
          }
          newFiles.push({
            file_name: file.name,
            storage_path: path,
            file_size: file.size,
            mime_type: file.type,
          });
        } catch (err) {
          Sentry.captureException(err);
        }
      }

      if (newFiles.length > 0) {
        const updatedFiles = [...uploadedFiles, ...newFiles];
        setUploadedFiles(updatedFiles);
        onFilesChange(updatedFiles);

        // Add user message about uploads
        const names = newFiles.map((f) => f.file_name).join(", ");
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "user",
            content: `Uploaded: ${names}`,
            step: 4,
          },
        ]);
      }

      setIsUploading(false);
    },
    [uploadedFiles, onFilesChange],
  );

  // Remove uploaded file
  const handleRemoveFile = useCallback(
    (index: number) => {
      const updated = uploadedFiles.filter((_, i) => i !== index);
      setUploadedFiles(updated);
      onFilesChange(updated);
    },
    [uploadedFiles, onFilesChange],
  );

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload],
  );

  const canSend = inputValue.trim().length > 0 && currentStep <= 3;
  const showCreateButton = currentStep >= 3;
  const isDocStep = currentStep >= 4;

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

        {/* Record linker (shown at step 2) */}
        {currentStep === 2 && (
          <div className="px-1 py-2">
            <RecordLinker linkedRecords={linkedRecords} onChange={onLinkedRecordsChange} />
          </div>
        )}

        {/* File upload zone (shown at step 4) */}
        {isDocStep && (
          <div className="px-1 py-2">
            {/* biome-ignore lint/a11y/noStaticElementInteractions: drop zone requires drag event handlers */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                isDragOver ? "border-primary bg-primary/5" : "border-border bg-accent/30"
              }`}
            >
              <div className="text-2xl text-muted-foreground mb-2">[+]</div>
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop files here, or{" "}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary font-medium underline underline-offset-2 hover:text-primary/80"
                >
                  browse
                </button>
              </p>
              <p className="text-xs text-muted-foreground">PDF, Word, Images, Excel</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.csv,.txt"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              {isUploading && <p className="mt-2 text-xs text-primary font-medium">Uploading...</p>}
            </div>

            {/* Uploaded files list */}
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {uploadedFiles.map((f, i) => (
                  <div
                    key={f.storage_path}
                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground shrink-0">[file]</span>
                    <span className="truncate text-foreground flex-1">{f.file_name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {f.file_size < 1024 * 1024
                        ? `${(f.file_size / 1024).toFixed(1)} KB`
                        : `${(f.file_size / (1024 * 1024)).toFixed(1)} MB`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(i)}
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors text-xs"
                      aria-label={`Remove ${f.file_name}`}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border px-4 py-3">
        {/* Text input row (hidden at step 4+) */}
        {currentStep <= 3 && (
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={
                currentStep === 1
                  ? "Describe the situation..."
                  : currentStep === 2
                    ? "Describe parties and background..."
                    : "Describe desired outcome and timeline..."
              }
              rows={1}
              className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <VoiceInputButton onTranscript={handleVoiceTranscript} disabled={currentStep > 3} />
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className="flex h-9 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        )}

        {/* Create Matter button */}
        {showCreateButton && (
          <div className={currentStep <= 3 ? "mt-3" : ""}>
            <button
              type="button"
              onClick={onCreateMatter}
              disabled={isCreating}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? "Creating Matter..." : "Create Matter"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useCallback, useRef, useState } from "react";
import { VariablePicker } from "./VariablePicker";

interface TemplateEditorProps {
  value: string;
  onChange: (html: string) => void;
  recordType: string;
  disabled?: boolean;
}

export function TemplateEditor({ value, onChange, recordType, disabled }: TemplateEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleInsertVariable = useCallback(
    (variable: string) => {
      const el = textareaRef.current;
      if (!el) return;

      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newValue = value.slice(0, start) + variable + value.slice(end);
      onChange(newValue);

      // Restore cursor position after insert
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + variable.length, start + variable.length);
      });
    },
    [value, onChange],
  );

  return (
    <div className="flex h-[600px] rounded-lg border border-border overflow-hidden">
      {/* Main editor area */}
      <div className="flex flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-border bg-accent/30 px-3 py-2">
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            className={`rounded px-2 py-1 text-xs font-medium ${
              !showPreview ? "bg-card text-foreground shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            Editor
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className={`rounded px-2 py-1 text-xs font-medium ${
              showPreview ? "bg-card text-foreground shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            Preview
          </button>
          <div className="flex-1" />
          <span className="text-[10px] text-muted">Use {"{{variable}}"} placeholders for dynamic content</span>
        </div>

        {/* Editor / Preview */}
        {showPreview ? (
          <div className="flex-1 overflow-y-auto bg-white p-6">
            <div
              className="prose prose-sm max-w-none"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: Template preview requires HTML rendering
              dangerouslySetInnerHTML={{
                __html: value.replace(
                  /\{\{(\w+(?:\.\w+)*)\}\}/g,
                  '<span style="background:#4A8C5E;color:white;padding:1px 4px;border-radius:3px;font-size:11px;">$1</span>',
                ),
              }}
            />
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="Enter template HTML here... Use {{variable_name}} for dynamic content."
            className="flex-1 resize-none bg-background p-4 font-mono text-sm outline-none"
            spellCheck={false}
          />
        )}
      </div>

      {/* Variable picker sidebar */}
      <div className="w-56 border-l border-border bg-card">
        <VariablePicker recordType={recordType} onInsert={handleInsertVariable} />
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";

export interface FieldConfig {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "number" | "date" | "select" | "textarea";
  required?: boolean;
  placeholder?: string;
  options?: Array<string | { label: string; value: string }>;
  defaultValue?: string;
}

interface CreateRecordModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  fields: FieldConfig[];
  onSubmit: (values: Record<string, string>) => void | Promise<void>;
  submitLabel?: string;
  loading?: boolean;
}

/**
 * Generic modal overlay for creating new records.
 *
 * Renders a centered dialog with configurable form fields.
 * Closes on backdrop click, Escape key, or Cancel button.
 * Calls onSubmit with a key-value map of field values.
 */
export function CreateRecordModal({
  open,
  onClose,
  title,
  description,
  fields,
  onSubmit,
  submitLabel = "Create",
  loading = false,
}: CreateRecordModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const firstInputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null);

  // Reset form when opened
  useEffect(() => {
    if (open) {
      const defaults: Record<string, string> = {};
      for (const field of fields) {
        defaults[field.name] = field.defaultValue ?? "";
      }
      setValues(defaults);
      // Focus first input after mount
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [open, fields]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const setValue = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(values);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close modal" />

      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="px-6 pb-6">
          <div className="space-y-4 pt-2">
            {fields.map((field, idx) => {
              const inputId = `create-modal-${field.name}`;
              const isFirst = idx === 0;

              return (
                <div key={field.name}>
                  <label
                    htmlFor={inputId}
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted"
                  >
                    {field.label}
                    {field.required && <span className="ml-0.5 text-destructive">*</span>}
                  </label>

                  {field.type === "select" ? (
                    <select
                      id={inputId}
                      ref={isFirst ? (firstInputRef as React.Ref<HTMLSelectElement>) : undefined}
                      value={values[field.name] ?? ""}
                      onChange={(e) => setValue(field.name, e.target.value)}
                      required={field.required}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
                    >
                      <option value="">Select...</option>
                      {field.options?.map((opt) => {
                        const label = typeof opt === "string" ? opt : opt.label;
                        const value = typeof opt === "string" ? opt : opt.value;
                        return (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      id={inputId}
                      ref={isFirst ? (firstInputRef as React.Ref<HTMLTextAreaElement>) : undefined}
                      value={values[field.name] ?? ""}
                      onChange={(e) => setValue(field.name, e.target.value)}
                      required={field.required}
                      placeholder={field.placeholder}
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
                    />
                  ) : (
                    <input
                      id={inputId}
                      ref={isFirst ? (firstInputRef as React.Ref<HTMLInputElement>) : undefined}
                      type={field.type ?? "text"}
                      value={values[field.name] ?? ""}
                      onChange={(e) => setValue(field.name, e.target.value)}
                      required={field.required}
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover disabled:opacity-50"
            >
              {loading ? "Creating..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

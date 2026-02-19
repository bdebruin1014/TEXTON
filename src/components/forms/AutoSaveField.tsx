import { useCallback, useEffect, useState } from "react";
import { SaveIndicator } from "@/components/shared/SaveIndicator";
import { type SaveStatus, useAutoSave } from "@/hooks/useAutoSave";
import { cn } from "@/lib/utils";

interface AutoSaveFieldProps {
  label: string;
  value: string | number | null | undefined;
  onSave: (value: string) => Promise<void>;
  type?: "text" | "number" | "email" | "tel" | "url" | "date" | "textarea";
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  rows?: number;
}

export function AutoSaveField({
  label,
  value,
  onSave,
  type = "text",
  placeholder,
  className,
  disabled,
  rows = 3,
}: AutoSaveFieldProps) {
  const [localValue, setLocalValue] = useState(String(value ?? ""));

  useEffect(() => {
    setLocalValue(String(value ?? ""));
  }, [value]);

  const saveFn = useCallback(
    async (v: string) => {
      if (v === String(value ?? "")) return;
      await onSave(v);
    },
    [onSave, value],
  );

  const { status } = useAutoSave(localValue, saveFn);

  const inputClasses = cn(
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors",
    "focus:border-primary focus:ring-1 focus:ring-primary",
    "disabled:cursor-not-allowed disabled:opacity-50",
    className,
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <SaveIndicator status={status} />
      </div>
      {type === "textarea" ? (
        <textarea
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={cn(inputClasses, "resize-y")}
        />
      ) : (
        <input
          type={type}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClasses}
        />
      )}
    </div>
  );
}

// Simpler select field with auto-save
interface AutoSaveSelectProps {
  label: string;
  value: string | null | undefined;
  onSave: (value: string) => Promise<void>;
  options: readonly string[] | { label: string; value: string }[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function AutoSaveSelect({
  label,
  value,
  onSave,
  options,
  placeholder,
  className,
  disabled,
}: AutoSaveSelectProps) {
  const [localValue, setLocalValue] = useState(value ?? "");
  const [status, setStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    setLocalValue(value ?? "");
  }, [value]);

  const handleChange = async (newValue: string) => {
    setLocalValue(newValue);
    if (newValue === (value ?? "")) return;
    setStatus("saving");
    try {
      await onSave(newValue);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <SaveIndicator status={status} />
      </div>
      <select
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors",
          "focus:border-primary focus:ring-1 focus:ring-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => {
          const val = typeof opt === "string" ? opt : opt.value;
          const lbl = typeof opt === "string" ? opt : opt.label;
          return (
            <option key={val} value={val}>
              {lbl}
            </option>
          );
        })}
      </select>
    </div>
  );
}

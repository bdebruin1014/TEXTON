import { useEffect, useState } from "react";
import { SaveIndicator } from "@/components/shared/SaveIndicator";
import type { SaveStatus } from "@/hooks/useAutoSave";
import { STATUS_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface StatusSelectProps {
  label: string;
  value: string | null | undefined;
  onSave: (value: string) => Promise<void>;
  statuses: readonly string[];
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export function StatusSelect({ label, value, onSave, statuses, className, disabled, required }: StatusSelectProps) {
  const [localValue, setLocalValue] = useState(value ?? "");
  const [status, setStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    setLocalValue(value ?? "");
  }, [value]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    if (newValue === (value ?? "")) return;
    setStatus("saving");
    Promise.resolve().then(async () => {
      try {
        await onSave(newValue);
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      } catch {
        setStatus("error");
      }
    });
  };

  const currentColors = STATUS_COLORS[localValue];
  const isRequiredEmpty = required && localValue.trim() === "";
  const fieldState = isRequiredEmpty ? "field-required-empty" : "";

  return (
    <div className={cn("space-y-1.5", fieldState)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <SaveIndicator status={status} />
      </div>
      <div className="flex items-center gap-2">
        {currentColors && <span className={cn("inline-flex h-2 w-2 rounded-full", currentColors.bg)} />}
        <select
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className={cn(
            "flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors",
            "focus:border-primary focus:ring-1 focus:ring-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <option value="" disabled>
            Select status...
          </option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

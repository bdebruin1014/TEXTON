import { useCallback, useEffect, useState } from "react";
import { SaveIndicator } from "@/components/shared/SaveIndicator";
import { useAutoSave } from "@/hooks/useAutoSave";
import { cn } from "@/lib/utils";

interface PercentageInputProps {
  label: string;
  value: number | null | undefined; // stored as decimal (0.10 = 10%)
  onSave: (value: number) => Promise<void>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function PercentageInput({ label, value, onSave, placeholder, className, disabled }: PercentageInputProps) {
  const displayPercent = value != null ? (value * 100).toString() : "";
  const [localDisplay, setLocalDisplay] = useState(displayPercent);
  const [decimalValue, setDecimalValue] = useState(value ?? 0);

  useEffect(() => {
    setLocalDisplay(value != null ? (value * 100).toString() : "");
    setDecimalValue(value ?? 0);
  }, [value]);

  const saveFn = useCallback(
    async (v: number) => {
      if (v === (value ?? 0)) return;
      await onSave(v);
    },
    [onSave, value],
  );

  const { status } = useAutoSave(decimalValue, saveFn);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalDisplay(raw);
    const num = Number.parseFloat(raw);
    setDecimalValue(Number.isNaN(num) ? 0 : num / 100);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <SaveIndicator status={status} />
      </div>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={localDisplay}
          onChange={handleChange}
          placeholder={placeholder ?? "0"}
          disabled={disabled}
          className={cn(
            "w-full rounded-lg border border-border bg-background py-2 pl-3 pr-7 text-sm text-foreground outline-none transition-colors",
            "focus:border-primary focus:ring-1 focus:ring-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
      </div>
    </div>
  );
}

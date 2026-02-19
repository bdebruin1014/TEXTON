import { useCallback, useEffect, useState } from "react";
import { SaveIndicator } from "@/components/shared/SaveIndicator";
import { useAutoSave } from "@/hooks/useAutoSave";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  label: string;
  value: number | null | undefined;
  onSave: (value: number) => Promise<void>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function formatForDisplay(val: number | null | undefined): string {
  if (val == null || val === 0) return "";
  return val.toLocaleString("en-US");
}

function parseFromDisplay(str: string): number {
  const cleaned = str.replace(/[^0-9.-]/g, "");
  const num = Number.parseFloat(cleaned);
  return Number.isNaN(num) ? 0 : num;
}

export function CurrencyInput({ label, value, onSave, placeholder, className, disabled }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(formatForDisplay(value));
  const [numericValue, setNumericValue] = useState(value ?? 0);

  useEffect(() => {
    setDisplayValue(formatForDisplay(value));
    setNumericValue(value ?? 0);
  }, [value]);

  const saveFn = useCallback(
    async (v: number) => {
      if (v === (value ?? 0)) return;
      await onSave(v);
    },
    [onSave, value],
  );

  const { status } = useAutoSave(numericValue, saveFn);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayValue(raw);
    setNumericValue(parseFromDisplay(raw));
  };

  const handleBlur = () => {
    setDisplayValue(formatForDisplay(numericValue));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <SaveIndicator status={status} />
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
        <input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder ?? "0"}
          disabled={disabled}
          className={cn(
            "w-full rounded-lg border border-border bg-background py-2 pl-7 pr-3 text-sm text-foreground outline-none transition-colors",
            "focus:border-primary focus:ring-1 focus:ring-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        />
      </div>
    </div>
  );
}

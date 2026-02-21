import { useEffect, useState } from "react";
import { SaveIndicator } from "@/components/shared/SaveIndicator";
import type { SaveStatus } from "@/hooks/useAutoSave";
import { type CostBook, useCostBooks } from "@/hooks/useCostBooks";
import { cn } from "@/lib/utils";

interface CostBookSelectProps {
  label: string;
  value: string | null | undefined;
  onSave: (value: string) => Promise<void>;
  onBookSelected?: (book: CostBook) => void;
  className?: string;
  disabled?: boolean;
}

export function CostBookSelect({ label, value, onSave, onBookSelected, className, disabled }: CostBookSelectProps) {
  const [localValue, setLocalValue] = useState(value ?? "");
  const [status, setStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    setLocalValue(value ?? "");
  }, [value]);

  const { data: books = [] } = useCostBooks();

  // Filter to only show Active and Draft books (not Archived) for new selection
  const selectableBooks = books.filter((b) => b.status !== "Archived");

  const handleChange = async (newValue: string) => {
    setLocalValue(newValue);
    if (newValue === (value ?? "")) return;
    setStatus("saving");
    try {
      await onSave(newValue);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);

      if (onBookSelected && newValue) {
        const selected = books.find((b) => b.id === newValue);
        if (selected) onBookSelected(selected);
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <label className="block space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
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
        <option value="">No cost book (use plan defaults)</option>
        {selectableBooks.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
            {b.is_default ? " (Default)" : ""}
            {b.effective_date ? ` — ${b.effective_date}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

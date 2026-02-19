import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SaveIndicator } from "@/components/shared/SaveIndicator";
import type { SaveStatus } from "@/hooks/useAutoSave";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface LotSelectProps {
  label: string;
  value: string | null | undefined;
  projectId: string;
  onSave: (value: string) => Promise<void>;
  filterStatuses?: string[];
  className?: string;
  disabled?: boolean;
}

interface Lot {
  id: string;
  lot_number: string;
  status: string;
}

export function LotSelect({ label, value, projectId, onSave, filterStatuses, className, disabled }: LotSelectProps) {
  const [localValue, setLocalValue] = useState(value ?? "");
  const [status, setStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    setLocalValue(value ?? "");
  }, [value]);

  const { data: lots = [] } = useQuery<Lot[]>({
    queryKey: ["lots-select", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lots")
        .select("id, lot_number, status")
        .eq("project_id", projectId)
        .order("lot_number");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
  });

  const filteredLots = filterStatuses ? lots.filter((l) => filterStatuses.includes(l.status)) : lots;

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
        disabled={disabled || !projectId}
        className={cn(
          "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors",
          "focus:border-primary focus:ring-1 focus:ring-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <option value="">Select lot...</option>
        {filteredLots.map((l) => (
          <option key={l.id} value={l.id}>
            Lot {l.lot_number} ({l.status})
          </option>
        ))}
      </select>
    </div>
  );
}

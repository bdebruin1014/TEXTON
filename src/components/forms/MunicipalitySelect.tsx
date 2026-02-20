import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SaveIndicator } from "@/components/shared/SaveIndicator";
import type { SaveStatus } from "@/hooks/useAutoSave";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export interface MunicipalityFees {
  water_tap: number | null;
  sewer_tap: number | null;
  gas_tap: number | null;
  permitting: number | null;
  impact: number | null;
  architect: number | null;
  engineering: number | null;
  survey: number | null;
}

interface MunicipalitySelectProps {
  label: string;
  value: string | null | undefined;
  onSave: (value: string) => Promise<void>;
  onFeesLoaded?: (fees: MunicipalityFees) => void;
  className?: string;
  disabled?: boolean;
}

interface Municipality {
  id: string;
  name: string;
  county: string | null;
  state: string | null;
  water_tap: number | null;
  sewer_tap: number | null;
  gas_tap: number | null;
  permitting: number | null;
  impact: number | null;
  architect: number | null;
  engineering: number | null;
  survey: number | null;
}

export function MunicipalitySelect({
  label,
  value,
  onSave,
  onFeesLoaded,
  className,
  disabled,
}: MunicipalitySelectProps) {
  const [localValue, setLocalValue] = useState(value ?? "");
  const [status, setStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    setLocalValue(value ?? "");
  }, [value]);

  const { data: municipalities = [] } = useQuery<Municipality[]>({
    queryKey: ["municipalities-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("municipalities")
        .select("id, name, county, state, water_tap, sewer_tap, gas_tap, permitting, impact, architect, engineering, survey")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleChange = async (newValue: string) => {
    setLocalValue(newValue);
    if (newValue === (value ?? "")) return;
    setStatus("saving");
    try {
      await onSave(newValue);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);

      if (onFeesLoaded && newValue) {
        const selected = municipalities.find((m) => m.id === newValue);
        if (selected) {
          onFeesLoaded({
            water_tap: selected.water_tap,
            sewer_tap: selected.sewer_tap,
            gas_tap: selected.gas_tap,
            permitting: selected.permitting,
            impact: selected.impact,
            architect: selected.architect,
            engineering: selected.engineering,
            survey: selected.survey,
          });
        }
      }
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
        <option value="">Select municipality...</option>
        {municipalities.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
            {m.county ? ` (${m.county})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

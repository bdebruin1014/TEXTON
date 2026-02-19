import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SaveIndicator } from "@/components/shared/SaveIndicator";
import type { SaveStatus } from "@/hooks/useAutoSave";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface FloorPlanSelectProps {
  label: string;
  value: string | null | undefined;
  projectId: string;
  onSave: (value: string) => Promise<void>;
  className?: string;
  disabled?: boolean;
}

interface FloorPlan {
  id: string;
  plan_name: string;
  square_footage: number | null;
}

export function FloorPlanSelect({ label, value, projectId, onSave, className, disabled }: FloorPlanSelectProps) {
  const [localValue, setLocalValue] = useState(value ?? "");
  const [status, setStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    setLocalValue(value ?? "");
  }, [value]);

  const { data: plans = [] } = useQuery<FloorPlan[]>({
    queryKey: ["floor-plans-select", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("floor_plans")
        .select("id, plan_name, square_footage")
        .eq("project_id", projectId)
        .order("plan_name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
  });

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
        <option value="">Select floor plan...</option>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.plan_name}
            {p.square_footage ? ` (${p.square_footage.toLocaleString()} sf)` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

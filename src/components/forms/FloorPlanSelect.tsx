import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SaveIndicator } from "@/components/shared/SaveIndicator";
import type { SaveStatus } from "@/hooks/useAutoSave";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export interface FloorPlanData {
  id: string;
  name: string;
  heated_sqft: number | null;
  plan_type: string | null;
  bed_count: number | null;
  bath_count: number | null;
  stories: number | null;
  garage_bays: number | null;
  garage_type: string | null;
  width_ft: number | null;
  depth_ft: number | null;
  base_construction_cost: number | null;
  contract_snb: number | null;
  dm_budget_snb: number | null;
  contract_total: number | null;
}

interface FloorPlanSelectProps {
  label: string;
  value: string | null | undefined;
  projectId?: string;
  onSave: (value: string) => Promise<void>;
  onPlanLoaded?: (plan: FloorPlanData) => void;
  className?: string;
  disabled?: boolean;
}

export function FloorPlanSelect({
  label,
  value,
  projectId,
  onSave,
  onPlanLoaded,
  className,
  disabled,
}: FloorPlanSelectProps) {
  const [localValue, setLocalValue] = useState(value ?? "");
  const [status, setStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    setLocalValue(value ?? "");
  }, [value]);

  const { data: plans = [] } = useQuery<FloorPlanData[]>({
    queryKey: ["floor-plans-select", projectId ?? "global"],
    queryFn: async () => {
      let query = supabase
        .from("floor_plans")
        .select(
          "id, name, heated_sqft, plan_type, bed_count, bath_count, stories, garage_bays, garage_type, width_ft, depth_ft, base_construction_cost, contract_snb, dm_budget_snb, contract_total",
        )
        .order("name");
      if (projectId) {
        query = query.eq("project_id", projectId);
      } else {
        query = query.eq("status", "Active");
      }
      const { data, error } = await query;
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

      if (onPlanLoaded && newValue) {
        const selected = plans.find((p) => p.id === newValue);
        if (selected) onPlanLoaded(selected);
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
        <option value="">Select floor plan...</option>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.plan_type ? ` [${p.plan_type}]` : ""}
            {p.heated_sqft ? ` ${p.heated_sqft.toLocaleString()} sf` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

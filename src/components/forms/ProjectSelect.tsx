import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SaveIndicator } from "@/components/shared/SaveIndicator";
import type { SaveStatus } from "@/hooks/useAutoSave";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface ProjectSelectProps {
  label: string;
  value: string | null | undefined;
  onSave: (value: string) => Promise<void>;
  className?: string;
  disabled?: boolean;
}

interface Project {
  id: string;
  project_name: string;
  status: string;
}

export function ProjectSelect({ label, value, onSave, className, disabled }: ProjectSelectProps) {
  const [localValue, setLocalValue] = useState(value ?? "");
  const [status, setStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    setLocalValue(value ?? "");
  }, [value]);

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, project_name, status")
        .neq("status", "Completed")
        .order("project_name");
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
        <option value="">Select project...</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.project_name} ({p.status})
          </option>
        ))}
      </select>
    </div>
  );
}

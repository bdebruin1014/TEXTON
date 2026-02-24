import { useCallback, useRef } from "react";
import type { ProjectType, WorkflowTemplate } from "@/types/workflows";
import { PROJECT_TYPE_LABELS, TRIGGER_TABLES } from "@/types/workflows";

interface WorkflowTemplateFormProps {
  template: WorkflowTemplate;
  onUpdate: (updates: Partial<WorkflowTemplate>) => void;
}

export function WorkflowTemplateForm({ template, onUpdate }: WorkflowTemplateFormProps) {
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const debouncedUpdate = useCallback(
    (field: string, value: string) => {
      if (debounceTimers.current[field]) clearTimeout(debounceTimers.current[field]);
      debounceTimers.current[field] = setTimeout(() => {
        onUpdate({ [field]: value || null });
      }, 800);
    },
    [onUpdate],
  );

  const immediateUpdate = useCallback(
    (field: string, value: string | boolean) => {
      onUpdate({ [field]: value });
    },
    [onUpdate],
  );

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Name */}
        <div className="space-y-1.5 md:col-span-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Template Name</span>
          <input
            type="text"
            defaultValue={template.name}
            onChange={(e) => debouncedUpdate("name", e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Status</span>
          <select
            defaultValue={template.status}
            onChange={(e) => immediateUpdate("status", e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Draft">Draft</option>
          </select>
        </div>

        {/* Description */}
        <div className="space-y-1.5 md:col-span-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Description</span>
          <input
            type="text"
            defaultValue={template.description ?? ""}
            onChange={(e) => debouncedUpdate("description", e.target.value)}
            placeholder="What this workflow template does..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Project Type */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Project Type</span>
          <select
            defaultValue={template.project_type ?? "all"}
            onChange={(e) => immediateUpdate("project_type", e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {(Object.entries(PROJECT_TYPE_LABELS) as [ProjectType, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Trigger Table */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Trigger Table</span>
          <select
            defaultValue={template.trigger_table ?? ""}
            onChange={(e) => immediateUpdate("trigger_table", e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">Select...</option>
            {TRIGGER_TABLES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Trigger Value */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Trigger Status Value</span>
          <input
            type="text"
            defaultValue={template.trigger_value ?? ""}
            onChange={(e) => debouncedUpdate("trigger_value", e.target.value)}
            placeholder="e.g. dd, pre_construction"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Active toggle */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Active</span>
          <label className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              checked={template.is_active}
              onChange={(e) => immediateUpdate("is_active", e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm text-foreground">Template triggers when conditions are met</span>
          </label>
        </div>
      </div>
    </div>
  );
}

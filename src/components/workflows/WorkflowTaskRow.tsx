import { useCallback, useRef } from "react";
import type { WorkflowTemplateTask } from "@/types/workflows";
import { ASSIGNED_ROLES, ROLE_LABELS } from "@/types/workflows";

interface WorkflowTaskRowProps {
  task: WorkflowTemplateTask;
  onUpdate: (id: string, updates: Partial<WorkflowTemplateTask>) => void;
  onDelete: (id: string) => void;
}

export function WorkflowTaskRow({ task, onUpdate, onDelete }: WorkflowTaskRowProps) {
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const debouncedUpdate = useCallback(
    (field: string, value: string | number | boolean) => {
      if (debounceTimers.current[field]) clearTimeout(debounceTimers.current[field]);
      debounceTimers.current[field] = setTimeout(() => {
        onUpdate(task.id, { [field]: value });
      }, 800);
    },
    [task.id, onUpdate],
  );

  const immediateUpdate = useCallback(
    (field: string, value: string | number | boolean) => {
      onUpdate(task.id, { [field]: value });
    },
    [task.id, onUpdate],
  );

  return (
    <div className="group flex items-center gap-2 border-b border-border px-3 py-2 last:border-0 hover:bg-accent/30">
      {/* Drag handle placeholder */}
      <span className="shrink-0 cursor-grab text-xs text-muted select-none">::</span>

      {/* Task Name */}
      <input
        type="text"
        defaultValue={task.name}
        onChange={(e) => debouncedUpdate("name", e.target.value)}
        className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-2 py-1 text-sm text-foreground outline-none transition-colors focus:border-border focus:bg-background"
        placeholder="Task name"
      />

      {/* Role */}
      <select
        defaultValue={task.assigned_role}
        onChange={(e) => immediateUpdate("assigned_role", e.target.value)}
        className="w-[140px] shrink-0 rounded border border-transparent bg-transparent px-1 py-1 text-xs text-muted outline-none transition-colors focus:border-border focus:bg-background"
      >
        {ASSIGNED_ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>

      {/* Due Days */}
      <div className="flex shrink-0 items-center gap-1">
        <input
          type="number"
          defaultValue={task.due_days}
          onChange={(e) => debouncedUpdate("due_days", Number.parseInt(e.target.value, 10) || 0)}
          className="w-14 rounded border border-transparent bg-transparent px-1 py-1 text-center text-xs text-foreground outline-none transition-colors focus:border-border focus:bg-background"
          min={0}
        />
        <span className="text-[10px] text-muted">days</span>
      </div>

      {/* Due Reference */}
      <select
        defaultValue={task.due_reference}
        onChange={(e) => immediateUpdate("due_reference", e.target.value)}
        className="w-[110px] shrink-0 rounded border border-transparent bg-transparent px-1 py-1 text-xs text-muted outline-none transition-colors focus:border-border focus:bg-background"
      >
        <option value="trigger_date">From trigger</option>
        <option value="previous_task">From prev task</option>
      </select>

      {/* Gate checkbox */}
      <label className="flex shrink-0 items-center gap-1">
        <input
          type="checkbox"
          defaultChecked={task.is_gate}
          onChange={(e) => immediateUpdate("is_gate", e.target.checked)}
          className="rounded border-border"
        />
        <span className="text-[10px] font-medium text-muted">Gate</span>
      </label>

      {/* Role display badge */}
      {task.is_gate && (
        <span className="shrink-0 rounded bg-warning-bg px-1.5 py-0.5 text-[10px] font-semibold text-warning-text">
          GATE
        </span>
      )}

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(task.id)}
        className="shrink-0 rounded p-1 text-xs text-muted opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        title="Delete task"
      >
        &times;
      </button>
    </div>
  );
}

/** Compact read-only badge for role display */
export function RoleBadge({ role }: { role: string }) {
  return (
    <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

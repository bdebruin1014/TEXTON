import { useCallback, useRef, useState } from "react";
import type { WorkflowTemplateTask } from "@/types/workflows";
import { WorkflowTaskRow } from "./WorkflowTaskRow";

interface WorkflowPhaseSectionProps {
  phase: string;
  tasks: WorkflowTemplateTask[];
  onUpdateTask: (id: string, updates: Partial<WorkflowTemplateTask>) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: (phase: string) => void;
  onRenamePhase: (oldPhase: string, newPhase: string) => void;
  onDeletePhase: (phase: string) => void;
}

export function WorkflowPhaseSection({
  phase,
  tasks,
  onUpdateTask,
  onDeleteTask,
  onAddTask,
  onRenamePhase,
  onDeletePhase,
}: WorkflowPhaseSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleRename = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const trimmed = value.trim();
        if (trimmed && trimmed !== phase) {
          onRenamePhase(phase, trimmed);
        }
      }, 800);
    },
    [phase, onRenamePhase],
  );

  const handleEditBlur = useCallback(() => {
    setEditing(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = inputRef.current?.value.trim();
    if (trimmed && trimmed !== phase) {
      onRenamePhase(phase, trimmed);
    }
  }, [phase, onRenamePhase]);

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Phase header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="shrink-0 text-xs text-muted transition-transform"
        >
          {collapsed ? "\u25B6" : "\u25BC"}
        </button>

        {editing ? (
          <input
            ref={inputRef}
            type="text"
            defaultValue={phase}
            onChange={(e) => handleRename(e.target.value)}
            onBlur={handleEditBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleEditBlur();
            }}
            className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-0.5 text-sm font-semibold text-foreground outline-none focus:border-primary"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="min-w-0 flex-1 text-left text-sm font-semibold uppercase tracking-wider text-foreground hover:text-primary"
          >
            {phase}
          </button>
        )}

        <span className="shrink-0 rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {tasks.length} task{tasks.length !== 1 ? "s" : ""}
        </span>

        <button
          type="button"
          onClick={() => onAddTask(phase)}
          className="shrink-0 rounded px-2 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          + Add Task
        </button>

        {tasks.length === 0 && (
          <button
            type="button"
            onClick={() => onDeletePhase(phase)}
            className="shrink-0 rounded px-2 py-0.5 text-xs text-destructive transition-colors hover:bg-destructive/10"
          >
            Remove
          </button>
        )}
      </div>

      {/* Task rows */}
      {!collapsed && (
        <div>
          {tasks.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted">
              No tasks in this phase. Click "+ Add Task" to get started.
            </div>
          ) : (
            tasks.map((task) => (
              <WorkflowTaskRow key={task.id} task={task} onUpdate={onUpdateTask} onDelete={onDeleteTask} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

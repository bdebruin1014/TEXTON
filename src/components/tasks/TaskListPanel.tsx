import { useCallback, useEffect, useRef, useState } from "react";
import { useAutoSave } from "@/hooks/useAutoSave";
import { cn } from "@/lib/utils";
import type { TaskInstance } from "@/types/workflows";

interface TaskListPanelProps {
  tasks: TaskInstance[];
  onComplete: (taskId: string) => void;
  onUpdateNotes: (taskId: string, notes: string) => Promise<void>;
  onNavigateToRecord?: (recordType: string, recordId: string) => void;
}

const STATUS_DOT: Record<string, string> = {
  active: "bg-info",
  pending: "bg-accent",
  blocked: "bg-warning",
  completed: "bg-success",
  skipped: "bg-muted-foreground",
};

function daysOverdue(dueDate: string | null): number {
  if (!dueDate) return 0;
  const diff = Date.now() - new Date(dueDate).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return "No date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(dueDate));
}

function TaskRow({
  task,
  onComplete,
  onUpdateNotes,
}: {
  task: TaskInstance;
  onComplete: (taskId: string) => void;
  onUpdateNotes: (taskId: string, notes: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(task.notes ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const overdue = daysOverdue(task.due_date);
  const isCompleted = task.status === "completed";

  const saveFn = useCallback(
    async (value: string) => {
      await onUpdateNotes(task.id, value);
    },
    [task.id, onUpdateNotes],
  );

  useAutoSave(notes, saveFn);

  useEffect(() => {
    if (expanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [expanded]);

  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-card-hover"
      >
        <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[task.status] ?? "bg-accent")} />
        <span
          className={cn("flex-1 text-[13px] font-medium text-foreground", isCompleted && "line-through opacity-60")}
        >
          {task.name}
        </span>
        {task.phase && <span className="hidden text-[11px] text-muted-foreground sm:inline">{task.phase}</span>}
        <span className="text-[11px] text-muted-foreground">{formatDueDate(task.due_date)}</span>
        {overdue > 0 && !isCompleted && (
          <span className="text-[11px] font-semibold text-destructive-text">{overdue}d</span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-border/50 bg-card-hover/50 px-4 py-3 space-y-3">
          {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}

          <textarea
            ref={textareaRef}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes..."
            rows={2}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-text-hint focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />

          <div className="flex items-center justify-between">
            {!isCompleted ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete(task.id);
                }}
                className="rounded-md bg-button px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-button-hover"
              >
                Mark Complete
              </button>
            ) : (
              <span className="text-xs text-success-text font-medium">Completed</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TaskListPanel({ tasks, onComplete, onUpdateNotes }: TaskListPanelProps) {
  if (tasks.length === 0) {
    return <div className="px-4 py-8 text-center text-sm text-muted-foreground">No tasks</div>;
  }

  return (
    <div>
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} onComplete={onComplete} onUpdateNotes={onUpdateNotes} />
      ))}
    </div>
  );
}

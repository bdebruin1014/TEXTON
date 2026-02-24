import { useInstanceMilestones, useInstanceTasks, useUpdateTask } from "@/hooks/useWorkflowInstances";
import type { InstanceMilestone, InstanceTask } from "@/types/workflows";

interface WorkflowInstanceViewProps {
  instanceId: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-accent text-muted-foreground",
  in_progress: "bg-warning-bg text-warning-text",
  completed: "bg-success-bg text-success-text",
  skipped: "bg-accent text-muted-foreground line-through",
  blocked: "bg-destructive-bg text-destructive-text",
};

export function WorkflowInstanceView({ instanceId }: WorkflowInstanceViewProps) {
  const { data: milestones = [], isLoading: loadingMs } = useInstanceMilestones(instanceId);
  const { data: tasks = [], isLoading: loadingTasks } = useInstanceTasks(instanceId);
  const updateTask = useUpdateTask();

  if (loadingMs || loadingTasks) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-accent" />
        ))}
      </div>
    );
  }

  const tasksByMilestone = new Map<string | null, InstanceTask[]>();
  for (const task of tasks) {
    const key = task.milestone_id;
    if (!tasksByMilestone.has(key)) tasksByMilestone.set(key, []);
    const group = tasksByMilestone.get(key);
    if (group) group.push(task);
  }

  const unassignedTasks = tasksByMilestone.get(null) ?? [];

  const handleToggleTask = (task: InstanceTask) => {
    const nextStatus = task.status === "completed" ? "pending" : "completed";
    updateTask.mutate({ id: task.id, instance_id: instanceId, status: nextStatus });
  };

  return (
    <div className="space-y-6">
      {milestones.map((milestone) => (
        <MilestoneSection
          key={milestone.id}
          milestone={milestone}
          tasks={tasksByMilestone.get(milestone.id) ?? []}
          onToggleTask={handleToggleTask}
        />
      ))}

      {unassignedTasks.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Other Tasks</h4>
          <div className="space-y-1">
            {unassignedTasks.map((task) => (
              <TaskRow key={task.id} task={task} onToggle={() => handleToggleTask(task)} />
            ))}
          </div>
        </div>
      )}

      {milestones.length === 0 && unassignedTasks.length === 0 && (
        <p className="text-sm text-muted">No milestones or tasks generated yet.</p>
      )}
    </div>
  );
}

function MilestoneSection({
  milestone,
  tasks,
  onToggleTask,
}: {
  milestone: InstanceMilestone;
  tasks: InstanceTask[];
  onToggleTask: (task: InstanceTask) => void;
}) {
  const completed = tasks.filter((t) => t.status === "completed" || t.status === "skipped").length;
  const total = tasks.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[milestone.status]}`}>
            {milestone.status}
          </span>
          <h4 className="text-sm font-semibold">{milestone.name}</h4>
        </div>
        <span className="text-xs text-muted">
          {completed}/{total} tasks
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-accent">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="divide-y divide-border">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} onToggle={() => onToggleTask(task)} />
        ))}
      </div>
    </div>
  );
}

function TaskRow({ task, onToggle }: { task: InstanceTask; onToggle: () => void }) {
  const isCompleted = task.status === "completed";

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <button
        type="button"
        onClick={onToggle}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
          isCompleted ? "border-primary bg-primary text-white" : "border-border bg-background hover:border-primary"
        }`}
      >
        {isCompleted && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className={`text-sm ${isCompleted ? "text-muted line-through" : "text-foreground"}`}>{task.task_name}</div>
        {task.description && <div className="mt-0.5 text-xs text-muted">{task.description}</div>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {task.assignee && (
          <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium">
            {task.assignee.full_name ?? "Unassigned"}
          </span>
        )}
        {task.team && (
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
            style={{ backgroundColor: task.team.color ?? "var(--color-primary-accent)" }}
          >
            {task.team.name}
          </span>
        )}
        {task.due_date && (
          <span className="text-[10px] text-muted">
            {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
    </div>
  );
}

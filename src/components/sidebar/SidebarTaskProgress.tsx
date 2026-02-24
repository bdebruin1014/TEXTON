import { formatDate } from "@/lib/utils";

interface Task {
  status: string;
  task_name: string;
  due_date: string | null;
}

interface SidebarTaskProgressProps {
  title: string;
  tasks: Task[];
}

export function SidebarTaskProgress({ title, tasks }: SidebarTaskProgressProps) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const nextTask = tasks
    .filter((t) => t.status === "active" || t.status === "pending")
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    })[0];

  return (
    <div>
      <div className="px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-heading">{title}</span>
      </div>
      {total === 0 ? (
        <div className="px-3 py-2 text-[11px] text-sidebar-heading">No tasks</div>
      ) : (
        <div className="px-3 pb-2">
          <div className="text-[12px] text-sidebar-text">
            {completed}/{total} complete ({pct}%)
          </div>
          {/* Progress bar */}
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                backgroundColor: "var(--sidebar-active-text)",
              }}
            />
          </div>
          {/* Next task */}
          {nextTask && (
            <div className="mt-1.5 text-[11px] text-sidebar-text">
              Next: {nextTask.task_name}
              {nextTask.due_date && (
                <span className="text-sidebar-heading"> (due {formatDate(nextTask.due_date)})</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

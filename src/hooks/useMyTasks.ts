import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import type { TaskInstance } from "@/types/workflows";

export type TaskFilter = "all" | "overdue" | "due_today" | "due_this_week" | "completed";

interface TaskWithProject extends TaskInstance {
  project_name?: string | null;
}

export function useMyTasks(filter: TaskFilter = "all") {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery<TaskWithProject[]>({
    queryKey: ["my-tasks", userId, filter],
    queryFn: async () => {
      let query = supabase
        .from("task_instances")
        .select("*, project:projects(project_name)")
        .eq("assigned_to", userId ?? "")
        .order("due_date", { ascending: true });

      switch (filter) {
        case "overdue":
          query = query.eq("is_overdue", true).in("status", ["pending", "active"]);
          break;
        case "due_today":
          query = query.gte("due_date", todayStart()).lte("due_date", todayEnd()).in("status", ["pending", "active"]);
          break;
        case "due_this_week":
          query = query.gte("due_date", todayStart()).lte("due_date", weekEnd()).in("status", ["pending", "active"]);
          break;
        case "completed":
          query = query.eq("status", "completed").order("completed_at", { ascending: false }).limit(50);
          break;
        default:
          // "all" — non-completed first, then completed
          break;
      }

      const { data, error } = await query;
      if (error) throw error;

      const tasks = (data ?? []).map((t: Record<string, unknown>) => {
        const project = t.project as { project_name: string | null } | null;
        return {
          ...t,
          project_name: project?.project_name ?? null,
        } as TaskWithProject;
      });

      // Sort: overdue first (most overdue), then active by due date, then pending, then completed
      if (filter === "all") {
        return tasks.sort((a, b) => {
          const statusOrder = taskStatusOrder(a.status, a.is_overdue) - taskStatusOrder(b.status, b.is_overdue);
          if (statusOrder !== 0) return statusOrder;
          // Within same priority tier, sort by due date ascending
          const aDate = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
          const bDate = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
          return aDate - bDate;
        });
      }

      return tasks;
    },
    staleTime: 30_000,
    enabled: !!userId,
  });
}

export function useTaskFilterCounts() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery<Record<TaskFilter, number>>({
    queryKey: ["my-task-counts", userId],
    queryFn: async () => {
      const [allRes, overdueRes, todayRes, weekRes, completedRes] = await Promise.all([
        supabase
          .from("task_instances")
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", userId ?? ""),
        supabase
          .from("task_instances")
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", userId ?? "")
          .eq("is_overdue", true)
          .in("status", ["pending", "active"]),
        supabase
          .from("task_instances")
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", userId ?? "")
          .gte("due_date", todayStart())
          .lte("due_date", todayEnd())
          .in("status", ["pending", "active"]),
        supabase
          .from("task_instances")
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", userId ?? "")
          .gte("due_date", todayStart())
          .lte("due_date", weekEnd())
          .in("status", ["pending", "active"]),
        supabase
          .from("task_instances")
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", userId ?? "")
          .eq("status", "completed"),
      ]);

      return {
        all: allRes.count ?? 0,
        overdue: overdueRes.count ?? 0,
        due_today: todayRes.count ?? 0,
        due_this_week: weekRes.count ?? 0,
        completed: completedRes.count ?? 0,
      };
    },
    staleTime: 30_000,
    enabled: !!userId,
  });
}

function taskStatusOrder(status: string, isOverdue: boolean): number {
  if (isOverdue && status !== "completed") return 0;
  if (status === "active") return 1;
  if (status === "pending") return 2;
  if (status === "blocked") return 3;
  if (status === "completed") return 4;
  return 5;
}

function todayStart(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function todayEnd(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function weekEnd(): string {
  const d = new Date();
  d.setDate(d.getDate() + (7 - d.getDay()));
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

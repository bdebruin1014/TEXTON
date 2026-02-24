import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { KPICard } from "@/components/dashboard/KPICard";
import { type StatusPillItem, StatusPills } from "@/components/filters/StatusPills";
import { DashboardSkeleton } from "@/components/shared/Skeleton";
import { TaskListPanel } from "@/components/tasks/TaskListPanel";
import { useDashboardKPIs } from "@/hooks/useDashboardKPIs";
import { type TaskFilter, useMyTasks, useTaskFilterCounts } from "@/hooks/useMyTasks";
import { useRealtime } from "@/hooks/useRealtime";
import { useCompleteTask, useUpdateTaskNotes } from "@/hooks/useTaskActions";
import { supabase } from "@/lib/supabase";
import { cn, formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

// ── Zone 3 types ─────────────────────────────────────────────

interface AlertTask {
  id: string;
  name: string;
  assigned_to_name: string | null;
  due_date: string | null;
  completed_at: string | null;
  completed_by_name: string | null;
  project_name: string | null;
  is_overdue: boolean;
  status: string;
}

// ── Dashboard ────────────────────────────────────────────────

function DashboardPage() {
  const queryClient = useQueryClient();
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");

  // Zone 1: KPIs
  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs();

  // Zone 2: My Tasks
  const { data: tasks = [] } = useMyTasks(taskFilter);
  const { data: filterCounts } = useTaskFilterCounts();
  const completeTask = useCompleteTask();
  const updateNotes = useUpdateTaskNotes();

  // Zone 3: Alerts — overdue across all users
  const { data: overdueAlerts = [] } = useQuery<AlertTask[]>({
    queryKey: ["dashboard-alerts", "overdue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_instances")
        .select("id, name, due_date, is_overdue, status, project_id, assigned_to")
        .eq("is_overdue", true)
        .in("status", ["pending", "active"])
        .order("due_date", { ascending: true })
        .limit(20);
      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Resolve user names and project names
      const userIds = [...new Set(data.map((t: Record<string, unknown>) => t.assigned_to).filter(Boolean))] as string[];
      const projectIds = [
        ...new Set(data.map((t: Record<string, unknown>) => t.project_id).filter(Boolean)),
      ] as string[];

      const [usersRes, projectsRes] = await Promise.all([
        userIds.length > 0
          ? supabase.from("user_profiles").select("user_id, full_name").in("user_id", userIds)
          : Promise.resolve({ data: [] }),
        projectIds.length > 0
          ? supabase.from("projects").select("id, project_name").in("id", projectIds)
          : Promise.resolve({ data: [] }),
      ]);

      const userMap = new Map(
        (usersRes.data ?? []).map((u: { user_id: string; full_name: string | null }) => [u.user_id, u.full_name]),
      );
      const projectMap = new Map(
        (projectsRes.data ?? []).map((p: { id: string; project_name: string }) => [p.id, p.project_name]),
      );

      return data.map((t: Record<string, unknown>) => ({
        id: t.id as string,
        name: t.name as string,
        assigned_to_name: userMap.get(t.assigned_to as string) ?? "Unassigned",
        due_date: t.due_date as string | null,
        completed_at: null,
        completed_by_name: null,
        project_name: projectMap.get(t.project_id as string) ?? null,
        is_overdue: t.is_overdue as boolean,
        status: t.status as string,
      }));
    },
    staleTime: 30_000,
  });

  // Zone 3: Recent completions
  const { data: recentCompletions = [] } = useQuery<AlertTask[]>({
    queryKey: ["dashboard-alerts", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_instances")
        .select("id, name, completed_at, completed_by, project_id")
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const userIds = [
        ...new Set(data.map((t: Record<string, unknown>) => t.completed_by).filter(Boolean)),
      ] as string[];
      const projectIds = [
        ...new Set(data.map((t: Record<string, unknown>) => t.project_id).filter(Boolean)),
      ] as string[];

      const [usersRes, projectsRes] = await Promise.all([
        userIds.length > 0
          ? supabase.from("user_profiles").select("user_id, full_name").in("user_id", userIds)
          : Promise.resolve({ data: [] }),
        projectIds.length > 0
          ? supabase.from("projects").select("id, project_name").in("id", projectIds)
          : Promise.resolve({ data: [] }),
      ]);

      const userMap = new Map(
        (usersRes.data ?? []).map((u: { user_id: string; full_name: string | null }) => [u.user_id, u.full_name]),
      );
      const projectMap = new Map(
        (projectsRes.data ?? []).map((p: { id: string; project_name: string }) => [p.id, p.project_name]),
      );

      return data.map((t: Record<string, unknown>) => ({
        id: t.id as string,
        name: t.name as string,
        assigned_to_name: null,
        due_date: null,
        completed_at: t.completed_at as string | null,
        completed_by_name: userMap.get(t.completed_by as string) ?? "Unknown",
        project_name: projectMap.get(t.project_id as string) ?? null,
        is_overdue: false,
        status: "completed",
      }));
    },
    staleTime: 30_000,
  });

  // Zone 3: Upcoming deadlines (next 3 days)
  const { data: upcomingDeadlines = [] } = useQuery<AlertTask[]>({
    queryKey: ["dashboard-alerts", "upcoming"],
    queryFn: async () => {
      const now = new Date();
      const threeDays = new Date(now.getTime() + 3 * 86_400_000);

      const { data, error } = await supabase
        .from("task_instances")
        .select("id, name, due_date, assigned_to, project_id, status")
        .in("status", ["pending", "active"])
        .gte("due_date", now.toISOString())
        .lte("due_date", threeDays.toISOString())
        .order("due_date", { ascending: true })
        .limit(20);
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const userIds = [...new Set(data.map((t: Record<string, unknown>) => t.assigned_to).filter(Boolean))] as string[];
      const projectIds = [
        ...new Set(data.map((t: Record<string, unknown>) => t.project_id).filter(Boolean)),
      ] as string[];

      const [usersRes, projectsRes] = await Promise.all([
        userIds.length > 0
          ? supabase.from("user_profiles").select("user_id, full_name").in("user_id", userIds)
          : Promise.resolve({ data: [] }),
        projectIds.length > 0
          ? supabase.from("projects").select("id, project_name").in("id", projectIds)
          : Promise.resolve({ data: [] }),
      ]);

      const userMap = new Map(
        (usersRes.data ?? []).map((u: { user_id: string; full_name: string | null }) => [u.user_id, u.full_name]),
      );
      const projectMap = new Map(
        (projectsRes.data ?? []).map((p: { id: string; project_name: string }) => [p.id, p.project_name]),
      );

      return data.map((t: Record<string, unknown>) => ({
        id: t.id as string,
        name: t.name as string,
        assigned_to_name: userMap.get(t.assigned_to as string) ?? "Unassigned",
        due_date: t.due_date as string | null,
        completed_at: null,
        completed_by_name: null,
        project_name: projectMap.get(t.project_id as string) ?? null,
        is_overdue: false,
        status: t.status as string,
      }));
    },
    staleTime: 30_000,
  });

  // Realtime subscriptions
  useRealtime({
    table: "task_instances",
    invalidateKeys: [["my-tasks"], ["my-task-counts"], ["dashboard-kpis"], ["dashboard-alerts"]],
  });
  useRealtime({ table: "projects", invalidateKeys: [["dashboard-kpis"]] });
  useRealtime({ table: "jobs", invalidateKeys: [["dashboard-kpis"]] });
  useRealtime({ table: "dispositions", invalidateKeys: [["dashboard-kpis"]] });
  useRealtime({ table: "opportunities", invalidateKeys: [["dashboard-kpis"]] });

  const handleCompleteTask = useCallback(
    (taskId: string) => {
      completeTask.mutate(taskId);
    },
    [completeTask],
  );

  const handleUpdateNotes = useCallback(
    async (taskId: string, notes: string) => {
      await updateNotes.mutateAsync({ taskId, notes });
    },
    [updateNotes],
  );

  // Filter pill items
  const statusPills: StatusPillItem[] = [
    { label: "All", value: "all", count: filterCounts?.all ?? 0 },
    { label: "Overdue", value: "overdue", count: filterCounts?.overdue ?? 0 },
    { label: "Due Today", value: "due_today", count: filterCounts?.due_today ?? 0 },
    { label: "Due This Week", value: "due_this_week", count: filterCounts?.due_this_week ?? 0 },
    { label: "Completed", value: "completed", count: filterCounts?.completed ?? 0 },
  ];

  if (kpisLoading) return <DashboardSkeleton />;

  const scheduleStatus =
    (kpis?.onSchedulePct ?? 100) >= 90 ? "success" : (kpis?.onSchedulePct ?? 100) >= 70 ? "warning" : "danger";

  return (
    <div>
      {/* Page Header */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-medium text-foreground">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted">Operations command center</p>
        </div>
        <button
          type="button"
          onClick={() =>
            queryClient.invalidateQueries({
              predicate: (q) => {
                const key = q.queryKey[0] as string;
                return key.startsWith("dashboard-") || key.startsWith("my-task");
              },
            })
          }
          className="h-9 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
        >
          Refresh
        </button>
      </div>

      {/* ═══ ZONE 1: Portfolio KPI Strip ═══ */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KPICard label="Active Projects" value={kpis?.activeProjects ?? 0} />
        <KPICard label="Under Construction" value={kpis?.homesUnderConstruction ?? 0} />
        <KPICard label="Closings This Month" value={kpis?.closingsThisMonth ?? 0} />
        <KPICard label="Pipeline Value" value={formatCurrency(kpis?.pipelineValue ?? 0)} />
        <KPICard
          label="Overdue Tasks"
          value={kpis?.overdueTasks ?? 0}
          status={(kpis?.overdueTasks ?? 0) > 0 ? "danger" : undefined}
        />
        <KPICard label="On Schedule" value={`${kpis?.onSchedulePct ?? 100}%`} status={scheduleStatus} />
      </div>

      {/* ═══ ZONE 2 + ZONE 3 side-by-side ═══ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* ZONE 2: My Tasks (left 2/3) */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-medium text-foreground mb-3">My Tasks</h2>
              <StatusPills
                statuses={statusPills}
                activeStatus={taskFilter}
                onStatusChange={(v) => setTaskFilter(v as TaskFilter)}
              />
            </div>
            <TaskListPanel tasks={tasks} onComplete={handleCompleteTask} onUpdateNotes={handleUpdateNotes} />
          </div>
        </div>

        {/* ZONE 3: Alerts & Activity (right 1/3) */}
        <div className="space-y-4">
          {/* Overdue Alerts */}
          <AlertCard
            title="Overdue Alerts"
            borderColor="border-l-destructive"
            items={overdueAlerts}
            renderItem={(item) => (
              <div key={item.id} className="border-b border-border/50 last:border-0 px-4 py-2.5">
                <p className="text-[13px] font-medium text-foreground leading-tight">{item.name}</p>
                <p className="text-[11px] text-muted mt-0.5">
                  {item.assigned_to_name} · {daysOverdueText(item.due_date)} · {item.project_name ?? "No project"}
                </p>
              </div>
            )}
            emptyText="No overdue tasks"
          />

          {/* Recent Activity */}
          <AlertCard
            title="Recent Activity"
            borderColor="border-l-success"
            items={recentCompletions}
            renderItem={(item) => (
              <div key={item.id} className="border-b border-border/50 last:border-0 px-4 py-2.5">
                <p className="text-[13px] font-medium text-foreground leading-tight">{item.name}</p>
                <p className="text-[11px] text-muted mt-0.5">
                  {item.completed_by_name} · {relativeTime(item.completed_at)} · {item.project_name ?? "No project"}
                </p>
              </div>
            )}
            emptyText="No recent completions"
          />

          {/* Upcoming Deadlines */}
          <AlertCard
            title="Upcoming Deadlines"
            borderColor="border-l-warning"
            items={upcomingDeadlines}
            renderItem={(item) => (
              <div key={item.id} className="border-b border-border/50 last:border-0 px-4 py-2.5">
                <p className="text-[13px] font-medium text-foreground leading-tight">{item.name}</p>
                <p className="text-[11px] text-muted mt-0.5">
                  {item.assigned_to_name} · {formatShortDate(item.due_date)} · {item.project_name ?? "No project"}
                </p>
              </div>
            )}
            emptyText="No upcoming deadlines"
          />
        </div>
      </div>
    </div>
  );
}

// ── Alert Card component ──────────────────────────────────

function AlertCard<T>({
  title,
  borderColor,
  items,
  renderItem,
  emptyText,
}: {
  title: string;
  borderColor: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  emptyText: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-card border-l-4", borderColor)}>
      <div className="border-b border-border px-4 py-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-muted-foreground">{emptyText}</div>
      ) : (
        <div className="max-h-64 overflow-y-auto">{items.map(renderItem)}</div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────

function daysOverdueText(dueDate: string | null): string {
  if (!dueDate) return "No date";
  const diff = Math.floor((Date.now() - new Date(dueDate).getTime()) / 86_400_000);
  if (diff <= 0) return "Due today";
  return `${diff}d overdue`;
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return "No date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(dateStr));
}

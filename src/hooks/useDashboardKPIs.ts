import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

export interface DashboardKPIs {
  activeProjects: number;
  homesUnderConstruction: number;
  closingsThisMonth: number;
  pipelineValue: number;
  overdueTasks: number;
  onSchedulePct: number;
}

export function useDashboardKPIs() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery<DashboardKPIs>({
    queryKey: ["dashboard-kpis", userId],
    queryFn: async () => {
      const [projectsRes, jobsRes, closingsRes, pipelineRes, overdueRes, scheduleRes] = await Promise.all([
        // Active Projects
        supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .not("status", "in", '("Completed","On Hold")'),

        // Homes Under Construction (active build statuses)
        supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .in("status", [
            "Pre-Construction",
            "Permitting",
            "Foundation",
            "Framing",
            "Rough-Ins",
            "Insulation & Drywall",
            "Interior Finishes",
            "Exterior",
            "Final Inspections",
          ]),

        // Closings this month
        supabase
          .from("dispositions")
          .select("id", { count: "exact", head: true })
          .gte("closing_date", firstOfMonth())
          .lte("closing_date", lastOfMonth()),

        // Pipeline value (sum estimated_value for non-closed opportunities)
        supabase
          .from("opportunities")
          .select("estimated_value")
          .not("status", "in", '("Closed Won","Closed Lost","On Hold")'),

        // Overdue tasks for current user
        supabase
          .from("task_instances")
          .select("id", { count: "exact", head: true })
          .eq("is_overdue", true)
          .in("status", ["pending", "active"])
          .eq("assigned_to", userId ?? ""),

        // On-schedule jobs: target_completion >= today for active jobs
        supabase
          .from("jobs")
          .select("id, target_completion, status")
          .in("status", [
            "Pre-Construction",
            "Permitting",
            "Foundation",
            "Framing",
            "Rough-Ins",
            "Insulation & Drywall",
            "Interior Finishes",
            "Exterior",
            "Final Inspections",
          ]),
      ]);

      const activeProjects = projectsRes.count ?? 0;
      const homesUnderConstruction = jobsRes.count ?? 0;
      const closingsThisMonth = closingsRes.count ?? 0;

      const pipelineValue = (pipelineRes.data ?? []).reduce(
        (sum: number, o: { estimated_value: number | null }) => sum + (o.estimated_value ?? 0),
        0,
      );

      const overdueTasks = overdueRes.count ?? 0;

      const activeJobs = scheduleRes.data ?? [];
      const totalActive = activeJobs.length;
      const onSchedule = activeJobs.filter(
        (j: { target_completion: string | null }) => j.target_completion && new Date(j.target_completion) >= new Date(),
      ).length;
      const onSchedulePct = totalActive > 0 ? Math.round((onSchedule / totalActive) * 100) : 100;

      return {
        activeProjects,
        homesUnderConstruction,
        closingsThisMonth,
        pipelineValue,
        overdueTasks,
        onSchedulePct,
      };
    },
    staleTime: 30_000,
    enabled: !!userId,
  });
}

function firstOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0] ?? "";
}

function lastOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0] ?? "";
}

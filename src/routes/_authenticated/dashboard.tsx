import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { EmptyState } from "@/components/shared/EmptyState";
import { KpiCard } from "@/components/shared/KpiCard";
import { DashboardSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useRealtime } from "@/hooks/useRealtime";
import { MATTER_STATUS_LABELS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Matter } from "@/types/matters";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

interface Opportunity {
  id: string;
  opportunity_name: string;
  status: string;
  estimated_value: number | null;
  updated_at: string;
}

interface Project {
  id: string;
  project_name: string;
  status: string;
  project_type: string | null;
  budget_total: number | null;
  updated_at: string;
}

interface Job {
  id: string;
  record_number: string | null;
  lot_number: string | null;
  project_name: string | null;
  status: string;
  floor_plan_name: string | null;
  updated_at: string;
}

interface Disposition {
  id: string;
  lot_number: string | null;
  buyer_name: string | null;
  status: string;
  contract_price: number | null;
  closing_date: string | null;
}

const QUICK_ACTIONS = [
  { label: "Daily Log", borderColor: "var(--color-success)", path: "/construction" },
  { label: "New PO", borderColor: "var(--color-info)", path: "/purchasing/purchase-orders" },
  { label: "Inspection", borderColor: "var(--color-warning)", path: "/construction" },
  { label: "Create RFI", borderColor: "var(--color-destructive)", path: "/construction" },
  { label: "Punch List", borderColor: "#6B5B80", path: "/construction" },
  { label: "Reports", borderColor: "var(--color-muted-foreground)", path: "/reports" },
] as const;

function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: opportunities = [], isLoading } = useQuery<Opportunity[]>({
    queryKey: ["dashboard-pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("id, opportunity_name, status, estimated_value, updated_at")
        .not("status", "in", '("Closed Won","Closed Lost")')
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["dashboard-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, project_name, status, project_type, budget_total, updated_at")
        .in("status", ["Pre-Development", "Active"])
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: activeJobs = [] } = useQuery<Job[]>({
    queryKey: ["dashboard-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, record_number, lot_number, project_name, status, floor_plan_name, updated_at")
        .in("status", ["In Progress", "Framing", "Foundation", "Rough-In", "Drywall", "Trim", "Punch"])
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: pendingClosings = [] } = useQuery<Disposition[]>({
    queryKey: ["dashboard-closings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispositions")
        .select("id, lot_number, buyer_name, status, contract_price, closing_date")
        .in("status", ["Under Contract", "Pending Close"])
        .order("closing_date", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: openMatters = [] } = useQuery<Matter[]>({
    queryKey: ["dashboard-matters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matters")
        .select("id, matter_number, title, status, priority, category, created_at")
        .in("status", ["open", "in_progress", "on_hold"])
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as Matter[];
    },
  });

  // Counts for KPIs (separate count queries for accurate totals)
  const { data: projectCount = 0 } = useQuery<number>({
    queryKey: ["dashboard-project-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .in("status", ["Pre-Development", "Active"]);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: jobCount = 0 } = useQuery<number>({
    queryKey: ["dashboard-job-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .in("status", ["In Progress", "Framing", "Foundation", "Rough-In", "Drywall", "Trim", "Punch"]);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: closingCount = 0 } = useQuery<number>({
    queryKey: ["dashboard-closing-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("dispositions")
        .select("id", { count: "exact", head: true })
        .in("status", ["Under Contract", "Pending Close"]);
      if (error) throw error;
      return count ?? 0;
    },
  });

  useRealtime({ table: "opportunities", invalidateKeys: [["dashboard-pipeline"]] });
  useRealtime({ table: "projects", invalidateKeys: [["dashboard-projects"], ["dashboard-project-count"]] });
  useRealtime({ table: "jobs", invalidateKeys: [["dashboard-jobs"], ["dashboard-job-count"]] });
  useRealtime({ table: "dispositions", invalidateKeys: [["dashboard-closings"], ["dashboard-closing-count"]] });
  useRealtime({ table: "matters", invalidateKeys: [["dashboard-matters"]] });

  const pipelineValue = opportunities.reduce((sum, o) => sum + (o.estimated_value ?? 0), 0);
  const pipelineCount = opportunities.length;

  const criticalMatters = openMatters.filter((m) => m.priority === "critical").length;
  const highMatters = openMatters.filter((m) => m.priority === "high").length;

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-foreground">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted">Overview of your operations</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string).startsWith("dashboard-") })}
            className="rounded-[var(--radius)] border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-card-hover"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/pipeline" })}
            className="rounded-[var(--radius)] bg-button px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-button-hover"
          >
            + New Opportunity
          </button>
        </div>
      </div>

      {/* Quick Actions — text-only cards with colored top borders */}
      <div className="mb-6 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => navigate({ to: action.path })}
            className="bg-card border border-border rounded-[var(--radius-lg)] px-3 py-4 text-center shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
            style={{ borderTopWidth: 3, borderTopColor: action.borderColor }}
          >
            <span className="text-xs font-semibold text-text-secondary">{action.label}</span>
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active Projects" value={String(projectCount)} sub="Across all entities" accentColor="var(--color-primary)" />
        <KpiCard label="Jobs in Progress" value={String(jobCount)} sub="Under construction" accentColor="var(--color-info)" />
        <KpiCard
          label="Pipeline Value"
          value={formatCurrency(pipelineValue)}
          sub={`${pipelineCount} active opportunit${pipelineCount === 1 ? "y" : "ies"}`}
          accentColor="var(--color-warning)"
        />
        <KpiCard label="Pending Closings" value={String(closingCount)} sub="Under contract" accentColor="var(--color-success)" />
      </div>

      {/* Content Grid — text-only headers, no icons */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Active Projects */}
        <DashboardCard title="Active Projects" viewAllPath="/projects">
          {projects.length === 0 ? (
            <EmptyState title="No projects yet" description="Create your first project to get started" />
          ) : (
            <div className="divide-y divide-border">
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-card-hover"
                  onClick={() => navigate({ to: "/projects/$projectId/basic-info", params: { projectId: p.id } })}
                >
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">{p.project_name}</p>
                    <p className="text-[11px] text-muted">
                      {p.project_type ?? "No type"} {p.budget_total ? `· ${formatCurrency(p.budget_total)}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </button>
              ))}
            </div>
          )}
        </DashboardCard>

        {/* Active Jobs */}
        <DashboardCard title="Active Jobs" viewAllPath="/construction">
          {activeJobs.length === 0 ? (
            <EmptyState title="No jobs yet" description="Jobs are created from project lot inventory" />
          ) : (
            <div className="divide-y divide-border">
              {activeJobs.map((j) => (
                <button
                  key={j.id}
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-card-hover"
                  onClick={() => navigate({ to: "/construction/$jobId/job-info", params: { jobId: j.id } })}
                >
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">
                      {j.lot_number ?? j.record_number ?? "Job"} {j.floor_plan_name ? `· ${j.floor_plan_name}` : ""}
                    </p>
                    <p className="text-[11px] text-muted">{j.project_name ?? "No project"}</p>
                  </div>
                  <StatusBadge status={j.status} />
                </button>
              ))}
            </div>
          )}
        </DashboardCard>

        {/* Pipeline */}
        <DashboardCard title="Pipeline" viewAllPath="/pipeline">
          {opportunities.length === 0 ? (
            <EmptyState title="No opportunities yet" description="Add deals to your pipeline" />
          ) : (
            <div className="divide-y divide-border">
              {opportunities.map((opp) => (
                <button
                  key={opp.id}
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-card-hover"
                  onClick={() =>
                    navigate({ to: "/pipeline/$opportunityId/basic-info", params: { opportunityId: opp.id } })
                  }
                >
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">{opp.opportunity_name}</p>
                    <p className="text-[11px] text-muted">
                      {opp.estimated_value ? formatCurrency(opp.estimated_value) : "No value set"}
                    </p>
                  </div>
                  <StatusBadge status={opp.status} />
                </button>
              ))}
            </div>
          )}
        </DashboardCard>

        {/* Upcoming Closings */}
        <DashboardCard title="Upcoming Closings" viewAllPath="/disposition">
          {pendingClosings.length === 0 ? (
            <EmptyState
              title="No closings scheduled"
              description="Closings appear when dispositions are under contract"
            />
          ) : (
            <div className="divide-y divide-border">
              {pendingClosings.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-card-hover"
                  onClick={() => navigate({ to: `/disposition/${d.id}/overview` as string })}
                >
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">
                      {d.lot_number ?? "—"} {d.buyer_name ? `· ${d.buyer_name}` : ""}
                    </p>
                    <p className="text-[11px] text-muted">
                      {d.closing_date ? `Closing ${formatDate(d.closing_date)}` : "No closing date"}
                      {d.contract_price ? ` · ${formatCurrency(d.contract_price)}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={d.status} />
                </button>
              ))}
            </div>
          )}
        </DashboardCard>

        {/* Open Matters */}
        <DashboardCard title="Open Matters" viewAllPath="/operations/matters">
          {openMatters.length === 0 ? (
            <EmptyState title="No open matters" description="Matters track workflows outside the standard pipeline" />
          ) : (
            <div>
              {/* Priority breakdown */}
              <div className="flex items-center gap-4 border-b border-border px-4 py-2.5">
                {criticalMatters > 0 && (
                  <span className="text-[11px] font-semibold text-destructive-text">{criticalMatters} Critical</span>
                )}
                {highMatters > 0 && (
                  <span className="text-[11px] font-semibold text-warning-text">{highMatters} High</span>
                )}
                <span className="text-[11px] text-muted">{openMatters.length} total open</span>
              </div>
              <div className="divide-y divide-border">
                {openMatters.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-card-hover"
                    onClick={() => navigate({ to: "/operations/matters/$matterId", params: { matterId: m.id } })}
                  >
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">{m.title}</p>
                      <p className="text-[11px] text-muted">
                        {m.matter_number} · {MATTER_STATUS_LABELS[m.status] ?? m.status}
                      </p>
                    </div>
                    <StatusBadge status={m.priority} />
                  </button>
                ))}
              </div>
              {/* New Matter action */}
              <div className="border-t border-border px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => navigate({ to: "/operations/matters/new" })}
                  className="text-xs font-medium text-primary transition-colors hover:text-primary-hover"
                >
                  + New Matter
                </button>
              </div>
            </div>
          )}
        </DashboardCard>
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  viewAllPath,
  children,
}: {
  title: string;
  viewAllPath: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-px">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <button
          type="button"
          onClick={() => navigate({ to: viewAllPath })}
          className="text-xs font-medium text-muted transition-colors hover:text-foreground"
        >
          {"View All \u2192"}
        </button>
      </div>
      {children}
    </div>
  );
}

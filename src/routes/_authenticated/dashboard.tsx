import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { EmptyState } from "@/components/shared/EmptyState";
import { KpiCard } from "@/components/shared/KpiCard";
import { DashboardSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useRealtime } from "@/hooks/useRealtime";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

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

const QUICK_ACTIONS = [
  { label: "Daily Log", borderColor: "var(--color-success)" },
  { label: "New PO", borderColor: "var(--color-info)" },
  { label: "Inspection", borderColor: "var(--color-warning)" },
  { label: "Create RFI", borderColor: "var(--color-destructive)" },
  { label: "Punch List", borderColor: "#6B5B80" },
  { label: "Reports", borderColor: "var(--color-muted-foreground)" },
] as const;

function DashboardPage() {
  const navigate = useNavigate();

  const { data: opportunities = [], isLoading } = useQuery<Opportunity[]>({
    queryKey: ["dashboard-pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("id, opportunity_name, status, estimated_value, updated_at")
        .not("status", "in", '("Closed - Won","Closed - Lost")')
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  useRealtime({ table: "opportunities", invalidateKeys: [["dashboard-pipeline"]] });
  useRealtime({ table: "projects", invalidateKeys: [["dashboard-pipeline"]] });
  useRealtime({ table: "jobs", invalidateKeys: [["dashboard-pipeline"]] });
  useRealtime({ table: "dispositions", invalidateKeys: [["dashboard-pipeline"]] });

  const pipelineValue = opportunities.reduce((sum, o) => sum + (o.estimated_value ?? 0), 0);
  const pipelineCount = opportunities.length;

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
            className="bg-card border border-border rounded-[var(--radius-lg)] px-3 py-4 text-center shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
            style={{ borderTopWidth: 3, borderTopColor: action.borderColor }}
          >
            <span className="text-xs font-semibold text-text-secondary">{action.label}</span>
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active Projects" value="0" sub="Across all entities" accentColor="var(--color-primary)" />
        <KpiCard label="Jobs in Progress" value="0" sub="Under construction" accentColor="var(--color-info)" />
        <KpiCard
          label="Pipeline Value"
          value={formatCurrency(pipelineValue)}
          sub={`${pipelineCount} active opportunit${pipelineCount === 1 ? "y" : "ies"}`}
          accentColor="var(--color-warning)"
        />
        <KpiCard label="Pending Closings" value="0" sub="Under contract" accentColor="var(--color-success)" />
      </div>

      {/* Content Grid — text-only headers, no icons */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Active Projects */}
        <DashboardCard title="Active Projects" viewAllPath="/projects">
          <EmptyState title="No projects yet" description="Create your first project to get started" />
        </DashboardCard>

        {/* Active Jobs */}
        <DashboardCard title="Active Jobs" viewAllPath="/construction">
          <EmptyState title="No jobs yet" description="Jobs are created from project lot inventory" />
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
          <EmptyState
            title="No closings scheduled"
            description="Closings appear when dispositions are under contract"
          />
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

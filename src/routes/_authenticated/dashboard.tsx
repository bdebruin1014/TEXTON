import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BarChart3, FolderKanban, HardHat, Home } from "lucide-react";
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
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-0.5 text-sm text-muted">Overview of your operations</p>
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

      {/* Data Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Active Projects */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <FolderKanban className="h-4 w-4 text-muted" />
            <h2 className="text-sm font-semibold text-foreground">Active Projects</h2>
          </div>
          <EmptyState title="No projects yet" description="Create your first project to get started" />
        </div>

        {/* Active Jobs */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <HardHat className="h-4 w-4 text-muted" />
            <h2 className="text-sm font-semibold text-foreground">Active Jobs</h2>
          </div>
          <EmptyState title="No jobs yet" description="Jobs are created from project lot inventory" />
        </div>

        {/* Pipeline */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <BarChart3 className="h-4 w-4 text-muted" />
            <h2 className="text-sm font-semibold text-foreground">Pipeline</h2>
          </div>
          {opportunities.length === 0 ? (
            <EmptyState title="No opportunities yet" description="Add deals to your pipeline" />
          ) : (
            <div className="divide-y divide-border">
              {opportunities.map((opp) => (
                <button
                  key={opp.id}
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-primary-50"
                  onClick={() =>
                    navigate({ to: "/pipeline/$opportunityId/basic-info", params: { opportunityId: opp.id } })
                  }
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{opp.opportunity_name}</p>
                    <p className="text-xs text-muted">
                      {opp.estimated_value ? formatCurrency(opp.estimated_value) : "No value set"}
                    </p>
                  </div>
                  <StatusBadge status={opp.status} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Closings */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Home className="h-4 w-4 text-muted" />
            <h2 className="text-sm font-semibold text-foreground">Upcoming Closings</h2>
          </div>
          <EmptyState
            title="No closings scheduled"
            description="Closings appear when dispositions are under contract"
          />
        </div>
      </div>
    </div>
  );
}

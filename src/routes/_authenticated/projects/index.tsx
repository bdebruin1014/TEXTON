import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ModuleIndex, type ModuleKpi, type StatusTab } from "@/components/layout/ModuleIndex";
import { EmptyState } from "@/components/shared/EmptyState";
import { CardGridSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PROJECT_STATUSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/projects/")({
  component: ProjectsIndex,
});

interface Project {
  id: string;
  project_name: string;
  record_number: string | null;
  project_type: string | null;
  status: string;
  entity_id: string | null;
  total_budget: number | null;
  total_lots: number | null;
  address_city: string | null;
  address_state: string | null;
  created_at: string;
  updated_at: string;
}

function ProjectsIndex() {
  const navigate = useNavigate();
  const [activeStatus, setActiveStatus] = useState("all");
  const activeEntityId = useEntityStore((s) => s.activeEntityId);

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredProjects = useMemo(() => {
    if (activeStatus === "all") return projects;
    return projects.filter((p) => p.status === activeStatus);
  }, [projects, activeStatus]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of projects) {
      counts[p.status] = (counts[p.status] ?? 0) + 1;
    }
    return counts;
  }, [projects]);

  const totalBudget = projects.reduce((sum, p) => sum + (p.total_budget ?? 0), 0);
  const totalLots = projects.reduce((sum, p) => sum + (p.total_lots ?? 0), 0);

  const kpis: ModuleKpi[] = [
    { label: "Total Projects", value: projects.length },
    { label: "Total Budget", value: formatCurrency(totalBudget) },
    { label: "Total Lots", value: totalLots },
    {
      label: "Active",
      value: statusCounts.Active ?? 0,
      accentColor: "#4A8C5E",
    },
  ];

  const statusTabs: StatusTab[] = [
    { label: "All", value: "all", count: projects.length },
    ...PROJECT_STATUSES.map((s) => ({
      label: s,
      value: s,
      count: statusCounts[s] ?? 0,
    })),
  ];

  const handleCreate = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          project_name: "New Project",
          status: "Pre-Development",
          entity_id: activeEntityId,
        })
        .select()
        .single();
      if (error) throw error;
      toast.success("Project created");
      navigate({ to: "/projects/$projectId/basic-info", params: { projectId: data.id } });
    } catch {
      toast.error("Failed to create project");
    }
  };

  return (
    <ModuleIndex
      title="Projects"
      subtitle={activeStatus === "all" ? "All projects" : activeStatus}
      kpis={kpis}
      statusTabs={statusTabs}
      activeStatus={activeStatus}
      onStatusChange={setActiveStatus}
      onCreate={handleCreate}
      createLabel="New Project"
      onCreateWithAI={() => navigate({ to: "/projects/new" })}
    >
      {isLoading ? (
        <CardGridSkeleton cards={6} />
      ) : filteredProjects.length === 0 ? (
        <EmptyState title="No projects yet" description="Create your first project to get started" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => navigate({ to: "/projects/$projectId/basic-info", params: { projectId: project.id } })}
              className="rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-primary/30 hover:shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  {project.record_number && (
                    <p className="mb-0.5 font-mono text-[10px] text-muted">{project.record_number}</p>
                  )}
                  <h3 className="truncate text-sm font-semibold text-foreground">{project.project_name}</h3>
                  {(project.address_city || project.address_state) && (
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {[project.address_city, project.address_state].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                <StatusBadge status={project.status} />
              </div>
              <div className="flex items-center gap-4 text-xs text-muted">
                {project.project_type && <span>{project.project_type}</span>}
                {project.total_lots != null && project.total_lots > 0 && <span>{project.total_lots} lots</span>}
                {project.total_budget != null && project.total_budget > 0 && (
                  <span>{formatCurrency(project.total_budget)}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </ModuleIndex>
  );
}

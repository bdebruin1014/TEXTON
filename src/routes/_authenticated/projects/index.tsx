import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageWithSidebar } from "@/components/layout/AppShell";
import { IndexSidebar, type SidebarFilterItem } from "@/components/layout/IndexSidebar";
import { EmptyState } from "@/components/shared/EmptyState";
import { CardGridSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PROJECT_STATUSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/")({
  component: ProjectsIndex,
});

interface Project {
  id: string;
  project_name: string;
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
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredProjects = useMemo(() => {
    if (activeFilter === "all") return projects;
    return projects.filter((p) => p.status === activeFilter);
  }, [projects, activeFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of projects) {
      counts[p.status] = (counts[p.status] ?? 0) + 1;
    }
    return counts;
  }, [projects]);

  const sidebarFilters: SidebarFilterItem[] = [
    { label: "All Projects", value: "all", count: projects.length },
    ...PROJECT_STATUSES.map((s) => ({
      label: s,
      value: s,
      count: statusCounts[s] ?? 0,
    })),
  ];

  const totalBudget = projects.reduce((sum, p) => sum + (p.total_budget ?? 0), 0);

  const handleCreate = async () => {
    const { data, error } = await supabase
      .from("projects")
      .insert({ project_name: "New Project", status: "Pre-Development" })
      .select()
      .single();
    if (error) {
      console.error("Failed to create project:", error);
      return;
    }
    navigate({ to: "/projects/$projectId/basic-info", params: { projectId: data.id } });
  };

  const sidebar = (
    <IndexSidebar
      title="Projects"
      filters={sidebarFilters}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      metrics={[
        { label: "Total", value: projects.length },
        { label: "Total Budget", value: formatCurrency(totalBudget) },
      ]}
    />
  );

  return (
    <PageWithSidebar sidebar={sidebar}>
      <div>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Projects</h1>
            <p className="mt-0.5 text-sm text-muted">{activeFilter === "all" ? "All projects" : activeFilter}</p>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            +
            New Project
          </button>
        </div>

        {/* Card Grid */}
        {isLoading ? (
          <CardGridSkeleton cards={6} />
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Create your first project to get started"
           
            action={
              <button
                type="button"
                onClick={handleCreate}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                +
                New Project
              </button>
            }
          />
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
      </div>
    </PageWithSidebar>
  );
}

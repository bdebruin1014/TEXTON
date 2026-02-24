import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ModuleIndex, type ModuleKpi, type StatusTab } from "@/components/layout/ModuleIndex";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
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
  entity_name: string | null;
  total_lots: number | null;
  address_city: string | null;
  address_state: string | null;
  created_at: string;
  updated_at: string;
}

interface JobRow {
  id: string;
  project_id: string | null;
  status: string;
}

interface DispositionRow {
  id: string;
  project_id: string | null;
  status: string;
}

/* ── Project type abbreviation map ── */
const TYPE_ABBR: Record<string, string> = {
  "Scattered Lot": "SL",
  "Community Development": "CD",
  "Lot Development": "LD",
  "Lot Purchase": "LP",
};

/* ── Status pill groupings ── */
const PROJECT_PILL_GROUPS = [
  { label: "All", value: "all", statuses: [] as string[] },
  { label: "Pre-Development", value: "pre-dev", statuses: ["Pre-Development"] },
  { label: "Active", value: "active", statuses: ["Entitlement", "Horizontal", "Vertical"] },
  { label: "Selling Out", value: "selling-out", statuses: ["Closeout"] },
  { label: "Completed", value: "completed", statuses: ["Completed"] },
  { label: "On Hold", value: "on-hold", statuses: ["On Hold"] },
];

/* ── Active construction statuses for job counting ── */
const ACTIVE_JOB_STATUSES = [
  "Pre-Construction",
  "Permitting",
  "Foundation",
  "Framing",
  "Rough-Ins",
  "Insulation & Drywall",
  "Interior Finishes",
  "Exterior",
  "Final Inspections",
];

function ProjectsIndex() {
  const navigate = useNavigate();
  const [activeStatus, setActiveStatus] = useState("all");
  const activeEntityId = useEntityStore((s) => s.activeEntityId);

  /* ── Queries ── */
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["projects", activeEntityId],
    queryFn: async () => {
      let query = supabase
        .from("projects")
        .select(
          "id,project_name,record_number,project_type,status,entity_id,entity_name,total_lots,address_city,address_state,created_at,updated_at",
        )
        .order("updated_at", { ascending: false });
      if (activeEntityId) query = query.eq("entity_id", activeEntityId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: allJobs = [] } = useQuery<JobRow[]>({
    queryKey: ["jobs-for-projects", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("jobs").select("id,project_id,status");
      if (activeEntityId) query = query.eq("entity_id", activeEntityId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: allDispositions = [] } = useQuery<DispositionRow[]>({
    queryKey: ["dispositions-for-projects", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("dispositions").select("id,project_id,status");
      if (activeEntityId) query = query.eq("entity_id", activeEntityId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  /* ── Derived maps: per-project job/disposition counts ── */
  const jobCountsByProject = useMemo(() => {
    const map: Record<string, { active: number; total: number }> = {};
    for (const job of allJobs) {
      if (!job.project_id) continue;
      const existing = map[job.project_id];
      const entry = existing ?? { active: 0, total: 0 };
      entry.total++;
      if (ACTIVE_JOB_STATUSES.includes(job.status)) entry.active++;
      map[job.project_id] = entry;
    }
    return map;
  }, [allJobs]);

  const soldLotsByProject = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of allDispositions) {
      if (!d.project_id) continue;
      if (d.status === "Closed") {
        map[d.project_id] = (map[d.project_id] ?? 0) + 1;
      }
    }
    return map;
  }, [allDispositions]);

  /* ── Filtering ── */
  const filteredProjects = useMemo(() => {
    if (activeStatus === "all") return projects;
    const group = PROJECT_PILL_GROUPS.find((g) => g.value === activeStatus);
    if (!group) return projects;
    return projects.filter((p) => group.statuses.includes(p.status));
  }, [projects, activeStatus]);

  /* ── Status counts ── */
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of projects) {
      counts[p.status] = (counts[p.status] ?? 0) + 1;
    }
    return counts;
  }, [projects]);

  /* ── KPIs ── */
  const activeProjects = projects.filter((p) => p.status !== "Completed" && p.status !== "On Hold").length;
  const totalLots = projects.reduce((sum, p) => sum + (p.total_lots ?? 0), 0);
  const underConstruction = allJobs.filter((j) => ACTIVE_JOB_STATUSES.includes(j.status)).length;
  const pendingSale = allDispositions.filter((d) => d.status !== "Closed" && d.status !== "Cancelled").length;

  const kpis: ModuleKpi[] = [
    { label: "Active Projects", value: activeProjects, accentColor: "var(--color-primary-accent)" },
    { label: "Total Lots", value: totalLots },
    { label: "Under Construction", value: underConstruction, accentColor: "#C4841D" },
    { label: "Pending Sale", value: pendingSale, accentColor: "#3B6FA0" },
  ];

  /* ── Status tabs ── */
  const statusTabs: StatusTab[] = PROJECT_PILL_GROUPS.map((g) => ({
    label: g.label,
    value: g.value,
    count: g.value === "all" ? projects.length : g.statuses.reduce((sum, s) => sum + (statusCounts[s] ?? 0), 0),
  }));

  /* ── Columns ── */
  const columns: ColumnDef<Project, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "project_name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Project Name" />,
        cell: ({ row }) => <span className="font-medium">{row.getValue("project_name")}</span>,
      },
      {
        accessorKey: "project_type",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ row }) => {
          const type = row.getValue("project_type") as string | null;
          if (!type) return "—";
          const abbr = TYPE_ABBR[type] ?? type;
          return (
            <span className="inline-flex items-center rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-muted-foreground">
              {abbr}
            </span>
          );
        },
        size: 80,
      },
      {
        id: "municipality",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Municipality" />,
        accessorFn: (row) => row.address_city ?? "—",
        cell: ({ getValue }) => <span className="text-muted">{getValue() as string}</span>,
      },
      {
        id: "lots",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Lots" />,
        accessorFn: (row) => {
          const sold = soldLotsByProject[row.id] ?? 0;
          const total = row.total_lots ?? 0;
          return `${sold}/${total}`;
        },
        cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() as string}</span>,
        size: 80,
      },
      {
        id: "active_jobs",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Active Jobs" />,
        accessorFn: (row) => jobCountsByProject[row.id]?.active ?? 0,
        cell: ({ getValue }) => {
          const count = getValue() as number;
          return <span className={count > 0 ? "font-medium" : "text-muted"}>{count}</span>;
        },
        size: 100,
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
      },
      {
        accessorKey: "entity_name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Entity" />,
        cell: ({ row }) => <span className="truncate text-xs text-muted">{row.getValue("entity_name") ?? "—"}</span>,
      },
    ],
    [jobCountsByProject, soldLotsByProject],
  );

  /* ── Create handler ── */
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
      subtitle={
        activeStatus === "all"
          ? "All projects"
          : (PROJECT_PILL_GROUPS.find((g) => g.value === activeStatus)?.label ?? activeStatus)
      }
      kpis={kpis}
      statusTabs={statusTabs}
      activeStatus={activeStatus}
      onStatusChange={setActiveStatus}
      onCreate={handleCreate}
      createLabel="New Project"
      onCreateWithAI={() => navigate({ to: "/projects/new" })}
    >
      {isLoading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : (
        <DataTable
          columns={columns}
          data={filteredProjects}
          searchKey="project_name"
          searchPlaceholder="Search projects..."
          onRowClick={(row) => navigate({ to: "/projects/$projectId/basic-info", params: { projectId: row.id } })}
        />
      )}
    </ModuleIndex>
  );
}

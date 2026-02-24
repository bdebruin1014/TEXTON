import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageWithSidebar } from "@/components/layout/AppShell";
import { DetailSidebar, type ShortcutGroup, type SidebarSection } from "@/components/layout/DetailSidebar";
import { type SidebarRecordItem, SidebarRecordList } from "@/components/sidebar/SidebarRecordList";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  component: ProjectLayout,
});

/* ── Status → sidebar color key ── */
const LOT_COLORS: Record<string, string> = {
  Available: "green",
  "Under Construction": "yellow",
  Reserved: "yellow",
  Assigned: "blue",
  Completed: "green",
  Listed: "blue",
  "Under Contract": "yellow",
  Closed: "gray",
  Future: "gray",
};

const JOB_COLORS: Record<string, string> = {
  "Pre-Construction": "blue",
  Permitting: "blue",
  Foundation: "yellow",
  Framing: "yellow",
  "Rough-Ins": "yellow",
  "Insulation & Drywall": "yellow",
  "Interior Finishes": "yellow",
  Exterior: "yellow",
  "Final Inspections": "yellow",
  "CO Issued": "green",
  Warranty: "green",
  Closed: "gray",
};

const DISPO_COLORS: Record<string, string> = {
  Lead: "blue",
  Reserved: "blue",
  "Under Contract": "yellow",
  "Option Selections": "blue",
  "Builder Walk": "yellow",
  "Closing Scheduled": "yellow",
  Closed: "green",
  Cancelled: "red",
};

interface LotRow {
  id: string;
  lot_number: string | null;
  status: string;
}

interface JobRow {
  id: string;
  record_number: string | null;
  status: string;
}

interface DispoRow {
  id: string;
  address: string | null;
  lot_number: string | null;
  buyer_name: string | null;
  status: string;
}

interface WfTask {
  status: string;
}

function ProjectLayout() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, project_name, status, project_type")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  /* ── Linked record queries ── */
  const { data: lots = [] } = useQuery<LotRow[]>({
    queryKey: ["project-lots", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lots")
        .select("id, lot_number, status")
        .eq("project_id", projectId)
        .order("lot_number");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: jobs = [] } = useQuery<JobRow[]>({
    queryKey: ["project-jobs", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, record_number, status")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: dispositions = [] } = useQuery<DispoRow[]>({
    queryKey: ["project-dispositions", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispositions")
        .select("id, address, lot_number, buyer_name, status")
        .eq("project_id", projectId)
        .order("closing_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: tasks = [] } = useQuery<WfTask[]>({
    queryKey: ["project-tasks", projectId],
    queryFn: async () => {
      const { data: instances } = await supabase
        .from("workflow_instances")
        .select("id")
        .eq("record_id", projectId)
        .eq("record_type", "project");
      if (!instances || instances.length === 0) return [];
      const instanceIds = instances.map((i) => i.id);
      const { data, error } = await supabase
        .from("workflow_instance_tasks")
        .select("status")
        .in("instance_id", instanceIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  /* ── Map records to SidebarRecordItem ── */
  const lotItems: SidebarRecordItem[] = useMemo(
    () =>
      lots.map((l) => ({
        id: l.id,
        label: l.lot_number ? `LOT-${l.lot_number}` : "—",
        status: l.status,
        statusColor: LOT_COLORS[l.status] ?? "gray",
        href: `/projects/${projectId}/lot-inventory`,
      })),
    [lots, projectId],
  );

  const jobItems: SidebarRecordItem[] = useMemo(
    () =>
      jobs.map((j) => ({
        id: j.id,
        label: j.record_number ?? "—",
        status: j.status,
        statusColor: JOB_COLORS[j.status] ?? "gray",
        href: `/construction/${j.id}/job-info`,
      })),
    [jobs],
  );

  const dispoItems: SidebarRecordItem[] = useMemo(
    () =>
      dispositions.map((d) => ({
        id: d.id,
        label: d.address ?? d.buyer_name ?? `Lot ${d.lot_number ?? "—"}`,
        status: d.status,
        statusColor: DISPO_COLORS[d.status] ?? "gray",
        href: `/disposition/${d.id}/overview`,
      })),
    [dispositions],
  );

  /* ── Task summary counts ── */
  const taskTotal = tasks.length;
  const taskActive = tasks.filter((t) => t.status === "active").length;
  const taskOverdue = tasks.filter((t) => t.status === "overdue").length;

  const basePath = `/projects/${projectId}`;

  const sections: SidebarSection[] = [
    {
      label: "Overview",
      items: [
        { label: "Basic Info", path: `${basePath}/basic-info` },
        { label: "Property Details", path: `${basePath}/property-details` },
        { label: "Contacts", path: `${basePath}/contacts` },
        { label: "Timeline", path: `${basePath}/timeline` },
      ],
    },
    {
      label: "Land & Development",
      items: [
        { label: "Parcels & Land", path: `${basePath}/parcels` },
        { label: "Due Diligence", path: `${basePath}/due-diligence` },
        { label: "Entitlements", path: `${basePath}/entitlements` },
        { label: "Horizontal", path: `${basePath}/horizontal` },
        { label: "Lot Inventory", path: `${basePath}/lot-inventory` },
        { label: "Plans & Pricing", path: `${basePath}/plans-pricing` },
        { label: "Plan Catalog", path: `${basePath}/plan-catalog` },
      ],
    },
    {
      label: "Financial",
      items: [
        { label: "Deal Sheet", path: `${basePath}/deal-sheet` },
        { label: "Budget & Financials", path: `${basePath}/budget` },
        { label: "Draw Management", path: `${basePath}/draws` },
        { label: "Loan Tracking", path: `${basePath}/loans` },
        { label: "Investor / Entity", path: `${basePath}/investors` },
      ],
    },
    {
      label: "Execution",
      items: [
        { label: "Jobs Summary", path: `${basePath}/jobs-summary` },
        { label: "Dispo Summary", path: `${basePath}/dispo-summary` },
        { label: "Closeout", path: `${basePath}/closeout` },
        { label: "Files", path: `${basePath}/files` },
        { label: "Shared Links", path: `${basePath}/shared-links` },
        { label: "Upload Requests", path: `${basePath}/upload-requests` },
        { label: "Insurance", path: `${basePath}/insurance` },
      ],
    },
  ];

  const shortcutGroups: ShortcutGroup[] = [
    {
      label: "Tasks",
      items: [
        { label: "Documents", path: `${basePath}/files` },
        { label: "Accounting", path: "/accounting/register" },
        { label: "Connect", path: `${basePath}/shared-links` },
      ],
    },
    {
      label: "Integrations",
      items: [
        { label: "E-Signatures", path: "/operations/esign" },
        { label: "Workflows", path: "/workflows" },
      ],
    },
  ];

  const handleNavigate = (href: string) => {
    navigate({ to: href as string });
  };

  const sidebar = (
    <DetailSidebar
      backLabel="All Projects"
      backPath="/projects"
      title={project?.project_name ?? "Loading..."}
      subtitle={[project?.project_type, project?.status].filter(Boolean).join(" · ")}
      sections={sections}
      shortcutGroups={shortcutGroups}
    >
      {/* Linked record lists */}
      <SidebarRecordList title="Lots" items={lotItems} onNavigate={handleNavigate} />
      <SidebarRecordList title="Jobs" items={jobItems} onNavigate={handleNavigate} />
      <SidebarRecordList title="Dispositions" items={dispoItems} onNavigate={handleNavigate} />

      {/* Task summary */}
      <div>
        <div className="px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-heading">Tasks</span>
        </div>
        {taskTotal === 0 ? (
          <div className="px-3 py-2 text-[11px] text-sidebar-heading">No tasks</div>
        ) : (
          <div className="px-3 pb-2 text-[12px] text-sidebar-text">
            {taskOverdue > 0 && <span className="text-destructive-text">{taskOverdue} overdue</span>}
            {taskOverdue > 0 && (taskActive > 0 || taskTotal > 0) && " · "}
            {taskActive > 0 && <span>{taskActive} active</span>}
            {taskActive > 0 && taskTotal > 0 && " · "}
            <span>{taskTotal} total</span>
          </div>
        )}
      </div>
    </DetailSidebar>
  );

  return (
    <PageWithSidebar sidebar={sidebar}>
      <Outlet />
    </PageWithSidebar>
  );
}

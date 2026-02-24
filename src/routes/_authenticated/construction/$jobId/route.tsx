import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageWithSidebar } from "@/components/layout/AppShell";
import { DetailSidebar, type SidebarSection } from "@/components/layout/DetailSidebar";
import { type SidebarRecordItem, SidebarRecordList } from "@/components/sidebar/SidebarRecordList";
import { SidebarTaskProgress } from "@/components/sidebar/SidebarTaskProgress";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/construction/$jobId")({
  component: JobLayout,
});

const PO_COLORS: Record<string, string> = {
  Draft: "gray",
  Submitted: "blue",
  Approved: "green",
  "In Progress": "yellow",
  Complete: "green",
  Invoiced: "blue",
  Paid: "green",
  Void: "red",
};

interface WfTask {
  status: string;
  task_name: string;
  due_date: string | null;
}

interface PORow {
  id: string;
  po_number: string | null;
  vendor_name: string | null;
  amount: number | null;
  status: string;
  cost_code: string | null;
}

function JobLayout() {
  const { jobId } = Route.useParams();
  const navigate = useNavigate();

  const { data: job } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, lot_number, floor_plan_name, status, project_name")
        .eq("id", jobId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  /* ── Linked record queries ── */
  const { data: tasks = [] } = useQuery<WfTask[]>({
    queryKey: ["job-tasks", jobId],
    queryFn: async () => {
      const { data: instances } = await supabase
        .from("workflow_instances")
        .select("id")
        .eq("record_id", jobId)
        .eq("record_type", "job");
      if (!instances || instances.length === 0) return [];
      const instanceIds = instances.map((i) => i.id);
      const { data, error } = await supabase
        .from("workflow_instance_tasks")
        .select("status, task_name, due_date")
        .in("instance_id", instanceIds)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: purchaseOrders = [] } = useQuery<PORow[]>({
    queryKey: ["job-purchase-orders", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("id, po_number, vendor_name, amount, status, cost_code")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  /* ── Map POs to SidebarRecordItem ── */
  const poItems: SidebarRecordItem[] = useMemo(
    () =>
      purchaseOrders.map((po) => ({
        id: po.id,
        label: [po.po_number, po.vendor_name, po.amount != null ? formatCurrency(po.amount) : null]
          .filter(Boolean)
          .join("  "),
        status: po.status,
        statusColor: PO_COLORS[po.status] ?? "gray",
        href: `/construction/${jobId}/purchase-orders`,
      })),
    [purchaseOrders, jobId],
  );

  const basePath = `/construction/${jobId}`;

  const sections: SidebarSection[] = [
    {
      label: "Overview",
      items: [
        { label: "Job Info", path: `${basePath}/job-info` },
        { label: "Budget", path: `${basePath}/budget` },
        { label: "Schedule", path: `${basePath}/schedule` },
      ],
    },
    {
      label: "Procurement",
      items: [
        { label: "Purchase Orders", path: `${basePath}/purchase-orders` },
        { label: "Subcontracts", path: `${basePath}/subcontracts` },
        { label: "Change Orders", path: `${basePath}/change-orders` },
      ],
    },
    {
      label: "Field",
      items: [
        { label: "Inspections", path: `${basePath}/inspections` },
        { label: "Selections", path: `${basePath}/selections` },
        { label: "Photos", path: `${basePath}/photos` },
        { label: "Daily Logs", path: `${basePath}/daily-logs` },
      ],
    },
    {
      label: "Closeout",
      items: [
        { label: "Handoff", path: `${basePath}/handoff` },
        { label: "Punch List", path: `${basePath}/punch-list` },
        { label: "Warranty", path: `${basePath}/warranty` },
        { label: "Files", path: `${basePath}/files` },
        { label: "Shared Links", path: `${basePath}/shared-links` },
        { label: "Upload Requests", path: `${basePath}/upload-requests` },
        { label: "Permits", path: `${basePath}/permits` },
      ],
    },
  ];

  const title = job ? `Lot ${job.lot_number ?? "—"}` : "Loading...";
  const subtitle = [job?.floor_plan_name, job?.project_name, job?.status].filter(Boolean).join(" · ");

  const handleNavigate = (href: string) => {
    navigate({ to: href as string });
  };

  const sidebar = (
    <DetailSidebar backLabel="All Jobs" backPath="/construction" title={title} subtitle={subtitle} sections={sections}>
      {/* Task progress */}
      <SidebarTaskProgress title="Tasks" tasks={tasks} />

      {/* Purchase orders */}
      <SidebarRecordList title="Purchase Orders" items={poItems} onNavigate={handleNavigate} />
    </DetailSidebar>
  );

  return (
    <PageWithSidebar sidebar={sidebar}>
      <Outlet />
    </PageWithSidebar>
  );
}

import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PageWithSidebar } from "@/components/layout/AppShell";
import { DetailSidebar, type SidebarSection } from "@/components/layout/DetailSidebar";
import { SidebarTaskProgress } from "@/components/sidebar/SidebarTaskProgress";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/disposition/$dispositionId")({
  component: DispositionLayout,
});

interface WfTask {
  status: string;
  task_name: string;
  due_date: string | null;
}

function DispositionLayout() {
  const { dispositionId } = Route.useParams();

  const { data: disposition } = useQuery({
    queryKey: ["disposition", dispositionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispositions")
        .select("id, lot_number, project_name, buyer_name, status")
        .eq("id", dispositionId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  /* ── Task query ── */
  const { data: tasks = [] } = useQuery<WfTask[]>({
    queryKey: ["disposition-tasks", dispositionId],
    queryFn: async () => {
      const { data: instances } = await supabase
        .from("workflow_instances")
        .select("id")
        .eq("record_id", dispositionId)
        .eq("record_type", "disposition");
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

  const basePath = `/disposition/${dispositionId}`;

  const sections: SidebarSection[] = [
    {
      label: "Sales",
      items: [
        { label: "Overview", path: `${basePath}/overview` },
        { label: "Marketing", path: `${basePath}/marketing` },
        { label: "Showings", path: `${basePath}/showings` },
        { label: "Offers", path: `${basePath}/offers` },
      ],
    },
    {
      label: "Contract",
      items: [
        { label: "Buyer Info", path: `${basePath}/buyer-info` },
        { label: "Pricing & Contract", path: `${basePath}/pricing-contract` },
        { label: "Option Selections", path: `${basePath}/option-selections` },
        { label: "Lender & Financing", path: `${basePath}/lender-financing` },
      ],
    },
    {
      label: "Closing",
      items: [
        { label: "Closing Coordination", path: `${basePath}/closing-coordination` },
        { label: "Settlement & Proceeds", path: `${basePath}/settlement` },
        { label: "Post-Closing", path: `${basePath}/post-closing` },
      ],
    },
    {
      label: "Admin",
      items: [
        { label: "Warranty", path: `${basePath}/warranty` },
        { label: "Files", path: `${basePath}/files` },
        { label: "Shared Links", path: `${basePath}/shared-links` },
        { label: "Upload Requests", path: `${basePath}/upload-requests` },
      ],
    },
  ];

  const title = disposition ? disposition.buyer_name || `Lot ${disposition.lot_number ?? "—"}` : "Loading...";
  const subtitle = [
    disposition?.project_name,
    disposition?.lot_number ? `Lot ${disposition.lot_number}` : null,
    disposition?.status,
  ]
    .filter(Boolean)
    .join(" · ");

  const sidebar = (
    <DetailSidebar
      backLabel="All Dispositions"
      backPath="/disposition"
      title={title}
      subtitle={subtitle}
      sections={sections}
    >
      {/* Task progress */}
      <SidebarTaskProgress title="Tasks" tasks={tasks} />
    </DetailSidebar>
  );

  return (
    <PageWithSidebar sidebar={sidebar}>
      <Outlet />
    </PageWithSidebar>
  );
}

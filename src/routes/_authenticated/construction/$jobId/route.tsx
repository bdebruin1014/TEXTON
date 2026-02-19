import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PageWithSidebar } from "@/components/layout/AppShell";
import { DetailSidebar, type SidebarSection } from "@/components/layout/DetailSidebar";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/construction/$jobId")({
  component: JobLayout,
});

function JobLayout() {
  const { jobId } = Route.useParams();

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
        { label: "Punch List", path: `${basePath}/punch-list` },
        { label: "Warranty", path: `${basePath}/warranty` },
        { label: "Files", path: `${basePath}/files` },
        { label: "Permits", path: `${basePath}/permits` },
      ],
    },
  ];

  const title = job ? `Lot ${job.lot_number ?? "—"}` : "Loading...";
  const subtitle = [job?.floor_plan_name, job?.project_name, job?.status].filter(Boolean).join(" · ");

  const sidebar = (
    <DetailSidebar
      backLabel="All Jobs"
      backPath="/construction"
      title={title}
      subtitle={subtitle}
      sections={sections}
    />
  );

  return (
    <PageWithSidebar sidebar={sidebar}>
      <Outlet />
    </PageWithSidebar>
  );
}

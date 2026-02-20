import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PageWithSidebar } from "@/components/layout/AppShell";
import { DetailSidebar, type SidebarSection } from "@/components/layout/DetailSidebar";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  component: ProjectLayout,
});

function ProjectLayout() {
  const { projectId } = Route.useParams();

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

  const sidebar = (
    <DetailSidebar
      backLabel="All Projects"
      backPath="/projects"
      title={project?.project_name ?? "Loading..."}
      subtitle={[project?.project_type, project?.status].filter(Boolean).join(" · ")}
      sections={sections}
    />
  );

  return (
    <PageWithSidebar sidebar={sidebar}>
      <Outlet />
    </PageWithSidebar>
  );
}

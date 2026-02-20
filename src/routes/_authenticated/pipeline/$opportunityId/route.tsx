import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PageWithSidebar } from "@/components/layout/AppShell";
import { DetailSidebar, type SidebarSection } from "@/components/layout/DetailSidebar";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/pipeline/$opportunityId")({
  component: OpportunityLayout,
});

function OpportunityLayout() {
  const { opportunityId } = Route.useParams();

  const { data: opp } = useQuery({
    queryKey: ["opportunity", opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("id, opportunity_name, status")
        .eq("id", opportunityId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const basePath = `/pipeline/${opportunityId}`;

  const sections: SidebarSection[] = [
    {
      label: "Overview",
      items: [
        { label: "Basic Info", path: `${basePath}/basic-info` },
        { label: "Property Details", path: `${basePath}/property-details` },
      ],
    },
    {
      label: "Details",
      items: [
        { label: "Parcels", path: `${basePath}/parcels` },
        { label: "Contacts", path: `${basePath}/contacts` },
        { label: "Comps", path: `${basePath}/comps` },
      ],
    },
    {
      label: "Analysis",
      items: [
        { label: "Deal Sheet", path: `${basePath}/deal-sheet` },
        { label: "Due Diligence", path: `${basePath}/due-diligence` },
        { label: "Underwriting", path: `${basePath}/underwriting` },
      ],
    },
    {
      label: "Execution",
      items: [
        { label: "Offer & Contract", path: `${basePath}/offer-contract` },
        { label: "Documents", path: `${basePath}/documents` },
      ],
    },
  ];

  const sidebar = (
    <div className="flex h-full flex-col">
      <DetailSidebar
        backLabel="All Opportunities"
        backPath="/pipeline"
        title={opp?.opportunity_name ?? "Loading..."}
        subtitle={opp?.status}
        sections={sections}
      />
      {/* Convert to Project button at bottom of sidebar */}
      <div className="border-r border-t border-border bg-sidebar px-4 py-3" style={{ width: "var(--sidebar-width)" }}>
        <button
          type="button"
          className="w-full rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover disabled:opacity-50"
          disabled={opp?.status !== "Closed - Won"}
          title={opp?.status !== "Closed - Won" ? "Status must be Closed - Won to convert" : "Convert to Project"}
        >
          Convert to Project &#9654;
        </button>
      </div>
    </div>
  );

  return (
    <PageWithSidebar sidebar={sidebar}>
      <Outlet />
    </PageWithSidebar>
  );
}

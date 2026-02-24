import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageWithSidebar } from "@/components/layout/AppShell";
import { DetailSidebar, type ShortcutGroup, type SidebarSection } from "@/components/layout/DetailSidebar";
import { ConvertToProjectModal } from "@/components/pipeline/ConvertToProjectModal";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/pipeline/$opportunityId")({
  component: OpportunityLayout,
});

function OpportunityLayout() {
  const { opportunityId } = Route.useParams();
  const navigate = useNavigate();
  const [showConvertModal, setShowConvertModal] = useState(false);

  const { data: opp } = useQuery({
    queryKey: ["opportunity", opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select(
          "id, opportunity_name, status, project_type, entity_id, address_street, address_city, address_state, address_zip, county, lot_price, contract_price, total_lots, acreage, project_id",
        )
        .eq("id", opportunityId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const basePath = `/pipeline/${opportunityId}`;
  const isConverted = opp?.status === "Converted";

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
        { label: "Shared Links", path: `${basePath}/shared-links` },
        { label: "Upload Requests", path: `${basePath}/upload-requests` },
      ],
    },
  ];

  const shortcutGroups: ShortcutGroup[] = [
    {
      label: "Tasks",
      items: [
        { label: "Documents", path: `${basePath}/documents` },
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

  const canConvert = opp?.status === "Closed Won";

  const sidebar = (
    <div className="flex h-full flex-col">
      <DetailSidebar
        backLabel="All Opportunities"
        backPath="/pipeline"
        title={opp?.opportunity_name ?? "Loading..."}
        subtitle={opp?.status}
        sections={sections}
        shortcutGroups={shortcutGroups}
      />
      {/* Convert to Project button at bottom of sidebar */}
      <div
        className="shrink-0 px-4 py-3"
        style={{
          backgroundColor: "var(--color-sidebar)",
          borderTop: "1px solid var(--sidebar-border)",
        }}
      >
        {isConverted && opp.project_id ? (
          <Link
            to="/projects/$projectId/basic-info"
            params={{ projectId: opp.project_id }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            View Project {"\u2192"}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setShowConvertModal(true)}
            className="w-full rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canConvert}
            title={
              isConverted
                ? "Already converted to project"
                : !canConvert
                  ? "Status must be Closed Won to convert"
                  : "Convert to Project"
            }
          >
            Convert to Project {"\u25B6"}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <PageWithSidebar sidebar={sidebar}>
      <Outlet />
      {opp && (
        <ConvertToProjectModal
          open={showConvertModal}
          onClose={() => setShowConvertModal(false)}
          opportunity={opp}
          onConverted={(projectId) => {
            setShowConvertModal(false);
            navigate({ to: "/projects/$projectId/basic-info", params: { projectId } });
          }}
        />
      )}
    </PageWithSidebar>
  );
}

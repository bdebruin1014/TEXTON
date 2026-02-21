import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PageWithSidebar } from "@/components/layout/AppShell";
import { DetailSidebar, type SidebarSection } from "@/components/layout/DetailSidebar";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/operations/rch-contracts/$contractId")({
  component: ContractLayout,
});

function ContractLayout() {
  const { contractId } = Route.useParams();

  const { data: contract } = useQuery({
    queryKey: ["rch-contract", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rch_contracts")
        .select("id, contract_number, contract_type, status, owner_name")
        .eq("id", contractId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const basePath = `/operations/rch-contracts/${contractId}`;

  const sections: SidebarSection[] = [
    {
      label: "Setup",
      items: [
        { label: "Overview", path: `${basePath}/overview` },
        { label: "Units", path: `${basePath}/units` },
        { label: "Upgrades", path: `${basePath}/upgrades` },
      ],
    },
    {
      label: "Pricing",
      items: [
        { label: "Sterling", path: `${basePath}/sterling` },
        { label: "Lot Conditions", path: `${basePath}/lot-conditions` },
        { label: "Budget", path: `${basePath}/budget` },
      ],
    },
    {
      label: "Finalize",
      items: [
        { label: "Contract Preview", path: `${basePath}/contract-preview` },
        { label: "Signatures", path: `${basePath}/signatures` },
        { label: "Create Jobs", path: `${basePath}/create-jobs` },
        { label: "Files", path: `${basePath}/files` },
      ],
    },
  ];

  const title = contract ? contract.contract_number || "New Contract" : "Loading...";
  const subtitle = [contract?.contract_type, contract?.owner_name, contract?.status].filter(Boolean).join(" \u00B7 ");

  const sidebar = (
    <DetailSidebar
      backLabel="All Contracts"
      backPath="/operations/rch-contracts"
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

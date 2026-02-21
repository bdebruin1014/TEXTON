import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PageWithSidebar } from "@/components/layout/AppShell";
import { DetailSidebar, type ShortcutGroup, type SidebarSection } from "@/components/layout/DetailSidebar";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/accounting/$entityId")({
  component: EntityAccountingLayout,
});

function EntityAccountingLayout() {
  const { entityId } = Route.useParams();

  const { data: entity } = useQuery({
    queryKey: ["entity", entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entities")
        .select("id, name, entity_type, status")
        .eq("id", entityId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch cash balance for stats
  const { data: cashBalance = 0 } = useQuery({
    queryKey: ["entity-cash-balance", entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("current_balance")
        .eq("entity_id", entityId)
        .eq("status", "Active");
      if (error) return 0;
      return (data ?? []).reduce((sum, b) => sum + (b.current_balance ?? 0), 0);
    },
  });

  const basePath = `/accounting/${entityId}`;

  const sections: SidebarSection[] = [
    {
      label: "Ledger",
      items: [
        { label: "Register", path: `${basePath}/register` },
        { label: "Journal Entries", path: "/accounting/journal-entries" },
        { label: "Chart of Accounts", path: "/accounting/chart-of-accounts" },
      ],
    },
    {
      label: "Banking",
      items: [
        { label: "Bank Accounts", path: `${basePath}/banking` },
        { label: "Reconciliation", path: `${basePath}/reconciliations` },
        { label: "Aggregate Payments", path: `${basePath}/aggregate-payments` },
      ],
    },
    {
      label: "Payables / Receivables",
      items: [
        { label: "Invoices", path: `${basePath}/invoices` },
        { label: "AP", path: "/accounting/ap" },
        { label: "AR", path: "/accounting/ar" },
      ],
    },
    {
      label: "Reporting",
      items: [
        { label: "Reports", path: `${basePath}/reports` },
        { label: "Job Costing", path: "/accounting/job-costing" },
        { label: "Period Close", path: "/accounting/period-close" },
      ],
    },
  ];

  const shortcutGroups: ShortcutGroup[] = [
    {
      label: "Tasks",
      items: [
        { label: "All Entities", path: "/accounting" },
        { label: "Projects", path: "/projects" },
      ],
    },
  ];

  const sidebar = (
    <DetailSidebar
      backLabel="All Entities"
      backPath="/accounting"
      title={entity?.name ?? "Loading..."}
      subtitle={[entity?.entity_type, entity?.status].filter(Boolean).join(" \u00B7 ")}
      stats={[{ label: "Cash", value: formatCurrency(cashBalance) }]}
      sections={sections}
      shortcutGroups={shortcutGroups}
    />
  );

  return (
    <PageWithSidebar sidebar={sidebar}>
      <Outlet />
    </PageWithSidebar>
  );
}

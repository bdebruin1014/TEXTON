import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useMatches, useRouterState } from "@tanstack/react-router";
import { PageWithSidebar } from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/accounting")({
  component: AccountingLayout,
});

interface Entity {
  id: string;
  name: string;
}

const NAV_SECTIONS = [
  {
    label: "Ledger",
    items: [
      { label: "Register", path: "/accounting/register" },
      { label: "Journal Entries", path: "/accounting/journal-entries" },
      { label: "Chart of Accounts", path: "/accounting/chart-of-accounts" },
    ],
  },
  {
    label: "Banking",
    items: [
      { label: "Bank Accounts", path: "/accounting/banking" },
      { label: "Reconciliation", path: "/accounting/reconciliations" },
      { label: "Aggregate Payments", path: "/accounting/aggregate-payments" },
    ],
  },
  {
    label: "Payables / Receivables",
    items: [
      { label: "Invoices", path: "/accounting/invoices" },
      { label: "AP", path: "/accounting/ap" },
      { label: "AR", path: "/accounting/ar" },
    ],
  },
  {
    label: "Reporting",
    items: [
      { label: "Reports", path: "/accounting/reports" },
      { label: "Job Costing", path: "/accounting/job-costing" },
      { label: "Period Close", path: "/accounting/period-close" },
    ],
  },
] as const;

function AccountingLayout() {
  const { activeEntityId, setActiveEntity } = useEntityStore();
  const matches = useMatches();
  const location = useRouterState({ select: (s) => s.location });
  const currentPath = matches.at(-1)?.fullPath ?? "";

  // Index page renders full-width (no sidebar)
  const isIndex = location.pathname === "/accounting" || location.pathname === "/accounting/";

  // Entity detail routes ($entityId/...) have their own sidebar via $entityId/route.tsx
  const isEntityDetail = matches.some((m) => "entityId" in ((m.params as Record<string, unknown>) ?? {}));

  // Pass through for index page and entity detail routes
  if (isIndex || isEntityDetail) {
    return <Outlet />;
  }

  // Flat routes (register, banking, etc.) get the module sidebar
  const { data: entities = [] } = useQuery<Entity[]>({
    queryKey: ["entities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("entities").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const sidebar = (
    <aside
      className="flex h-full flex-col bg-sidebar"
      style={{ width: "var(--sidebar-width)", borderRight: "1px solid var(--sidebar-border)" }}
    >
      {/* Entity Picker */}
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <label
          className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--sidebar-heading)" }}
        >
          Entity
        </label>
        <select
          value={activeEntityId ?? ""}
          onChange={(e) => setActiveEntity(e.target.value)}
          className="w-full rounded px-2 py-1.5 text-sm font-medium outline-none"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            border: "1px solid var(--sidebar-border)",
            color: "#FFFFFF",
          }}
        >
          <option value="">All Entities</option>
          {entities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-2">
            <div className="px-4 py-1">
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--sidebar-heading)" }}
              >
                {section.label}
              </span>
            </div>
            {section.items.map((item) => {
              const isActive = currentPath === item.path || currentPath.startsWith(`${item.path}/`);
              return (
                <Link
                  key={item.path}
                  to={item.path as string}
                  className={cn(
                    "block border-l-2 px-4 py-2 text-sm transition-colors",
                    isActive ? "font-medium" : "border-transparent hover:bg-[var(--sidebar-hover-bg)]",
                  )}
                  style={
                    isActive
                      ? {
                          borderLeftColor: "var(--sidebar-active-border)",
                          backgroundColor: "var(--sidebar-active-bg)",
                          color: "var(--sidebar-active-text)",
                        }
                      : { color: "var(--sidebar-text)" }
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );

  return (
    <PageWithSidebar sidebar={sidebar}>
      <Outlet />
    </PageWithSidebar>
  );
}

import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { PageWithSidebar } from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const NAV_SECTIONS = [
  {
    label: "People",
    items: [
      { label: "Users", path: "/admin/users" },
      { label: "Permissions", path: "/admin/permissions" },
    ],
  },
  {
    label: "Organization",
    items: [
      { label: "Entities", path: "/admin/entities" },
      { label: "COA Templates", path: "/admin/coa-templates" },
      { label: "Bank Accounts", path: "/admin/bank-accounts" },
      { label: "Fee Schedule", path: "/admin/fee-schedule" },
    ],
  },
  {
    label: "Configuration",
    items: [
      { label: "Cost Books", path: "/admin/cost-books" },
      { label: "Floor Plans", path: "/admin/floor-plans" },
      { label: "Municipalities", path: "/admin/municipalities" },
      { label: "Upgrade Packages", path: "/admin/upgrade-packages" },
      { label: "Site Work Items", path: "/admin/site-work-items" },
      { label: "Pricing Defaults", path: "/admin/pricing-defaults" },
      { label: "Cost Codes", path: "/admin/cost-codes" },
      { label: "Documents", path: "/admin/documents" },
      { label: "Folder Templates", path: "/admin/documents/folder-templates" },
      { label: "Document Tags", path: "/admin/documents/tags" },
      { label: "Storage", path: "/admin/documents/storage" },
    ],
  },
  {
    label: "Workflows",
    items: [{ label: "Templates", path: "/admin/workflows" }],
  },
  {
    label: "System",
    items: [
      { label: "Integrations", path: "/admin/integrations" },
      { label: "Audit Log", path: "/admin/audit-log" },
    ],
  },
] as const;

function AdminLayout() {
  const matches = useMatches();
  const currentPath = matches.at(-1)?.fullPath ?? "";

  const sidebar = (
    <aside
      className="flex h-full flex-col bg-sidebar"
      style={{ width: "var(--sidebar-width)", borderRight: "1px solid var(--sidebar-border)" }}
    >
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <span className="text-sm font-semibold" style={{ color: "#FFFFFF" }}>
          Admin
        </span>
        <p className="text-[10px]" style={{ color: "var(--sidebar-heading)" }}>
          System configuration
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {/* Overview link */}
        <div className="mb-2">
          <Link
            to="/admin"
            className={cn(
              "block border-l-2 px-4 py-2 text-sm transition-colors",
              currentPath === "/admin" || currentPath === "/admin/"
                ? "font-medium"
                : "border-transparent hover:bg-[var(--sidebar-hover-bg)]",
            )}
            style={
              currentPath === "/admin" || currentPath === "/admin/"
                ? {
                    borderLeftColor: "var(--sidebar-active-border)",
                    backgroundColor: "var(--sidebar-active-bg)",
                    color: "var(--sidebar-active-text)",
                  }
                : { color: "var(--sidebar-text)" }
            }
          >
            Overview
          </Link>
        </div>

        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-2">
            <div className="px-4 py-1">
              <span
                className="text-[10px] font-semibold uppercase tracking-wider "
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

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
      { label: "Bank Accounts", path: "/admin/bank-accounts" },
      { label: "Fee Schedule", path: "/admin/fee-schedule" },
    ],
  },
  {
    label: "Configuration",
    items: [
      { label: "Floor Plans", path: "/admin/floor-plans" },
      { label: "Cost Codes", path: "/admin/cost-codes" },
      { label: "Documents", path: "/admin/documents" },
      { label: "Folder Templates", path: "/admin/documents/folder-templates" },
      { label: "Document Tags", path: "/admin/documents/tags" },
      { label: "Storage", path: "/admin/documents/storage" },
    ],
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
    <aside className="flex h-full flex-col border-r border-border bg-sidebar" style={{ width: "var(--sidebar-width)" }}>
      <div className="border-b border-border px-4 py-3">
        <span className="text-sm font-semibold text-foreground">Admin</span>
        <p className="text-[10px] text-muted">System configuration</p>
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
                : { color: "var(--color-muted)" }
            }
          >
            Overview
          </Link>
        </div>

        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-2">
            <div className="px-4 py-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{section.label}</span>
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
                      : { color: "var(--color-muted)" }
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

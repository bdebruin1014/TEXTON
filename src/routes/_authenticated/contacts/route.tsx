import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { PageWithSidebar } from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/contacts")({
  component: ContactsLayout,
});

const NAV_ITEMS = [
  { label: "Companies", path: "/contacts" },
  { label: "Employees", path: "/contacts/employees" },
  { label: "Customers", path: "/contacts/customers" },
] as const;

function ContactsLayout() {
  const matches = useMatches();
  const currentPath = matches.at(-1)?.fullPath ?? "";

  const sidebar = (
    <aside className="flex h-full flex-col border-r border-border bg-sidebar" style={{ width: "var(--sidebar-width)" }}>
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <span className="text-sm font-semibold text-foreground">Contacts</span>
        <p className="text-[10px] text-muted">People & companies directory</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        <div className="mb-2">
          <div className="px-4 py-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Directory</span>
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.path === "/contacts"
                ? currentPath === "/contacts" || currentPath === "/contacts/"
                : currentPath === item.path || currentPath.startsWith(`${item.path}/`);
            // Also highlight Companies when viewing a company detail page
            const isCompanyDetail =
              item.path === "/contacts" &&
              currentPath.startsWith("/contacts/") &&
              !currentPath.startsWith("/contacts/employees") &&
              !currentPath.startsWith("/contacts/customers");
            const active = isActive || isCompanyDetail;
            return (
              <Link
                key={item.path}
                to={item.path as string}
                className={cn(
                  "block border-l-2 px-4 py-2 text-sm transition-colors",
                  active ? "font-medium" : "border-transparent hover:bg-[var(--sidebar-hover-bg)]",
                )}
                style={
                  active
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
      </nav>
    </aside>
  );

  return (
    <PageWithSidebar sidebar={sidebar}>
      <Outlet />
    </PageWithSidebar>
  );
}

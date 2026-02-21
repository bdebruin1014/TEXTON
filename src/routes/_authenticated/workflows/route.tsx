import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { PageWithSidebar } from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/workflows")({
  component: WorkflowsLayout,
});

const NAV_SECTIONS = [
  {
    label: "Workflows",
    items: [
      { label: "Core Workflows", path: "/workflows" },
      { label: "Templates", path: "/workflows/templates" },
    ],
  },
  {
    label: "Configuration",
    items: [
      { label: "Transaction Types", path: "/workflows/transaction-types" },
      { label: "Smart Actions", path: "/workflows/smart-actions" },
      { label: "Assignment Groups", path: "/workflows/assignment-groups" },
    ],
  },
];

function WorkflowsLayout() {
  const matches = useMatches();
  const currentPath = matches.at(-1)?.fullPath ?? "";

  const sidebar = (
    <aside
      className="flex h-full flex-col bg-sidebar"
      style={{ width: "var(--sidebar-width)", borderRight: "1px solid var(--sidebar-border)" }}
    >
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <span className="text-sm font-semibold" style={{ color: "#FFFFFF" }}>
          Workflows
        </span>
        <p className="text-[10px]" style={{ color: "var(--sidebar-heading)" }}>
          Qualia-style workflow management
        </p>
      </div>

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
              const isActive =
                item.path === "/workflows"
                  ? currentPath === "/workflows" || currentPath === "/workflows/"
                  : currentPath === item.path || currentPath.startsWith(`${item.path}/`);
              const isDetailPage =
                item.path === "/workflows" &&
                currentPath.startsWith("/workflows/") &&
                !NAV_SECTIONS.flatMap((s) => s.items)
                  .filter((i) => i.path !== "/workflows")
                  .some((i) => currentPath.startsWith(i.path));
              const active = isActive || isDetailPage;
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

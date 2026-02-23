import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageWithSidebar } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsLayout,
});

const REPORT_SECTIONS = [
  {
    label: "FINANCIAL",
    items: [
      { label: "Trial Balance", path: "/reports/trial-balance" },
      { label: "AP Aging", path: "/reports/ap-aging" },
      { label: "Investor Summary", path: "/reports/investor-summary" },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { label: "Project Summary", path: "/reports/project-summary" },
      { label: "Job Cost", path: "/reports/job-cost" },
      { label: "Construction Schedule", path: "/reports/construction-schedule" },
    ],
  },
  {
    label: "SALES",
    items: [
      { label: "Lot Inventory", path: "/reports/lot-inventory" },
      { label: "Disposition Pipeline", path: "/reports/disposition-pipeline" },
    ],
  },
];

function ReportsLayout() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const sidebar = (
    <div
      className="flex h-full flex-col"
      style={{ backgroundColor: "var(--color-sidebar)" }}
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-4" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <Link to="/reports" className="block">
          <h2 className="text-[15px] font-semibold" style={{ color: "var(--sidebar-active-text)" }}>
            Reports
          </h2>
          <p className="mt-0.5 text-xs" style={{ color: "var(--sidebar-text)" }}>
            Analytics &amp; reporting
          </p>
        </Link>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {REPORT_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <p
              className="mb-1.5 px-2 text-[10px] font-bold tracking-widest"
              style={{ color: "var(--sidebar-heading)" }}
            >
              {section.label}
            </p>
            {section.items.map((item) => {
              const isActive = currentPath === item.path || currentPath.startsWith(`${item.path}/`);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors"
                  style={{
                    color: isActive ? "var(--sidebar-active-text)" : "var(--sidebar-text)",
                    backgroundColor: isActive ? "var(--sidebar-active-bg)" : "transparent",
                    borderLeft: isActive ? "2px solid var(--sidebar-active-border)" : "2px solid transparent",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );

  // Index page renders without sidebar (full-width card grid)
  if (currentPath === "/reports" || currentPath === "/reports/") {
    return <Outlet />;
  }

  return (
    <PageWithSidebar sidebar={sidebar}>
      <Outlet />
    </PageWithSidebar>
  );
}

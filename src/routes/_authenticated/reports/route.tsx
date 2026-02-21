import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageWithSidebar } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsLayout,
});

const PRESET_CATEGORIES = ["General", "Pipeline", "Construction", "Accounting", "Investor", "Disposition", "Tasks"];

const UTILITY_LINKS = [
  { label: "Custom Reports", to: "/reports/custom" },
  { label: "Subscribed", to: "/reports/subscribed" },
  { label: "Report Packages", to: "/reports/packages" },
  { label: "Trends", to: "/reports/trends" },
] as const;

function ReportsLayout() {
  const location = useRouterState({ select: (s) => s.location });

  // Read active category from search params; default to "General" on index page
  const isIndexPage = location.pathname === "/reports" || location.pathname === "/reports/";
  const activeCategory = isIndexPage ? ((location.search as Record<string, string>)?.category ?? "General") : undefined;

  const sidebar = (
    <aside
      className="flex h-full flex-col"
      style={{
        width: "var(--sidebar-width)",
        backgroundColor: "var(--color-sidebar)",
      }}
    >
      {/* Header */}
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <span className="text-sm font-semibold text-white">Reports</span>
        <p className="text-[10px]" style={{ color: "var(--sidebar-heading)" }}>
          Analytics & reporting
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-1">
        {/* Section heading */}
        <div
          className="px-4 pb-1 pt-3 text-[10px] font-semibold tracking-wider"
          style={{ color: "var(--sidebar-heading)" }}
        >
          PRESET REPORTS
        </div>

        {/* Category items */}
        {PRESET_CATEGORIES.map((category) => {
          const isActive = activeCategory === category;
          return (
            <Link
              key={category}
              to={"/reports" as string}
              search={category === "General" ? {} : ({ category } as never)}
              className="flex w-full items-center py-[7px] pl-4 pr-4 text-[13px] transition-colors"
              style={{
                borderLeft: isActive ? "3px solid var(--sidebar-active-border)" : "3px solid transparent",
                backgroundColor: isActive ? "var(--sidebar-active-bg)" : undefined,
                color: isActive ? "var(--sidebar-active-text)" : "var(--sidebar-text)",
                fontWeight: isActive ? 500 : 400,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "var(--sidebar-hover-bg)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              {category}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="mx-4 my-2 h-px" style={{ backgroundColor: "var(--sidebar-border)" }} />

        {/* Utility links */}
        {UTILITY_LINKS.map((link) => {
          const isActive = location.pathname.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to as string}
              className="flex w-full items-center py-[7px] pl-4 pr-4 text-[13px] transition-colors"
              style={{
                borderLeft: isActive ? "3px solid var(--sidebar-active-border)" : "3px solid transparent",
                backgroundColor: isActive ? "var(--sidebar-active-bg)" : undefined,
                color: isActive ? "var(--sidebar-active-text)" : "var(--sidebar-text)",
                fontWeight: isActive ? 500 : 400,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "var(--sidebar-hover-bg)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <PageWithSidebar sidebar={sidebar}>
      <Outlet />
    </PageWithSidebar>
  );
}

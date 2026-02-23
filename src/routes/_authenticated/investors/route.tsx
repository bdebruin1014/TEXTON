import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { PageWithSidebar } from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/investors")({
  component: InvestorsLayout,
});

const NAV_ITEMS = [
  { label: "Funds", path: "/investors" },
  { label: "Capital Calls", path: "/investors/capital-calls" },
  { label: "Distributions", path: "/investors/distributions" },
] as const;

function InvestorsLayout() {
  const matches = useMatches();
  const currentPath = matches.at(-1)?.fullPath ?? "";

  const sidebar = (
    <aside
      className="flex h-full flex-col bg-sidebar"
      style={{ width: "var(--sidebar-width)", borderRight: "1px solid var(--sidebar-border)" }}
    >
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <span className="text-sm font-semibold" style={{ color: "#FFFFFF" }}>
          Investors
        </span>
        <p className="text-[10px]" style={{ color: "var(--sidebar-heading)" }}>
          Fund management & distributions
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        <div className="mb-2">
          <div className="px-4 py-1">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--sidebar-heading)" }}
            >
              Management
            </span>
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.path === "/investors"
                ? currentPath === "/investors" || currentPath === "/investors/"
                : currentPath === item.path || currentPath.startsWith(`${item.path}/`);
            const isFundDetail =
              item.path === "/investors" &&
              currentPath.startsWith("/investors/") &&
              !currentPath.startsWith("/investors/capital-calls") &&
              !currentPath.startsWith("/investors/distributions");
            const isDistributionDetail =
              item.path === "/investors/distributions" && currentPath.startsWith("/investors/distributions/");
            const active = isActive || isFundDetail || isDistributionDetail;
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
      </nav>
    </aside>
  );

  return (
    <PageWithSidebar sidebar={sidebar}>
      <Outlet />
    </PageWithSidebar>
  );
}

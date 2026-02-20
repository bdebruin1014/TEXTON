import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export interface SidebarSection {
  label: string;
  items: SidebarLink[];
}

interface SidebarLink {
  label: string;
  path: string;
}

interface DetailSidebarProps {
  backLabel: string;
  backPath: string;
  title: string;
  subtitle?: string;
  sections: SidebarSection[];
}

export function DetailSidebar({ backLabel, backPath, title, subtitle, sections }: DetailSidebarProps) {
  const location = useRouterState({ select: (s) => s.location });

  return (
    <aside
      className="flex h-full flex-col"
      style={{
        width: "var(--sidebar-width)",
        backgroundColor: "var(--color-sidebar)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Back link */}
      <Link
        to={backPath}
        className="flex items-center gap-1 px-4 py-3 text-xs font-medium transition-colors"
        style={{
          color: "var(--sidebar-text)",
          borderBottom: "1px solid var(--sidebar-border)",
        }}
      >
        <span className="text-xs">{"\u2190"}</span>
        {backLabel}
      </Link>

      {/* Identity block */}
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <h2 className="truncate text-sm font-semibold" style={{ color: "#FFFFFF" }}>
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs" style={{ color: "var(--sidebar-text)" }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Section navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {sections.map((section) => (
          <div key={section.label} className="mb-2">
            <p
              className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--sidebar-heading)" }}
            >
              {section.label}
            </p>
            {section.items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex w-full items-center border-l-2 px-4 py-1.5 text-sm transition-colors",
                    isActive ? "font-medium" : "border-transparent",
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
}

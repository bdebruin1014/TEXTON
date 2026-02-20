import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export interface SidebarSection {
  label: string;
  items: SidebarLink[];
}

export interface SidebarLink {
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
    <aside className="flex h-full flex-col border-r border-border bg-sidebar" style={{ width: "var(--sidebar-width)" }}>
      {/* Back link */}
      <Link
        to={backPath}
        className="flex items-center gap-1 border-b border-border px-4 py-3 text-xs font-medium text-muted transition-colors hover:text-foreground"
      >
        <span className="text-xs">{"\u2190"}</span>
        {backLabel}
      </Link>

      {/* Identity block */}
      <div className="border-b border-border px-4 py-3">
        <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p>}
      </div>

      {/* Section navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {sections.map((section) => (
          <div key={section.label} className="mb-2">
            <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">{section.label}</p>
            {section.items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex w-full items-center border-l-2 px-4 py-1.5 text-sm transition-colors",
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
}

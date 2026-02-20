import { cn } from "@/lib/utils";

export interface SidebarFilterItem {
  label: string;
  count?: number;
  value: string;
}

export interface SidebarMetric {
  label: string;
  value: string | number;
}

interface IndexSidebarProps {
  title: string;
  filters: SidebarFilterItem[];
  activeFilter: string;
  onFilterChange: (value: string) => void;
  metrics?: SidebarMetric[];
}

export function IndexSidebar({ title, filters, activeFilter, onFilterChange, metrics }: IndexSidebarProps) {
  return (
    <aside
      className="flex h-full flex-col"
      style={{
        width: "var(--sidebar-width)",
        backgroundColor: "var(--color-sidebar)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--sidebar-heading)" }}>
          {title}
        </h2>
      </div>

      <nav className="flex-1 overflow-y-auto py-1">
        {filters.map((item) => {
          const isActive = activeFilter === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onFilterChange(item.value)}
              className={cn(
                "flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors border-l-2",
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
              <span>{item.label}</span>
              {item.count != null && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs",
                    isActive
                      ? "font-medium"
                      : "",
                  )}
                  style={{
                    backgroundColor: isActive ? "rgba(107, 158, 122, 0.2)" : "rgba(255, 255, 255, 0.08)",
                    color: isActive ? "#6B9E7A" : "var(--sidebar-text)",
                  }}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {metrics && metrics.length > 0 && (
        <div className="px-4 py-3" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
          {metrics.map((m) => (
            <div key={m.label} className="flex items-center justify-between py-1">
              <span className="text-xs" style={{ color: "var(--sidebar-text)" }}>
                {m.label}
              </span>
              <span className="text-xs font-medium" style={{ color: "var(--sidebar-active-text)" }}>
                {m.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

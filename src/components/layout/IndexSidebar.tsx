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
    <aside className="flex h-full flex-col border-r border-border bg-sidebar" style={{ width: "var(--sidebar-width)" }}>
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>

      <nav className="flex-1 overflow-y-auto py-1">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onFilterChange(item.value)}
            className={cn(
              "flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors",
              activeFilter === item.value
                ? "border-l-2 font-medium"
                : "border-l-2 border-transparent hover:bg-[var(--sidebar-hover-bg)]",
            )}
            style={
              activeFilter === item.value
                ? {
                    borderLeftColor: "var(--sidebar-active-border)",
                    backgroundColor: "var(--sidebar-active-bg)",
                    color: "var(--sidebar-active-text)",
                  }
                : { color: "var(--color-muted)" }
            }
          >
            <span>{item.label}</span>
            {item.count != null && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  activeFilter === item.value ? "bg-primary/10 font-medium text-primary" : "bg-gray-100 text-muted",
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {metrics && metrics.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          {metrics.map((m) => (
            <div key={m.label} className="flex items-center justify-between py-1">
              <span className="text-xs text-muted">{m.label}</span>
              <span className="text-xs font-medium text-foreground">{m.value}</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

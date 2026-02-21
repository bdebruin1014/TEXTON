import { useState } from "react";
import { cn } from "@/lib/utils";

export interface SidebarFilterItem {
  label: string;
  count?: number;
  value: string;
  /** Indent level for sub-items (0 = top level, 1 = child) */
  indent?: number;
}

interface SidebarMetric {
  label: string;
  value: string | number;
}

interface IndexSidebarProps {
  title: string;
  filters: SidebarFilterItem[];
  activeFilter: string;
  onFilterChange: (value: string) => void;
  metrics?: SidebarMetric[];
  /** Show search box under title (like Qualia Admin) */
  searchable?: boolean;
  /** Optional create button */
  onCreate?: () => void;
  createLabel?: string;
}

/**
 * Index sidebar — Qualia pattern.
 *
 * Dark slate background (#2D3748). Module title at top,
 * optional search, clickable status filters with count
 * badges, aggregate metrics at bottom.
 *
 * KEY: Active item = GREEN left border + GREEN text.
 * Not white — green. This is what Qualia does.
 */
export function IndexSidebar({
  title,
  filters,
  activeFilter,
  onFilterChange,
  metrics,
  searchable,
  onCreate,
  createLabel,
}: IndexSidebarProps) {
  const [search, setSearch] = useState("");

  const filtered = search ? filters.filter((f) => f.label.toLowerCase().includes(search.toLowerCase())) : filters;

  return (
    <aside
      className="flex h-full flex-col"
      style={{
        width: "var(--sidebar-width)",
        backgroundColor: "var(--color-sidebar)",
      }}
    >
      {/* Module title */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <h2 className="text-[13px] font-semibold text-white">{title}</h2>
        {onCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="rounded px-2 py-1 text-[11px] font-medium transition-colors"
            style={{
              backgroundColor: "var(--color-button)",
              color: "var(--color-button-foreground)",
            }}
          >
            {createLabel ?? "+ New"}
          </button>
        )}
      </div>

      {/* Optional search (like Qualia Admin) */}
      {searchable && (
        <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded px-2.5 py-1.5 text-xs text-white outline-none"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              border: "1px solid var(--sidebar-border)",
              color: "#FFFFFF",
            }}
          />
        </div>
      )}

      {/* Filter list */}
      <nav className="flex-1 overflow-y-auto py-1">
        {filtered.map((item) => {
          const isActive = activeFilter === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onFilterChange(item.value)}
              className={cn(
                "flex w-full items-center justify-between py-[7px] text-left text-[13px] transition-colors",
                item.indent ? "pl-8 pr-4" : "pl-4 pr-4",
              )}
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
              <span>{item.label}</span>
              {item.count != null && (
                <span
                  className="min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[11px] leading-none"
                  style={{
                    backgroundColor: isActive ? "rgba(72, 187, 120, 0.15)" : "rgba(255, 255, 255, 0.08)",
                    color: isActive ? "var(--sidebar-active-text)" : "var(--sidebar-text)",
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom aggregate metrics */}
      {metrics && metrics.length > 0 && (
        <div className="px-4 py-3" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
          {metrics.map((m) => (
            <div key={m.label} className="flex items-center justify-between py-1">
              <span className="text-[11px]" style={{ color: "var(--sidebar-text)" }}>
                {m.label}
              </span>
              <span className="text-[11px] font-semibold text-white">{m.value}</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

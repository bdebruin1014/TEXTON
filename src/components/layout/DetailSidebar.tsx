import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";

export interface SidebarSection {
  /** ALL-CAPS divider label with horizontal rule ("ORDER", "CLOSING", etc.) */
  label: string;
  items: SidebarLink[];
  /** If true, section can collapse (Qualia has this on some sections like "Title") */
  collapsible?: boolean;
}

interface SidebarLink {
  label: string;
  path: string;
  /** Optional trailing badge or count */
  badge?: string | number;
}

export interface ShortcutGroup {
  /** ALL-CAPS divider label (e.g. "TASKS", "INTEGRATIONS") */
  label: string;
  items: Array<{ label: string; path: string }>;
}

interface DetailSidebarProps {
  /** Back link text (e.g. "All Projects") */
  backLabel: string;
  backPath: string;
  /** Record name displayed prominently (e.g. "16 Wellington Avenue") */
  title: string;
  /** Secondary line (e.g. "Tester File", project code, entity) */
  subtitle?: string;
  /** Optional status text */
  status?: string;
  /** Stats row shown under title (like Qualia's document/task counters) */
  stats?: Array<{ label: string; value: string | number }>;
  /** Optional action button in identity block (like Qualia's "Send Message") */
  action?: { label: string; onClick: () => void };
  /** Grouped navigation sections */
  sections: SidebarSection[];
  /** Bottom shortcut links pinned below scroll area (flat, legacy) */
  shortcuts?: Array<{ label: string; path: string }>;
  /** Grouped bottom shortcuts with section labels (TASKS, INTEGRATIONS, etc.) */
  shortcutGroups?: ShortcutGroup[];
}

/**
 * Detail sidebar — Qualia pattern.
 *
 * Dark slate background (#2D3748). Record identity block at top
 * (title, subtitle, stats, action). Then grouped sections under
 * ALL-CAPS divider labels with horizontal rules extending to the
 * right edge. Active page = GREEN left border + GREEN text.
 * Sections with collapsible=true show ▴/▾ arrows that collapse items.
 *
 * Bottom area has pinned shortcuts grouped under divider labels
 * (like Qualia's TASKS section with Documents, Accounting, Connect).
 */
export function DetailSidebar({
  backLabel,
  backPath,
  title,
  subtitle,
  status,
  stats,
  action,
  sections,
  shortcuts,
  shortcutGroups,
}: DetailSidebarProps) {
  const location = useRouterState({ select: (s) => s.location });
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (label: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <aside
      className="flex h-full flex-col"
      style={{
        width: "var(--sidebar-width)",
        backgroundColor: "var(--color-sidebar)",
      }}
    >
      {/* Back link */}
      <Link
        to={backPath}
        className="flex items-center gap-1.5 px-4 py-2.5 text-xs transition-colors hover:text-white"
        style={{
          color: "var(--sidebar-text)",
          borderBottom: "1px solid var(--sidebar-border)",
        }}
      >
        <span className="text-sm leading-none">{"\u2190"}</span>
        {backLabel}
      </Link>

      {/* Record identity block */}
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <h2 className="truncate text-[13px] font-semibold text-white">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 truncate text-[11px]" style={{ color: "var(--sidebar-text)" }}>
            {subtitle}
          </p>
        )}
        {status && (
          <span
            className="mt-1.5 inline-block rounded px-2 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: "rgba(72, 187, 120, 0.15)",
              color: "var(--sidebar-active-text)",
            }}
          >
            {status}
          </span>
        )}

        {/* Stats row (like Qualia's icon counters under the address) */}
        {stats && stats.length > 0 && (
          <div className="mt-2.5 flex items-center gap-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-[12px] font-medium text-white">{s.value}</div>
                <div className="text-[9px] uppercase tracking-wide" style={{ color: "var(--sidebar-heading)" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action button (like Qualia's "Send Message") */}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-2.5 w-full rounded py-1.5 text-[11px] font-medium transition-colors"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              color: "var(--sidebar-text)",
              border: "1px solid var(--sidebar-border)",
            }}
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Section navigation — scrollable */}
      <nav className="flex-1 overflow-y-auto py-1">
        {sections.map((section) => {
          const isCollapsed = collapsedSections.has(section.label);
          return (
            <div key={section.label}>
              {/* Section divider: ALL CAPS label + horizontal rule + optional collapse arrow */}
              <div className="flex items-center gap-2 px-4 pb-1 pt-4">
                <span
                  className="shrink-0 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--sidebar-heading)" }}
                >
                  {section.label}
                </span>
                <div className="h-px flex-1" style={{ backgroundColor: "var(--sidebar-border)" }} />
                {section.collapsible !== false && (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.label)}
                    className="shrink-0 px-0.5 text-[10px] leading-none transition-colors hover:text-white"
                    style={{ color: "var(--sidebar-heading)" }}
                    aria-label={isCollapsed ? `Expand ${section.label}` : `Collapse ${section.label}`}
                  >
                    {isCollapsed ? "\u25BE" : "\u25B4"}
                  </button>
                )}
              </div>

              {/* Section links — hidden when collapsed */}
              {!isCollapsed &&
                section.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="flex w-full items-center justify-between py-[6px] pl-4 pr-4 text-[13px] transition-colors"
                      style={{
                        borderLeft: isActive ? "3px solid var(--sidebar-active-border)" : "3px solid transparent",
                        backgroundColor: isActive ? "var(--sidebar-active-bg)" : undefined,
                        color: isActive ? "var(--sidebar-active-text)" : "var(--sidebar-text)",
                        fontWeight: isActive ? 500 : 400,
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.backgroundColor = "var(--sidebar-hover-bg)";
                          (e.currentTarget as HTMLElement).style.color = "#FFFFFF";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                          (e.currentTarget as HTMLElement).style.color = "var(--sidebar-text)";
                        }
                      }}
                    >
                      <span>{item.label}</span>
                      {item.badge != null && (
                        <span className="text-[11px]" style={{ color: "var(--sidebar-heading)" }}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
            </div>
          );
        })}
      </nav>

      {/* Bottom shortcuts — pinned below scroll area */}
      {/* Grouped shortcuts (new) */}
      {shortcutGroups && shortcutGroups.length > 0 && (
        <div className="py-2" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
          {shortcutGroups.map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-2 px-4 pb-1 pt-1">
                <span
                  className="shrink-0 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--sidebar-heading)" }}
                >
                  {group.label}
                </span>
                <div className="h-px flex-1" style={{ backgroundColor: "var(--sidebar-border)" }} />
              </div>
              {group.items.map((s) => {
                const isActive = location.pathname === s.path;
                return (
                  <Link
                    key={s.path}
                    to={s.path}
                    className="flex items-center py-[6px] pl-4 pr-4 text-[13px] transition-colors"
                    style={{
                      borderLeft: isActive ? "3px solid var(--sidebar-active-border)" : "3px solid transparent",
                      backgroundColor: isActive ? "var(--sidebar-active-bg)" : undefined,
                      color: isActive ? "var(--sidebar-active-text)" : "var(--sidebar-text)",
                      fontWeight: isActive ? 500 : 400,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = "var(--sidebar-hover-bg)";
                        (e.currentTarget as HTMLElement).style.color = "#FFFFFF";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                        (e.currentTarget as HTMLElement).style.color = "var(--sidebar-text)";
                      }
                    }}
                  >
                    {s.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Flat shortcuts (legacy, kept for backward compat) */}
      {!shortcutGroups && shortcuts && shortcuts.length > 0 && (
        <div className="py-2" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
          <div className="flex items-center gap-2 px-4 pb-1 pt-1">
            <span
              className="shrink-0 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--sidebar-heading)" }}
            >
              Shortcuts
            </span>
            <div className="h-px flex-1" style={{ backgroundColor: "var(--sidebar-border)" }} />
          </div>
          {shortcuts.map((s) => {
            const isActive = location.pathname === s.path;
            return (
              <Link
                key={s.path}
                to={s.path}
                className="flex items-center py-[6px] pl-4 pr-4 text-[13px] transition-colors"
                style={{
                  borderLeft: isActive ? "3px solid var(--sidebar-active-border)" : "3px solid transparent",
                  backgroundColor: isActive ? "var(--sidebar-active-bg)" : undefined,
                  color: isActive ? "var(--sidebar-active-text)" : "var(--sidebar-text)",
                  fontWeight: isActive ? 500 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "var(--sidebar-hover-bg)";
                    (e.currentTarget as HTMLElement).style.color = "#FFFFFF";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "var(--sidebar-text)";
                  }
                }}
              >
                {s.label}
              </Link>
            );
          })}
        </div>
      )}
    </aside>
  );
}

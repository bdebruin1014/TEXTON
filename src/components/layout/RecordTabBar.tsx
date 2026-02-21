import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";

export function RecordTabBar() {
  const recordTabs = useUiStore((s) => s.recordTabs);
  const closeRecordTab = useUiStore((s) => s.closeRecordTab);
  const location = useRouterState({ select: (s) => s.location });
  const navigate = useNavigate();

  if (recordTabs.length === 0) return null;

  return (
    <div
      className="project-tab-bar flex items-end gap-px overflow-x-auto scrollbar-none px-2"
      style={{
        backgroundColor: "var(--tab-bar-bg)",
        minHeight: 32,
      }}
    >
      {recordTabs.map((tab) => {
        const isActive = location.pathname.startsWith(tab.path);
        return (
          <div
            key={tab.id}
            className={cn(
              "group flex max-w-[200px] items-center gap-1.5 rounded-t-md px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-[var(--tab-active-bg)] text-[var(--tab-active-text)] font-semibold"
                : "text-[var(--tab-text)] hover:bg-[var(--tab-hover-bg)] hover:text-[var(--tab-text-hover)]",
            )}
          >
            <Link to={tab.path} className="min-w-0 flex-1 truncate">
              {tab.label}
            </Link>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const idx = recordTabs.findIndex((t) => t.id === tab.id);
                closeRecordTab(tab.id);
                if (isActive && recordTabs.length > 1) {
                  const next = recordTabs[idx === 0 ? 1 : idx - 1];
                  if (next) navigate({ to: next.path });
                }
              }}
              className="ml-1 flex-shrink-0 rounded px-0.5 text-[10px] opacity-0 transition-opacity group-hover:opacity-100"
              style={{ color: "var(--tab-close)" }}
              aria-label={`Close ${tab.label}`}
            >
              {"\u00D7"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

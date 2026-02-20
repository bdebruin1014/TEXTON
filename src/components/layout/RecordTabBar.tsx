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
      className="flex items-end gap-px overflow-x-auto px-2"
      style={{
        backgroundColor: "var(--color-nav-bg)",
        borderBottom: "1px solid var(--color-border)",
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
                ? "bg-background text-foreground"
                : "text-white/60 hover:bg-white/[0.06] hover:text-white/80",
            )}
          >
            <Link
              to={tab.path}
              className="min-w-0 flex-1 truncate"
            >
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
              style={{ color: isActive ? "var(--color-muted)" : "currentColor" }}
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

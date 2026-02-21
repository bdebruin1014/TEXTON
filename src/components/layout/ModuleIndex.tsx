import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface ModuleKpi {
  label: string;
  value: string | number;
  sub?: string;
  accentColor?: string;
}

export interface StatusTab {
  label: string;
  value: string;
  count?: number;
}

interface QuickAction {
  label: string;
  description: string;
  onClick: () => void;
  ai?: boolean;
}

interface ModuleIndexProps {
  title: string;
  subtitle?: string;
  kpis?: ModuleKpi[];
  statusTabs?: StatusTab[];
  activeStatus?: string;
  onStatusChange?: (value: string) => void;
  /** Inline create button rendered top-right under the header */
  onCreate?: () => void;
  createLabel?: string;
  /** FAB actions — shown in the floating action button at bottom-right */
  actions?: QuickAction[];
  fabLabel?: string;
  children: React.ReactNode;
}

function FloatingActionButton({ label, actions }: { label: string; actions: QuickAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-30">
      {/* Action menu — expands upward */}
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-72 rounded-xl border border-border bg-card p-2 shadow-xl">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                setOpen(false);
                action.onClick();
              }}
              className={cn(
                "flex w-full flex-col rounded-lg px-3 py-2.5 text-left transition-colors",
                action.ai ? "bg-success-bg/50 hover:bg-success-bg" : "hover:bg-card-hover",
              )}
            >
              <span className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{action.label}</span>
                {action.ai && (
                  <span className="rounded bg-success px-1.5 py-0.5 text-[10px] font-bold text-white">AI</span>
                )}
              </span>
              <span className="mt-0.5 text-xs text-muted">{action.description}</span>
            </button>
          ))}
        </div>
      )}

      {/* FAB pill button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full bg-button px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-button-hover hover:shadow-xl"
      >
        <span
          className="text-lg leading-none transition-transform duration-200"
          style={{ transform: open ? "rotate(45deg)" : undefined }}
        >
          +
        </span>
        {label}
      </button>
    </div>
  );
}

export function ModuleIndex({
  title,
  subtitle,
  kpis,
  statusTabs,
  activeStatus,
  onStatusChange,
  onCreate,
  createLabel = "New",
  actions,
  fabLabel = "New",
  children,
}: ModuleIndexProps) {
  return (
    <div>
      {/* Header + inline create button */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
        {onCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
          >
            + {createLabel}
          </button>
        )}
      </div>

      {/* KPI Cards */}
      {kpis && kpis.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg border border-border bg-card p-4 shadow-sm"
              style={kpi.accentColor ? { borderLeftWidth: 3, borderLeftColor: kpi.accentColor } : undefined}
            >
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</div>
              <div className="mt-1 text-xl font-bold text-foreground">{kpi.value}</div>
              {kpi.sub && <div className="mt-0.5 text-xs text-muted">{kpi.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Status Filter Tabs — horizontal scrollable pills */}
      {statusTabs && statusTabs.length > 0 && onStatusChange && (
        <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {statusTabs.map((tab) => {
            const isActive = activeStatus === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onStatusChange(tab.value)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground hover:bg-card-hover",
                )}
              >
                {tab.label}
                {tab.count != null && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] leading-none",
                      isActive ? "bg-white/20" : "bg-accent",
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Content — extra bottom padding for FAB clearance */}
      <div className={actions && actions.length > 0 ? "pb-20" : ""}>{children}</div>

      {/* Floating Action Button — only if actions provided */}
      {actions && actions.length > 0 && <FloatingActionButton label={fabLabel} actions={actions} />}
    </div>
  );
}

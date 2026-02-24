import { useCallback, useEffect, useRef, useState } from "react";
import { KPICard } from "@/components/dashboard/KPICard";
import { type StatusPillItem, StatusPills } from "@/components/filters/StatusPills";

export interface ModuleKpi {
  label: string;
  value: string | number;
  sub?: string;
  accentColor?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  status?: "success" | "warning" | "danger";
}

export interface StatusTab {
  label: string;
  value: string;
  count?: number;
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
  /** When provided, shows a dropdown with Quick Create + Create with AI */
  onCreateWithAI?: () => void;
  children: React.ReactNode;
}

function CreateDropdown({
  createLabel,
  onCreate,
  onCreateWithAI,
}: {
  createLabel: string;
  onCreate: () => void;
  onCreateWithAI: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
      >
        + {createLabel}
        <span className="ml-1 text-xs opacity-70">{open ? "\u25B2" : "\u25BC"}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-border bg-card shadow-lg">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onCreate();
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent first:rounded-t-lg"
          >
            Quick Create
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onCreateWithAI();
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent last:rounded-b-lg"
          >
            Create with AI
          </button>
        </div>
      )}
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
  onCreateWithAI,
  children,
}: ModuleIndexProps) {
  const pills: StatusPillItem[] | undefined = statusTabs?.map((tab) => ({
    label: tab.label,
    value: tab.value,
    count: tab.count ?? 0,
  }));

  return (
    <div>
      {/* Header + create button (simple or dropdown) */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
        {onCreate && onCreateWithAI ? (
          <CreateDropdown createLabel={createLabel} onCreate={onCreate} onCreateWithAI={onCreateWithAI} />
        ) : onCreate ? (
          <button
            type="button"
            onClick={onCreate}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
          >
            + {createLabel}
          </button>
        ) : null}
      </div>

      {/* KPI Cards — uses shared KPICard component */}
      {kpis && kpis.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <KPICard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              trend={kpi.trend}
              trendValue={kpi.trendValue}
              status={kpi.status}
              accentColor={kpi.accentColor}
              className="shadow-sm"
            />
          ))}
        </div>
      )}

      {/* Status Filter Pills — uses shared StatusPills component */}
      {pills && pills.length > 0 && activeStatus && onStatusChange && (
        <div className="mb-5">
          <StatusPills statuses={pills} activeStatus={activeStatus} onStatusChange={onStatusChange} />
        </div>
      )}

      {/* Content */}
      <div>{children}</div>
    </div>
  );
}

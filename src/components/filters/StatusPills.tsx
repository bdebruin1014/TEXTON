import { cn } from "@/lib/utils";

export interface StatusPillItem {
  label: string;
  value: string;
  count: number;
}

interface StatusPillsProps {
  statuses: StatusPillItem[];
  activeStatus: string;
  onStatusChange: (value: string) => void;
}

export function StatusPills({ statuses, activeStatus, onStatusChange }: StatusPillsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      {statuses.map((s) => {
        const isActive = activeStatus === s.value;
        return (
          <button
            key={s.value}
            type="button"
            onClick={() => onStatusChange(s.value)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-[#1B3022] text-white"
                : "border border-border bg-card text-muted-foreground hover:bg-card-hover",
            )}
          >
            {s.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] leading-none font-semibold",
                isActive ? "bg-white/20" : "bg-accent",
              )}
            >
              {s.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

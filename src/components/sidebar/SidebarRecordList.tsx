import { cn } from "@/lib/utils";

export interface SidebarRecordItem {
  id: string;
  label: string;
  status: string;
  statusColor: string;
  href: string;
}

interface SidebarRecordListProps {
  title: string;
  items: SidebarRecordItem[];
  onNavigate: (href: string) => void;
}

const DEFAULT_COLORS = { bg: "bg-accent", text: "text-muted-foreground" } as const;

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  green: { bg: "bg-success-bg", text: "text-success-text" },
  yellow: { bg: "bg-warning-bg", text: "text-warning-text" },
  red: { bg: "bg-destructive-bg", text: "text-destructive-text" },
  blue: { bg: "bg-info-bg", text: "text-info-text" },
  gray: DEFAULT_COLORS,
};

export function SidebarRecordList({ title, items, onNavigate }: SidebarRecordListProps) {
  return (
    <div>
      <div className="px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-heading">{title}</span>
      </div>
      {items.length === 0 ? (
        <div className="px-3 py-2 text-[11px] text-sidebar-heading">None</div>
      ) : (
        items.map((item) => {
          const colors = COLOR_MAP[item.statusColor] ?? DEFAULT_COLORS;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.href)}
              className="flex w-full items-center justify-between px-3 py-1.5 text-left transition-colors hover:bg-sidebar-hover-bg rounded"
            >
              <span className="text-[12px] text-sidebar-text truncate mr-2">{item.label}</span>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", colors.bg, colors.text)}>
                {item.status}
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}

import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accentColor?: string;
  trend?: { text: string; direction: "up" | "down" };
  className?: string;
}

export function KpiCard({ label, value, sub, accentColor, trend, className }: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5 transition-all hover:shadow-md hover:-translate-y-px",
        className,
      )}
      style={accentColor ? { borderLeftWidth: "4px", borderLeftColor: accentColor } : undefined}
    >
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      <div className="text-[28px] font-bold text-foreground leading-none tracking-tight">{value}</div>
      {sub && (
        <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
          {sub}
          {trend && (
            <span className={cn("font-semibold text-[11px]", trend.direction === "up" ? "text-success" : "text-destructive")}>
              {trend.direction === "up" ? "\u2191" : "\u2193"} {trend.text}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

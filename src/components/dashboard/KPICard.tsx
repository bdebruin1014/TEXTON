import { cn } from "@/lib/utils";

type TrendDirection = "up" | "down" | "neutral";
type StatusVariant = "success" | "warning" | "danger";

interface KPICardProps {
  label: string;
  value: string | number;
  trend?: TrendDirection;
  trendValue?: string;
  status?: StatusVariant;
  accentColor?: string;
  className?: string;
}

const STATUS_VALUE_COLORS: Record<StatusVariant, string> = {
  success: "text-success-text",
  warning: "text-warning-text",
  danger: "text-destructive-text",
};

const TREND_COLORS: Record<TrendDirection, string> = {
  up: "text-success-text",
  down: "text-destructive-text",
  neutral: "text-muted-foreground",
};

const TREND_ARROWS: Record<TrendDirection, string> = {
  up: "\u2191",
  down: "\u2193",
  neutral: "\u2192",
};

export function KPICard({ label, value, trend, trendValue, status, accentColor, className }: KPICardProps) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-card p-5", className)}
      style={accentColor ? { borderLeftWidth: 3, borderLeftColor: accentColor } : undefined}
    >
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div
        className={cn(
          "text-3xl font-semibold leading-none tracking-tight",
          status ? STATUS_VALUE_COLORS[status] : "text-[#112233]",
        )}
      >
        {value}
      </div>
      {trend && trendValue && (
        <div className={cn("mt-1.5 text-xs font-medium", TREND_COLORS[trend])}>
          {TREND_ARROWS[trend]} {trendValue}
        </div>
      )}
    </div>
  );
}

import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accentColor?: string;
  className?: string;
}

export function KpiCard({ label, value, sub, accentColor, className }: KpiCardProps) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-card p-5 shadow-sm", className)}
      style={accentColor ? { borderLeftWidth: "3px", borderLeftColor: accentColor } : undefined}
    >
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

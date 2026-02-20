import type { SaveStatus } from "@/hooks/useAutoSave";
import { cn } from "@/lib/utils";

interface SaveIndicatorProps {
  status: SaveStatus;
  className?: string;
}

const statusConfig: Record<SaveStatus, { dot: string; label: string }> = {
  idle: { dot: "bg-transparent", label: "" },
  saving: { dot: "bg-warning animate-pulse", label: "Saving..." },
  saved: { dot: "bg-success", label: "Saved" },
  error: { dot: "bg-destructive", label: "Error" },
};

export function SaveIndicator({ status, className }: SaveIndicatorProps) {
  if (status === "idle") return null;

  const config = statusConfig[status];

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted", className)}>
      <span className={cn("h-2 w-2 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

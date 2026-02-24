import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("text-center py-10 px-5", className)}>
      <div className="text-sm font-medium text-text-secondary">{title}</div>
      {description && <div className="text-xs text-muted mt-1">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

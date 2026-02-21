import { Link } from "@tanstack/react-router";
import { useWorkflowInstances } from "@/hooks/useWorkflowInstances";

interface WorkflowInstanceCardProps {
  recordType: string;
  recordId: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-success-bg text-success-text",
  paused: "bg-warning-bg text-warning-text",
  completed: "bg-accent text-muted-foreground",
  cancelled: "bg-destructive-bg text-destructive-text",
};

export function WorkflowInstanceCard({ recordType, recordId }: WorkflowInstanceCardProps) {
  const { data: instances = [], isLoading } = useWorkflowInstances(recordType, recordId);

  if (isLoading) {
    return <div className="h-16 animate-pulse rounded-lg bg-accent" />;
  }

  if (instances.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Active Workflows</h3>
      <div className="space-y-2">
        {instances.map((instance) => (
          <Link
            key={instance.id}
            to="/workflows/instances/$instanceId"
            params={{ instanceId: instance.id }}
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2 transition-colors hover:bg-accent"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{instance.name}</span>
              {instance.template && <span className="text-xs text-muted">({instance.template.name})</span>}
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[instance.status]}`}>
              {instance.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

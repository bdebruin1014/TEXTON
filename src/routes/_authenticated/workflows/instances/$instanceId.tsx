import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { WorkflowInstanceView } from "@/components/workflows/WorkflowInstanceView";
import { useUpdateWorkflowInstance, useWorkflowInstance } from "@/hooks/useWorkflowInstances";

export const Route = createFileRoute("/_authenticated/workflows/instances/$instanceId")({
  component: InstanceDetail,
});

const STATUS_COLORS: Record<string, string> = {
  active: "bg-success-bg text-success-text",
  paused: "bg-warning-bg text-warning-text",
  completed: "bg-accent text-muted-foreground",
  cancelled: "bg-destructive-bg text-destructive-text",
};

function InstanceDetail() {
  const { instanceId } = Route.useParams();
  const navigate = useNavigate();
  const { data: instance, isLoading } = useWorkflowInstance(instanceId);
  const updateInstance = useUpdateWorkflowInstance();

  if (isLoading) return <FormSkeleton />;
  if (!instance) return <div className="py-12 text-center text-sm text-muted">Workflow instance not found</div>;

  const handleStatusChange = (status: string) => {
    updateInstance.mutate({ id: instanceId, status } as {
      id: string;
      status: "active" | "paused" | "completed" | "cancelled";
    });
  };

  return (
    <div>
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate({ to: "/workflows" })}
          className="mb-2 text-xs text-muted hover:text-foreground"
        >
          &larr; All Workflows
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{instance.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[instance.status]}`}>
                {instance.status}
              </span>
              {instance.template && <span className="text-xs text-muted">Template: {instance.template.name}</span>}
              <span className="text-xs text-muted">
                {instance.record_type} &middot; Created {new Date(instance.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {instance.status === "active" && (
              <button
                type="button"
                onClick={() => handleStatusChange("paused")}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                Pause
              </button>
            )}
            {instance.status === "paused" && (
              <button
                type="button"
                onClick={() => handleStatusChange("active")}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                Resume
              </button>
            )}
            {instance.status !== "cancelled" && instance.status !== "completed" && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Cancel this workflow?")) handleStatusChange("cancelled");
                }}
                className="rounded-lg border border-destructive px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      <WorkflowInstanceView instanceId={instanceId} />
    </div>
  );
}

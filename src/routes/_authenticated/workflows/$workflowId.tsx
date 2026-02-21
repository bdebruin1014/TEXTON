import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/workflows/$workflowId")({
  component: WorkflowDetail,
});

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

interface Milestone {
  id: string;
  name: string;
  sort_order: number;
  tasks: WorkflowTask[];
}

interface WorkflowTask {
  id: string;
  milestone_id: string;
  task_name: string;
  assigned_when: string | null;
  assigned_to: string | null;
  completes_when: string | null;
  due_days: number | null;
  from_reference: string | null;
  sort_order: number;
}

function WorkflowDetail() {
  const { workflowId } = Route.useParams();
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);
  const [localMilestones, setLocalMilestones] = useState<Milestone[]>([]);

  const { data: workflow, isLoading: loadingWorkflow } = useQuery<Workflow>({
    queryKey: ["workflow", workflowId],
    queryFn: async () => {
      const { data, error } = await supabase.from("workflow_templates").select("*").eq("id", workflowId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: milestones = [], isLoading: loadingMilestones } = useQuery<Milestone[]>({
    queryKey: ["workflow-milestones", workflowId],
    queryFn: async () => {
      const { data: milestonesData, error: mError } = await supabase
        .from("workflow_milestones")
        .select("*")
        .eq("workflow_id", workflowId)
        .order("sort_order");
      if (mError) throw mError;

      const { data: tasksData, error: tError } = await supabase
        .from("workflow_tasks")
        .select("*")
        .eq("workflow_id", workflowId)
        .order("sort_order");
      if (tError) throw tError;

      return (milestonesData ?? []).map((m) => ({
        ...m,
        tasks: (tasksData ?? []).filter((t) => t.milestone_id === m.id),
      }));
    },
  });

  useEffect(() => {
    setLocalMilestones(milestones);
    setHasChanges(false);
  }, [milestones]);

  const updateTask = useCallback((milestoneId: string, taskId: string, field: string, value: string | number) => {
    setLocalMilestones((prev) =>
      prev.map((m) =>
        m.id === milestoneId
          ? { ...m, tasks: m.tasks.map((t) => (t.id === taskId ? { ...t, [field]: value } : t)) }
          : m,
      ),
    );
    setHasChanges(true);
  }, []);

  const addMilestone = useMutation({
    mutationFn: async () => {
      const order = localMilestones.length;
      const { error } = await supabase.from("workflow_milestones").insert({
        workflow_id: workflowId,
        name: `Milestone ${order + 1}`,
        sort_order: order,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflow-milestones", workflowId] }),
  });

  const addTask = useMutation({
    mutationFn: async (milestoneId: string) => {
      const milestone = localMilestones.find((m) => m.id === milestoneId);
      const order = milestone?.tasks.length ?? 0;
      const { error } = await supabase.from("workflow_tasks").insert({
        workflow_id: workflowId,
        milestone_id: milestoneId,
        task_name: "New Task",
        sort_order: order,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflow-milestones", workflowId] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("workflow_tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflow-milestones", workflowId] }),
  });

  const saveChanges = useMutation({
    mutationFn: async () => {
      const allTasks = localMilestones.flatMap((m) => m.tasks);
      for (const task of allTasks) {
        const { error } = await supabase
          .from("workflow_tasks")
          .update({
            task_name: task.task_name,
            assigned_when: task.assigned_when,
            assigned_to: task.assigned_to,
            completes_when: task.completes_when,
            due_days: task.due_days,
            from_reference: task.from_reference,
          })
          .eq("id", task.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["workflow-milestones", workflowId] });
    },
  });

  const updateWorkflow = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("workflow_templates").update(updates).eq("id", workflowId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflow", workflowId] }),
  });

  if (loadingWorkflow || loadingMilestones) {
    return <FormSkeleton />;
  }

  if (!workflow) {
    return <p className="py-24 text-center text-sm text-muted">Workflow not found</p>;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link to="/workflows" className="mb-3 flex items-center gap-1 text-sm text-primary hover:underline">
            {"\u2190"}
            Back to Workflows
          </Link>
          <h1 className="text-xl font-semibold text-foreground">{workflow.name}</h1>
          <p className="mt-0.5 text-sm text-muted">{workflow.description ?? "Workflow template"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => addMilestone.mutate()}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
          >
            + Add Milestone
          </button>
          <button
            type="button"
            onClick={() => saveChanges.mutate()}
            disabled={!hasChanges || saveChanges.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saveChanges.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Workflow Name/Status */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="wf-name" className="mb-1 block text-sm font-medium text-foreground">
            Workflow Name
          </label>
          <input
            id="wf-name"
            type="text"
            defaultValue={workflow.name}
            onBlur={(e) => {
              if (e.target.value !== workflow.name) {
                updateWorkflow.mutate({ name: e.target.value });
              }
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label htmlFor="wf-status" className="mb-1 block text-sm font-medium text-foreground">
            Status
          </label>
          <select
            id="wf-status"
            defaultValue={workflow.status}
            onChange={(e) => updateWorkflow.mutate({ status: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="Draft">Draft</option>
            <option value="Active">Active</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Milestones + Tasks */}
      {localMilestones.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-sm text-muted">No milestones yet. Add milestones to define workflow stages.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {localMilestones.map((milestone) => (
            <div key={milestone.id} className="rounded-lg border border-border bg-card">
              {/* Milestone Header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">{milestone.name}</h3>
                <button
                  type="button"
                  onClick={() => addTask.mutate(milestone.id)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-info-bg"
                >
                  + Add Task
                </button>
              </div>

              {/* Task Table */}
              {milestone.tasks.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-muted">No tasks in this milestone</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-card-hover text-xs text-muted">
                        <th className="w-8 px-2 py-2" />
                        <th className="px-3 py-2 text-left font-medium">Task Name</th>
                        <th className="px-3 py-2 text-left font-medium">Assigned When</th>
                        <th className="px-3 py-2 text-left font-medium">Assigned To</th>
                        <th className="px-3 py-2 text-left font-medium">Completes When</th>
                        <th className="px-3 py-2 text-left font-medium">Due (days)</th>
                        <th className="px-3 py-2 text-left font-medium">From</th>
                        <th className="w-8 px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {milestone.tasks.map((task) => (
                        <tr key={task.id} className="border-b border-border last:border-b-0 hover:bg-card-hover">
                          <td className="px-2 py-1.5 text-center"></td>
                          <td className="px-3 py-1.5">
                            <input
                              type="text"
                              value={task.task_name}
                              onChange={(e) => updateTask(milestone.id, task.id, "task_name", e.target.value)}
                              className="w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-sm outline-none focus:border-border focus:bg-background"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="text"
                              value={task.assigned_when ?? ""}
                              onChange={(e) => updateTask(milestone.id, task.id, "assigned_when", e.target.value)}
                              placeholder="e.g. Order Open"
                              className="w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-xs text-muted outline-none focus:border-border focus:bg-background"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="text"
                              value={task.assigned_to ?? ""}
                              onChange={(e) => updateTask(milestone.id, task.id, "assigned_to", e.target.value)}
                              placeholder="e.g. Title Officer"
                              className="w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-xs text-muted outline-none focus:border-border focus:bg-background"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="text"
                              value={task.completes_when ?? ""}
                              onChange={(e) => updateTask(milestone.id, task.id, "completes_when", e.target.value)}
                              placeholder="e.g. Manual"
                              className="w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-xs text-muted outline-none focus:border-border focus:bg-background"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              value={task.due_days ?? ""}
                              onChange={(e) =>
                                updateTask(milestone.id, task.id, "due_days", parseInt(e.target.value, 10) || 0)
                              }
                              className="w-16 rounded border border-transparent bg-transparent px-1.5 py-1 text-center text-xs outline-none focus:border-border focus:bg-background"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="text"
                              value={task.from_reference ?? ""}
                              onChange={(e) => updateTask(milestone.id, task.id, "from_reference", e.target.value)}
                              placeholder="e.g. Open Date"
                              className="w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-xs text-muted outline-none focus:border-border focus:bg-background"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => deleteTask.mutate(task.id)}
                              className="rounded p-1 text-muted transition-colors hover:bg-destructive-bg hover:text-destructive"
                            ></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

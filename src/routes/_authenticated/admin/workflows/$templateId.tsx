import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { WorkflowPhaseSection } from "@/components/workflows/WorkflowPhaseSection";
import { WorkflowTemplateForm } from "@/components/workflows/WorkflowTemplateForm";
import {
  useCreateTemplateTask,
  useDeleteTemplateTask,
  useUpdateTemplateTask,
  useUpdateWorkflowTemplate,
  useWorkflowTemplate,
  useWorkflowTemplateTasks,
} from "@/hooks/useWorkflowTemplates";
import type { WorkflowTemplate, WorkflowTemplateTask } from "@/types/workflows";

export const Route = createFileRoute("/_authenticated/admin/workflows/$templateId")({
  component: WorkflowTemplateDetail,
});

function WorkflowTemplateDetail() {
  const { templateId } = Route.useParams();

  const { data: template, isLoading: loadingTemplate } = useWorkflowTemplate(templateId);
  const { data: tasks = [], isLoading: loadingTasks } = useWorkflowTemplateTasks(templateId);
  const updateTemplate = useUpdateWorkflowTemplate();
  const createTask = useCreateTemplateTask();
  const updateTask = useUpdateTemplateTask();
  const deleteTask = useDeleteTemplateTask();

  const [newPhase, setNewPhase] = useState("");
  const [showAddPhase, setShowAddPhase] = useState(false);

  // Group tasks by phase, preserving sort_order
  const phases = useMemo(() => {
    const map = new Map<string, WorkflowTemplateTask[]>();
    for (const task of tasks) {
      const phase = task.phase || "Uncategorized";
      if (!map.has(phase)) map.set(phase, []);
      map.get(phase)?.push(task);
    }
    return map;
  }, [tasks]);

  const handleUpdateTemplate = useCallback(
    (updates: Partial<WorkflowTemplate>) => {
      updateTemplate.mutate({ id: templateId, ...updates }, { onError: () => toast.error("Failed to save template") });
    },
    [templateId, updateTemplate],
  );

  const handleUpdateTask = useCallback(
    (taskId: string, updates: Partial<WorkflowTemplateTask>) => {
      updateTask.mutate(
        { id: taskId, template_id: templateId, ...updates },
        { onError: () => toast.error("Failed to save task") },
      );
    },
    [templateId, updateTask],
  );

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      deleteTask.mutate(
        { id: taskId, template_id: templateId },
        {
          onSuccess: () => toast.success("Task removed"),
          onError: () => toast.error("Failed to delete task"),
        },
      );
    },
    [templateId, deleteTask],
  );

  const handleAddTask = useCallback(
    (phase: string) => {
      // Find highest sort_order in this phase and append after it
      const phaseTasks = tasks.filter((t) => t.phase === phase);
      const maxSort = phaseTasks.reduce((max, t) => Math.max(max, t.sort_order), 0);
      const globalMax = tasks.reduce((max, t) => Math.max(max, t.sort_order), 0);

      createTask.mutate(
        {
          template_id: templateId,
          name: "New Task",
          phase,
          assigned_role: "pm",
          due_days: 1,
          due_reference: "trigger_date",
          is_gate: false,
          sort_order: Math.max(maxSort, globalMax) + 1,
        },
        {
          onSuccess: () => toast.success("Task added"),
          onError: () => toast.error("Failed to add task"),
        },
      );
    },
    [templateId, tasks, createTask],
  );

  const handleRenamePhase = useCallback(
    (oldPhase: string, newPhaseName: string) => {
      const phaseTasks = tasks.filter((t) => t.phase === oldPhase);
      for (const task of phaseTasks) {
        updateTask.mutate({ id: task.id, template_id: templateId, phase: newPhaseName });
      }
    },
    [templateId, tasks, updateTask],
  );

  const handleDeletePhase = useCallback(
    (phase: string) => {
      const phaseTasks = tasks.filter((t) => t.phase === phase);
      if (phaseTasks.length > 0) {
        toast.error("Remove all tasks from the phase first");
        return;
      }
      // Empty phase — nothing to delete, it just disappears from the grouped map
      toast.success("Phase removed");
    },
    [tasks],
  );

  const handleAddPhase = useCallback(() => {
    const name = newPhase.trim();
    if (!name) return;
    if (phases.has(name)) {
      toast.error("Phase already exists");
      return;
    }
    // Create a placeholder task in the new phase
    const globalMax = tasks.reduce((max, t) => Math.max(max, t.sort_order), 0);
    createTask.mutate(
      {
        template_id: templateId,
        name: "New Task",
        phase: name,
        assigned_role: "pm",
        due_days: 1,
        sort_order: globalMax + 1,
      },
      {
        onSuccess: () => {
          setNewPhase("");
          setShowAddPhase(false);
          toast.success(`Phase "${name}" added`);
        },
        onError: () => toast.error("Failed to add phase"),
      },
    );
  }, [newPhase, phases, tasks, templateId, createTask]);

  if (loadingTemplate || loadingTasks || !template) {
    return <FormSkeleton />;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/admin/workflows"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          {"\u2190"} Back to Templates
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-medium text-foreground">{template.name}</h1>
          {template.is_active ? (
            <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success-text">Active</span>
          ) : (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Inactive
            </span>
          )}
          <span className="text-sm text-muted">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} across {phases.size} phase
            {phases.size !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Template metadata form */}
      <div className="mb-6">
        <WorkflowTemplateForm template={template} onUpdate={handleUpdateTemplate} />
      </div>

      {/* Phase sections */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Task Definitions</h2>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="rounded bg-accent px-1.5 py-0.5 font-medium">
            {tasks.filter((t) => t.is_gate).length} gate{tasks.filter((t) => t.is_gate).length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {Array.from(phases.entries()).map(([phase, phaseTasks]) => (
          <WorkflowPhaseSection
            key={phase}
            phase={phase}
            tasks={phaseTasks}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onAddTask={handleAddTask}
            onRenamePhase={handleRenamePhase}
            onDeletePhase={handleDeletePhase}
          />
        ))}
      </div>

      {/* Add Phase */}
      <div className="mt-4">
        {showAddPhase ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newPhase}
              onChange={(e) => setNewPhase(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddPhase();
                if (e.key === "Escape") setShowAddPhase(false);
              }}
              placeholder="Phase name (e.g. Permits, Estimating)"
              className="w-64 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={handleAddPhase}
              disabled={!newPhase.trim()}
              className="h-9 rounded-md bg-button px-3 text-sm font-medium text-white transition-colors hover:bg-button-hover disabled:opacity-50"
            >
              Add Phase
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddPhase(false);
                setNewPhase("");
              }}
              className="h-9 rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddPhase(true)}
            className="rounded-md border border-dashed border-border px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:border-primary hover:text-primary"
          >
            + Add Phase
          </button>
        )}
      </div>
    </div>
  );
}

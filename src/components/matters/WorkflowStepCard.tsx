import { useCallback, useEffect, useState } from "react";
import { SaveIndicator } from "@/components/shared/SaveIndicator";
import type { SaveStatus } from "@/hooks/useAutoSave";
import { cn } from "@/lib/utils";
import type { MatterWorkflowStep, WorkflowStepStatus, WorkflowStepType } from "@/types/matters";

interface WorkflowStepCardProps {
  step: MatterWorkflowStep;
  stepIndex: number;
  onUpdate: (id: string, updates: Partial<MatterWorkflowStep>) => void;
  allSteps: MatterWorkflowStep[];
}

const STEP_TYPE_ICONS: Record<WorkflowStepType, string> = {
  milestone: "\u{1F3F3}",
  task: "\u2713",
  deliverable: "\u{1F4C4}",
  decision_point: "\u{2194}",
  review: "\u{1F441}",
};

const STEP_TYPE_LABELS: Record<WorkflowStepType, string> = {
  milestone: "Milestone",
  task: "Task",
  deliverable: "Deliverable",
  decision_point: "Decision Point",
  review: "Review",
};

const STEP_STATUSES: { value: WorkflowStepStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "skipped", label: "Skipped" },
  { value: "blocked", label: "Blocked" },
];

function isOverdue(step: MatterWorkflowStep): boolean {
  if (step.status === "completed" || step.status === "skipped") return false;
  if (!step.due_date) return false;
  return new Date(step.due_date) < new Date();
}

export function WorkflowStepCard({ step, stepIndex, onUpdate, allSteps }: WorkflowStepCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [statusSaveStatus, setStatusSaveStatus] = useState<SaveStatus>("idle");
  const [assignedTo, setAssignedTo] = useState(step.assigned_to ?? "");
  const [dueDate, setDueDate] = useState(step.due_date ?? "");
  const [assignedSaveStatus, setAssignedSaveStatus] = useState<SaveStatus>("idle");
  const [dueSaveStatus, setDueSaveStatus] = useState<SaveStatus>("idle");

  const completed = step.status === "completed";
  const overdue = isOverdue(step);

  useEffect(() => {
    setAssignedTo(step.assigned_to ?? "");
    setDueDate(step.due_date ?? "");
  }, [step.assigned_to, step.due_date]);

  // Debounced save for assigned_to
  useEffect(() => {
    if (assignedTo === (step.assigned_to ?? "")) return;
    const timer = setTimeout(() => {
      setAssignedSaveStatus("saving");
      onUpdate(step.id, { assigned_to: assignedTo || null });
      setAssignedSaveStatus("saved");
      setTimeout(() => setAssignedSaveStatus("idle"), 2000);
    }, 800);
    return () => clearTimeout(timer);
  }, [assignedTo, step.assigned_to, step.id, onUpdate]);

  // Debounced save for due_date
  useEffect(() => {
    if (dueDate === (step.due_date ?? "")) return;
    const timer = setTimeout(() => {
      setDueSaveStatus("saving");
      onUpdate(step.id, { due_date: dueDate || null });
      setDueSaveStatus("saved");
      setTimeout(() => setDueSaveStatus("idle"), 2000);
    }, 800);
    return () => clearTimeout(timer);
  }, [dueDate, step.due_date, step.id, onUpdate]);

  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      setStatusSaveStatus("saving");
      onUpdate(step.id, { status: newStatus as WorkflowStepStatus });
      setStatusSaveStatus("saved");
      setTimeout(() => setStatusSaveStatus("idle"), 2000);
    },
    [step.id, onUpdate],
  );

  // Find dependency step numbers
  const dependencyLabels = (step.depends_on ?? [])
    .map((depId) => {
      const depStep = allSteps.find((s) => s.id === depId);
      return depStep ? `Step ${depStep.step_order}` : null;
    })
    .filter(Boolean);

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 transition-all",
        completed ? "border-green-200 bg-green-50/30 opacity-75" : "border-border",
        overdue && !completed ? "border-red-300" : "",
      )}
    >
      {/* Step header */}
      <div className="flex items-start gap-3">
        {/* Step number + type icon */}
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
            completed ? "bg-green-100 text-green-700" : "bg-accent text-muted-foreground",
          )}
        >
          {completed ? "\u2713" : stepIndex + 1}
        </div>

        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">{STEP_TYPE_ICONS[step.step_type]}</span>
            <span className="text-xs font-medium text-muted-foreground uppercase">
              {STEP_TYPE_LABELS[step.step_type]}
            </span>
            <h4 className={cn("text-sm font-medium text-foreground", completed && "line-through")}>{step.title}</h4>
            {step.ai_generated && (
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">AI</span>
            )}
            {overdue && (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">Overdue</span>
            )}
          </div>

          {/* Dependency pills */}
          {dependencyLabels.length > 0 && (
            <div className="mt-1 flex gap-1">
              <span className="text-[10px] text-muted-foreground">Depends on:</span>
              {dependencyLabels.map((label) => (
                <span key={label} className="rounded bg-accent px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* Description toggle */}
          {step.description && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="mt-1 text-xs text-primary hover:underline"
            >
              {expanded ? "Hide details" : "Show details"}
            </button>
          )}
          {expanded && step.description && (
            <p className="mt-2 rounded bg-accent/50 p-2 text-xs text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          )}
        </div>
      </div>

      {/* Controls row */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 pl-11">
        {/* Status */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor={`step-status-${step.id}`} className="text-[11px] font-medium text-muted-foreground">
              Status
            </label>
            <SaveIndicator status={statusSaveStatus} />
          </div>
          <select
            id={`step-status-${step.id}`}
            value={step.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {STEP_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Assigned to */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor={`step-assigned-${step.id}`} className="text-[11px] font-medium text-muted-foreground">
              Assigned To
            </label>
            <SaveIndicator status={assignedSaveStatus} />
          </div>
          <input
            id={`step-assigned-${step.id}`}
            type="text"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder="Assign..."
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Due date */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor={`step-due-${step.id}`} className="text-[11px] font-medium text-muted-foreground">
              Due Date
            </label>
            <SaveIndicator status={dueSaveStatus} />
          </div>
          <input
            id={`step-due-${step.id}`}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={cn(
              "w-full rounded border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary",
              overdue ? "border-red-300" : "border-border",
            )}
          />
        </div>
      </div>
    </div>
  );
}

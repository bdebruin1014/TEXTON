import { useState } from "react";
import { cn } from "@/lib/utils";
import type { WorkflowStepType } from "@/types/matters";

interface AddStepFormProps {
  onAdd: (step: {
    title: string;
    step_type: WorkflowStepType;
    description: string | null;
    due_date: string | null;
  }) => void;
  isPending?: boolean;
}

const STEP_TYPES: { value: WorkflowStepType; label: string }[] = [
  { value: "task", label: "Task" },
  { value: "milestone", label: "Milestone" },
  { value: "deliverable", label: "Deliverable" },
  { value: "decision_point", label: "Decision Point" },
  { value: "review", label: "Review" },
];

export function AddStepForm({ onAdd, isPending }: AddStepFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [stepType, setStepType] = useState<WorkflowStepType>("task");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      step_type: stepType,
      description: description.trim() || null,
      due_date: dueDate || null,
    });
    setTitle("");
    setStepType("task");
    setDescription("");
    setDueDate("");
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full rounded-lg border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        + Add Step
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h4 className="mb-3 text-sm font-semibold text-foreground">Add Workflow Step</h4>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Title */}
        <div className="sm:col-span-2 space-y-1">
          <label htmlFor="add-step-title" className="text-xs font-medium text-muted-foreground">
            Title *
          </label>
          <input
            id="add-step-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Step title..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Type */}
        <div className="space-y-1">
          <label htmlFor="add-step-type" className="text-xs font-medium text-muted-foreground">
            Type
          </label>
          <select
            id="add-step-type"
            value={stepType}
            onChange={(e) => setStepType(e.target.value as WorkflowStepType)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {STEP_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Due date */}
        <div className="space-y-1">
          <label htmlFor="add-step-due-date" className="text-xs font-medium text-muted-foreground">
            Due Date
          </label>
          <input
            id="add-step-due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Description */}
        <div className="sm:col-span-2 space-y-1">
          <label htmlFor="add-step-desc" className="text-xs font-medium text-muted-foreground">
            Description
          </label>
          <textarea
            id="add-step-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
            rows={2}
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!title.trim() || isPending}
          className={cn(
            "rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {isPending ? "Adding..." : "Add Step"}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

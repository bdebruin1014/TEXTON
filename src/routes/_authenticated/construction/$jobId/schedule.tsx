import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/construction/$jobId/schedule")({
  component: Schedule,
});

interface Milestone {
  id: string;
  name: string;
  status: string;
  started_date: string | null;
  completed_date: string | null;
  blocked_reason: string | null;
  sort_order: number;
}

const STANDARD_MILESTONES = [
  "Pre-Construction",
  "Permitting",
  "Foundation",
  "Framing",
  "Rough-Ins",
  "Insulation & Drywall",
  "Interior Finishes",
  "Exterior",
  "Final Inspections / CO",
  "Warranty",
];

function Schedule() {
  const { jobId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: milestones = [], isLoading } = useQuery<Milestone[]>({
    queryKey: ["job-milestones", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_milestones")
        .select("*")
        .eq("job_id", jobId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const seedMilestones = useMutation({
    mutationFn: async () => {
      const inserts = STANDARD_MILESTONES.map((name, i) => ({
        job_id: jobId,
        name,
        status: "Not Started",
        sort_order: i + 1,
      }));
      const { error } = await supabase.from("job_milestones").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["job-milestones", jobId] }),
  });

  const addMilestone = useMutation({
    mutationFn: async () => {
      const nextOrder = milestones.length > 0 ? Math.max(...milestones.map((m) => m.sort_order)) + 1 : 1;
      const { error } = await supabase.from("job_milestones").insert({
        job_id: jobId,
        name: "New Milestone",
        status: "Not Started",
        sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["job-milestones", jobId] }),
  });

  const updateMilestone = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase.from("job_milestones").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["job-milestones", jobId] }),
  });

  const handleStart = (id: string) => {
    updateMilestone.mutate({
      id,
      updates: { status: "In Progress", started_date: new Date().toISOString().split("T")[0] },
    });
  };

  const handleComplete = (id: string) => {
    updateMilestone.mutate({
      id,
      updates: { status: "Complete", completed_date: new Date().toISOString().split("T")[0] },
    });
  };

  const handleBlock = (id: string) => {
    updateMilestone.mutate({
      id,
      updates: { status: "Blocked" },
    });
  };

  const completedCount = milestones.filter((m) => m.status === "Complete").length;

  const statusLabel = (status: string) => {
    switch (status) {
      case "Complete":
        return <span className="text-success font-bold">Done</span>;
      case "In Progress":
        return <span className="text-warning">Pending</span>;
      case "Blocked":
        return <span className="text-destructive font-bold">!</span>;
      default:
        return <span className="text-muted">○</span>;
    }
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Schedule</h2>
          {milestones.length > 0 && (
            <p className="mt-0.5 text-sm text-muted">
              {completedCount} of {milestones.length} milestones complete
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {milestones.length === 0 && (
            <button
              type="button"
              onClick={() => seedMilestones.mutate()}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary-50"
            >
              Seed Standard Milestones
            </button>
          )}
          <button
            type="button"
            onClick={() => addMilestone.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            + Add Milestone
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {milestones.length > 0 && (
        <div className="mb-6">
          <div className="h-2 w-full rounded-full bg-accent">
            <div
              className="h-2 rounded-full bg-success transition-all"
              style={{ width: `${(completedCount / milestones.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {milestones.length === 0 ? (
        <EmptyState title="No milestones" description="Seed standard construction milestones or add custom ones" />
      ) : (
        <div className="space-y-1">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3"
            >
              {statusLabel(milestone.status)}

              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${milestone.status === "Complete" ? "text-muted line-through" : "text-foreground"}`}
                >
                  {milestone.name}
                </p>
                <div className="flex gap-3 text-xs text-muted">
                  {milestone.started_date && <span>Started: {formatDate(milestone.started_date)}</span>}
                  {milestone.completed_date && <span>Completed: {formatDate(milestone.completed_date)}</span>}
                  {milestone.blocked_reason && (
                    <span className="text-destructive">Blocked: {milestone.blocked_reason}</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                {milestone.status === "Not Started" && (
                  <button
                    type="button"
                    onClick={() => handleStart(milestone.id)}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary-50"
                  >
                    Start
                  </button>
                )}
                {(milestone.status === "In Progress" || milestone.status === "Blocked") && (
                  <button
                    type="button"
                    onClick={() => handleComplete(milestone.id)}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-success transition-colors hover:bg-success-bg"
                  >
                    Complete
                  </button>
                )}
                {milestone.status === "In Progress" && (
                  <button
                    type="button"
                    onClick={() => handleBlock(milestone.id)}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive-bg"
                  >
                    Block
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

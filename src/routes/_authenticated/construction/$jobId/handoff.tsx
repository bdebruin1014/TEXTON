import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AutoSaveField } from "@/components/forms/AutoSaveField";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/construction/$jobId/handoff")({
  component: Handoff,
});

interface JobHandoff {
  id: string;
  job_id: string;
  status: string;
  created_at: string;
}

interface HandoffChecklistItem {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

interface JobHandoffItem {
  id: string;
  handoff_id: string;
  checklist_item_id: string;
  is_complete: boolean;
  notes: string | null;
  completed_by: string | null;
  completed_at: string | null;
}

function Handoff() {
  const { jobId } = Route.useParams();
  const queryClient = useQueryClient();

  // Query the handoff record for this job
  const { data: handoff, isLoading: handoffLoading } = useQuery<JobHandoff | null>({
    queryKey: ["job-handoff", jobId],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_handoffs").select("*").eq("job_id", jobId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Query the master checklist items (22 items)
  const { data: checklistItems = [] } = useQuery<HandoffChecklistItem[]>({
    queryKey: ["handoff-checklist-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handoff_checklist_items")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Query the job-specific handoff items (only if handoff exists)
  const { data: handoffItems = [], isLoading: itemsLoading } = useQuery<JobHandoffItem[]>({
    queryKey: ["job-handoff-items", handoff?.id],
    enabled: !!handoff?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_handoff_items")
        .select("*")
        .eq("handoff_id", handoff?.id as string)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Create a new handoff
  const createHandoff = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("job_handoffs").insert({
        job_id: jobId,
        status: "In Progress",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["job-handoff", jobId] }),
  });

  // Toggle completion of a handoff item
  const toggleItem = useMutation({
    mutationFn: async ({ id, isComplete }: { id: string; isComplete: boolean }) => {
      const updates: Record<string, unknown> = {
        is_complete: isComplete,
        completed_at: isComplete ? new Date().toISOString() : null,
        completed_by: isComplete ? "Current User" : null,
      };
      const { error } = await supabase.from("job_handoff_items").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["job-handoff-items", handoff?.id] }),
  });

  // Update notes on a handoff item
  const updateNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase.from("job_handoff_items").update({ notes }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["job-handoff-items", handoff?.id] }),
  });

  if (handoffLoading) {
    return <FormSkeleton />;
  }

  // No handoff started yet
  if (!handoff) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">Handoff Checklist</h2>
          <p className="mt-0.5 text-sm text-muted">Handoffs occur on Mondays. Physical + digital package required.</p>
        </div>
        <EmptyState
          title="No handoff started"
          description="Start a handoff checklist to prepare for owner transfer"
          action={
            <button
              type="button"
              onClick={() => createHandoff.mutate()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Start Handoff
            </button>
          }
        />
      </div>
    );
  }

  // Build a lookup from checklist_item_id to job handoff item
  const itemMap = new Map(handoffItems.map((i) => [i.checklist_item_id, i]));
  const completedCount = handoffItems.filter((i) => i.is_complete).length;
  const totalCount = checklistItems.length || 22;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Handoff Checklist</h2>
            <p className="mt-0.5 text-sm text-muted">
              {completedCount} of {totalCount} complete
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            {handoff.status}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="h-2 w-full rounded-full bg-accent">
          <div
            className="h-2 rounded-full bg-success transition-all"
            style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Monday handoff rule */}
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-800">
          Handoffs occur on Mondays. Physical + digital package required.
        </p>
      </div>

      {/* Checklist */}
      {itemsLoading ? (
        <FormSkeleton />
      ) : (
        <div className="space-y-3">
          {checklistItems.map((item) => {
            const handoffItem = itemMap.get(item.id);
            if (!handoffItem) return null;

            return (
              <div
                key={handoffItem.id}
                className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-background/50"
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleItem.mutate({ id: handoffItem.id, isComplete: !handoffItem.is_complete })}
                    className="mt-0.5 flex-shrink-0"
                  >
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                        handoffItem.is_complete ? "border-success bg-success text-white" : "border-gray-300 bg-white"
                      }`}
                    >
                      {handoffItem.is_complete && (
                        <span className="text-xs font-bold leading-none" aria-label="Completed">
                          {"\u2713"}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          handoffItem.is_complete ? "text-muted line-through" : "text-foreground"
                        }`}
                      >
                        {item.name}
                      </span>
                      {handoffItem.is_complete && handoffItem.completed_at && (
                        <span className="text-xs text-muted">
                          {formatDate(handoffItem.completed_at)}
                          {handoffItem.completed_by && ` by ${handoffItem.completed_by}`}
                        </span>
                      )}
                    </div>
                    {item.description && <p className="mt-0.5 text-xs text-muted">{item.description}</p>}

                    {/* Notes auto-save field */}
                    <div className="mt-2">
                      <AutoSaveField
                        label="Notes"
                        value={handoffItem.notes}
                        onSave={async (value) => {
                          await updateNotes.mutateAsync({ id: handoffItem.id, notes: value });
                        }}
                        type="textarea"
                        placeholder="Add notes..."
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

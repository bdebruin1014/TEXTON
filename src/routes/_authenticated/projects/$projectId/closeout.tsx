import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/projects/$projectId/closeout")({
  component: Closeout,
});

interface CloseoutItem {
  id: string;
  item_name: string;
  completed: boolean;
  completed_date: string | null;
  notes: string | null;
  sort_order: number;
}

const DEFAULT_CLOSEOUT_ITEMS = [
  "All lots sold and closed",
  "Final loan payoff completed",
  "Builder warranties transferred",
  "HOA turnover complete",
  "All subcontractor liens released",
  "Final as-built surveys filed",
  "Infrastructure acceptance by municipality",
  "All punch list items resolved",
  "Final accounting reconciliation",
  "Investor distributions calculated",
  "Entity dissolution / tax filings",
  "Project file archival",
];

function Closeout() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery<CloseoutItem[]>({
    queryKey: ["closeout-items", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("closeout_items")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const seedDefaults = useMutation({
    mutationFn: async () => {
      const inserts = DEFAULT_CLOSEOUT_ITEMS.map((name, i) => ({
        project_id: projectId,
        item_name: name,
        completed: false,
        sort_order: i + 1,
      }));
      const { error } = await supabase.from("closeout_items").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["closeout-items", projectId] }),
  });

  const toggleItem = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const updates: Record<string, unknown> = { completed };
      if (completed) updates.completed_date = new Date().toISOString().split("T")[0];
      else updates.completed_date = null;
      const { error } = await supabase.from("closeout_items").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["closeout-items", projectId] }),
  });

  const completedCount = items.filter((i) => i.completed).length;

  if (isLoading) {
    return <FormSkeleton />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Project Closeout</h2>
          {items.length > 0 && (
            <p className="mt-0.5 text-sm text-muted">
              {completedCount} of {items.length} complete
            </p>
          )}
        </div>
        {items.length === 0 && (
          <button
            type="button"
            onClick={() => seedDefaults.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
          >
            Initialize Closeout Checklist
          </button>
        )}
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="mb-6">
          <div className="h-2 w-full rounded-full bg-accent">
            <div
              className="h-2 rounded-full bg-success transition-all"
              style={{ width: `${(completedCount / items.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Checklist */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-sm text-muted">No closeout checklist items. Click the button above to initialize.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleItem.mutate({ id: item.id, completed: !item.completed })}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-primary-50"
            >
              {item.completed ? (
                <span className="text-success font-bold">{"\u2022"}</span>
              ) : (
                <span className="text-muted">{"\u25CB"}</span>
              )}
              <span className={`text-sm ${item.completed ? "text-muted line-through" : "text-foreground"}`}>
                {item.item_name}
              </span>
              {item.completed_date && <span className="ml-auto text-xs text-muted">{item.completed_date}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

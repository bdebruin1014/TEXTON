import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/$projectId/timeline")({
  component: Timeline,
});

interface Milestone {
  id: string;
  name: string;
  status: string;
  target_date: string | null;
  completed_date: string | null;
  sort_order: number;
}

const MILESTONE_STATUSES = ["Not Started", "In Progress", "Complete"] as const;

const DEFAULT_MILESTONES = [
  "Land Acquisition",
  "Survey Complete",
  "Environmental Clear",
  "Entitlements Approved",
  "Plat Recorded",
  "Infrastructure Start",
  "Infrastructure Complete",
  "Model Home Start",
  "First CO Issued",
  "Final Lot Closed",
  "Project Closeout",
];

function Timeline() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: milestones = [], isLoading } = useQuery<Milestone[]>({
    queryKey: ["milestones", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("milestones")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addMilestone = useMutation({
    mutationFn: async () => {
      const nextOrder = milestones.length > 0 ? Math.max(...milestones.map((m) => m.sort_order)) + 1 : 1;
      const { error } = await supabase.from("milestones").insert({
        project_id: projectId,
        name: "New Milestone",
        status: "Not Started",
        sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["milestones", projectId] }),
  });

  const seedDefaults = useMutation({
    mutationFn: async () => {
      const inserts = DEFAULT_MILESTONES.map((name, i) => ({
        project_id: projectId,
        name,
        status: "Not Started",
        sort_order: i + 1,
      }));
      const { error } = await supabase.from("milestones").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["milestones", projectId] }),
  });

  const updateMilestone = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "Complete") updates.completed_date = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("milestones").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["milestones", projectId] }),
  });

  const completedCount = milestones.filter((m) => m.status === "Complete").length;

  const columns: ColumnDef<Milestone, unknown>[] = [
    {
      id: "status-icon",
      cell: ({ row }) => {
        const status = row.original.status;
        if (status === "Complete") return <span className="text-success font-bold">{"\u2022"}</span>;
        if (status === "In Progress") return <span className="text-warning text-xs">Pending</span>;
        return <span className="text-muted">{"\u25CB"}</span>;
      },
      size: 40,
    },
    {
      accessorKey: "name",
      header: "Milestone",
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <select
            value={item.status}
            onChange={(e) => updateMilestone.mutate({ id: item.id, status: e.target.value })}
            className="rounded border border-border bg-transparent px-2 py-1 text-xs outline-none"
          >
            {MILESTONE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      accessorKey: "target_date",
      header: "Target Date",
      cell: ({ row }) => formatDate(row.getValue("target_date")),
    },
    {
      accessorKey: "completed_date",
      header: "Completed",
      cell: ({ row }) => formatDate(row.getValue("completed_date")),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Timeline</h2>
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
              onClick={() => seedDefaults.mutate()}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary-50"
            >
              Seed Standard Milestones
            </button>
          )}
          <button
            type="button"
            onClick={() => addMilestone.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
          >
            +
            Add Milestone
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {milestones.length > 0 && (
        <div className="mb-4">
          <div className="h-2 w-full rounded-full bg-accent">
            <div
              className="h-2 rounded-full bg-success transition-all"
              style={{ width: `${(completedCount / milestones.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Visual timeline */}
      {milestones.length > 0 && (
        <div className="mb-6 flex items-center gap-0 overflow-x-auto pb-2">
          {milestones.map((m, i) => (
            <div key={m.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`h-3 w-3 rounded-full ${m.status === "Complete" ? "bg-success" : m.status === "In Progress" ? "bg-warning" : "bg-border"}`}
                />
                <span className="mt-1 max-w-[80px] truncate text-center text-[10px] text-muted">{m.name}</span>
              </div>
              {i < milestones.length - 1 && (
                <div className={`h-0.5 w-8 ${m.status === "Complete" ? "bg-success" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <FormSkeleton />
      ) : milestones.length === 0 ? (
        <EmptyState title="No milestones" description="Add milestones to track your project timeline" />
      ) : (
        <DataTable columns={columns} data={milestones} searchKey="name" searchPlaceholder="Search milestones..." />
      )}
    </div>
  );
}

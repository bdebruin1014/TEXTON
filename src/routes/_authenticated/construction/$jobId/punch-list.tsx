import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle, Circle, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/construction/$jobId/punch-list")({
  component: PunchList,
});

interface PunchItem {
  id: string;
  description: string;
  location: string | null;
  assigned_to: string | null;
  priority: string | null;
  status: string;
  due_date: string | null;
  completed_date: string | null;
}

function PunchList() {
  const { jobId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery<PunchItem[]>({
    queryKey: ["punch-list", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("punch_list_items")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("punch_list_items").insert({
        job_id: jobId,
        description: "New Punch Item",
        status: "Open",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["punch-list", jobId] }),
  });

  const toggleItem = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const updates: Record<string, unknown> = {
        status: completed ? "Completed" : "Open",
        completed_date: completed ? new Date().toISOString().split("T")[0] : null,
      };
      const { error } = await supabase.from("punch_list_items").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["punch-list", jobId] }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("punch_list_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["punch-list", jobId] }),
  });

  const openCount = items.filter((i) => i.status !== "Completed").length;
  const completedCount = items.filter((i) => i.status === "Completed").length;

  const columns: ColumnDef<PunchItem, unknown>[] = [
    {
      id: "status-icon",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleItem.mutate({ id: item.id, completed: item.status !== "Completed" });
            }}
          >
            {item.status === "Completed" ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <Circle className="h-4 w-4 text-muted" />
            )}
          </button>
        );
      },
      size: 40,
    },
    {
      accessorKey: "description",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => (
        <span className={`font-medium ${row.original.status === "Completed" ? "text-muted line-through" : ""}`}>
          {row.getValue("description")}
        </span>
      ),
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => <span className="text-muted">{row.getValue("location") ?? "—"}</span>,
    },
    {
      accessorKey: "assigned_to",
      header: "Assigned To",
      cell: ({ row }) => <span className="text-muted">{row.getValue("assigned_to") ?? "—"}</span>,
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => {
        const p = row.getValue("priority") as string | null;
        if (!p) return "—";
        const color = p === "High" ? "text-destructive" : p === "Medium" ? "text-warning" : "text-muted";
        return <span className={`text-xs font-medium ${color}`}>{p}</span>;
      },
    },
    {
      accessorKey: "due_date",
      header: "Due",
      cell: ({ row }) => formatDate(row.getValue("due_date")),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteItem.mutate(row.original.id);
          }}
          className="rounded p-1 text-muted transition-colors hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Punch List</h2>
          {items.length > 0 && (
            <p className="mt-0.5 text-sm text-muted">
              {openCount} open · {completedCount} completed
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => addItem.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Add Punch Item
        </button>
      </div>

      {/* Progress */}
      {items.length > 0 && (
        <div className="mb-4">
          <div className="h-2 w-full rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-success transition-all"
              style={{ width: `${(completedCount / items.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <FormSkeleton />
      ) : items.length === 0 ? (
        <EmptyState title="No punch items" description="Add punch list items for pre-closing corrections" />
      ) : (
        <DataTable columns={columns} data={items} searchKey="description" searchPlaceholder="Search punch list..." />
      )}
    </div>
  );
}

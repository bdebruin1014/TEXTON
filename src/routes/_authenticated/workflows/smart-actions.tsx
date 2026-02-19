import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Zap } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/workflows/smart-actions")({
  component: SmartActions,
});

interface SmartAction {
  id: string;
  name: string;
  trigger_event: string | null;
  trigger_condition: string | null;
  action_type: string | null;
  action_detail: string | null;
  status: string;
}

function SmartActions() {
  const queryClient = useQueryClient();

  const { data: actions = [], isLoading } = useQuery<SmartAction[]>({
    queryKey: ["smart-actions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("smart_actions").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addAction = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("smart_actions").insert({
        name: "New Smart Action",
        status: "Active",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["smart-actions"] }),
  });

  const columns: ColumnDef<SmartAction, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Action Name" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-warning" />
          <span className="font-medium">{row.getValue("name")}</span>
        </div>
      ),
    },
    {
      accessorKey: "trigger_event",
      header: "Trigger Event",
      cell: ({ row }) => {
        const val = row.getValue("trigger_event") as string | null;
        return val ? (
          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-800">{val}</span>
        ) : (
          "—"
        );
      },
    },
    {
      accessorKey: "trigger_condition",
      header: "Condition",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("trigger_condition") ?? "—"}</span>,
    },
    {
      accessorKey: "action_type",
      header: "Action Type",
      cell: ({ row }) => {
        const val = row.getValue("action_type") as string | null;
        return val ? (
          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-800">{val}</span>
        ) : (
          "—"
        );
      },
    },
    {
      accessorKey: "action_detail",
      header: "Detail",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("action_detail") ?? "—"}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Smart Actions</h1>
          <p className="mt-0.5 text-sm text-muted">Rule-based automations: trigger conditions → automated tasks</p>
        </div>
        <button
          type="button"
          onClick={() => addAction.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          New Smart Action
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : actions.length === 0 ? (
        <EmptyState title="No smart actions" description="Create rule-based automations to streamline workflows" />
      ) : (
        <DataTable columns={columns} data={actions} searchKey="name" searchPlaceholder="Search actions..." />
      )}
    </div>
  );
}

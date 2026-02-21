import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { WorkflowLauncher } from "@/components/workflows/WorkflowLauncher";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/workflows/")({
  component: WorkflowsList,
});

interface Workflow {
  id: string;
  name: string;
  used_for: string[] | null;
  task_count: number | null;
  projects_using: number | null;
  description: string | null;
  last_modified: string | null;
  status: string;
}

function WorkflowsList() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showLauncher, setShowLauncher] = useState(false);

  const { data: workflows = [], isLoading } = useQuery<Workflow[]>({
    queryKey: ["workflows"],
    queryFn: async () => {
      const { data, error } = await supabase.from("workflow_templates").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addWorkflow = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("workflow_templates")
        .insert({ name: "New Workflow", status: "Draft" })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      if (data?.id) {
        navigate({ to: `/workflows/${data.id}` as string });
      }
    },
  });

  const columns: ColumnDef<Workflow, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Workflow Name" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "used_for",
      header: "Used For",
      cell: ({ row }) => {
        const types = row.getValue("used_for") as string[] | null;
        if (!types || types.length === 0) return "—";
        return (
          <div className="flex flex-wrap gap-1">
            {types.map((t) => (
              <span key={t} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {t}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "task_count",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tasks" />,
      cell: ({ row }) => row.getValue("task_count") ?? 0,
    },
    {
      accessorKey: "projects_using",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Projects" />,
      cell: ({ row }) => row.getValue("projects_using") ?? 0,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="max-w-[200px] truncate text-sm text-muted">{row.getValue("description") ?? "—"}</span>
      ),
    },
    {
      accessorKey: "last_modified",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Last Modified" />,
      cell: ({ row }) => {
        const val = row.getValue("last_modified") as string | null;
        return val ? formatDate(val) : "—";
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const color =
          status === "Active"
            ? "bg-success-bg text-success-text"
            : status === "Draft"
              ? "bg-warning-bg text-warning-text"
              : "bg-accent text-muted-foreground";
        return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{status}</span>;
      },
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Core Workflows</h1>
          <p className="mt-0.5 text-sm text-muted">{workflows.length} workflow templates</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowLauncher(true)}
            className="flex items-center gap-1.5 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
          >
            Launch Workflow
          </button>
          <button
            type="button"
            onClick={() => addWorkflow.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
          >
            + New Template
          </button>
        </div>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : workflows.length === 0 ? (
        <EmptyState
          title="No workflows"
          description="Create Qualia-style workflow templates with milestones and tasks"
        />
      ) : (
        <DataTable
          columns={columns}
          data={workflows}
          searchKey="name"
          searchPlaceholder="Search workflows..."
          onRowClick={(row) => navigate({ to: `/workflows/${row.id}` as string })}
        />
      )}

      {showLauncher && <WorkflowLauncher onClose={() => setShowLauncher(false)} />}
    </div>
  );
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";
import { CreateRecordModal } from "@/components/shared/CreateRecordModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import {
  useCreateWorkflowTemplate,
  useDeleteWorkflowTemplate,
  useDuplicateWorkflowTemplate,
  useWorkflowTemplates,
} from "@/hooks/useWorkflowTemplates";
import { supabase } from "@/lib/supabase";
import type { ProjectType, WorkflowTemplate } from "@/types/workflows";
import { PROJECT_TYPE_LABELS } from "@/types/workflows";

export const Route = createFileRoute("/_authenticated/admin/workflows/")({
  component: WorkflowTemplatesIndex,
});

function WorkflowTemplatesIndex() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: templates = [], isLoading } = useWorkflowTemplates();
  const createTemplate = useCreateWorkflowTemplate();
  const deleteTemplate = useDeleteWorkflowTemplate();
  const duplicateTemplate = useDuplicateWorkflowTemplate();

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("workflow_templates").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
    },
  });

  const columns: ColumnDef<WorkflowTemplate, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => <span className="font-medium text-foreground">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "project_type",
      header: "Project Type",
      cell: ({ row }) => {
        const val = row.getValue("project_type") as string | null;
        return val ? (
          <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-medium">
            {PROJECT_TYPE_LABELS[val as keyof typeof PROJECT_TYPE_LABELS] ?? val}
          </span>
        ) : (
          "\u2014"
        );
      },
    },
    {
      accessorKey: "trigger_event",
      header: "Trigger",
      cell: ({ row }) => {
        const table = row.original.trigger_table;
        const value = row.original.trigger_value;
        if (!table || !value) return "\u2014";
        return (
          <span className="font-mono text-xs text-muted">
            {table}.{row.original.trigger_column ?? "status"} = {value}
          </span>
        );
      },
    },
    {
      accessorKey: "task_count",
      header: "Tasks",
      cell: ({ row }) => <span className="text-sm text-muted">{row.original.task_count ?? 0}</span>,
    },
    {
      accessorKey: "is_active",
      header: "Active",
      cell: ({ row }) => {
        const active = row.original.is_active;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleActive.mutate({ id: row.original.id, is_active: !active });
            }}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              active ? "bg-success" : "bg-border"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                active ? "translate-x-[18px]" : "translate-x-[3px]"
              }`}
            />
          </button>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              duplicateTemplate.mutate(row.original.id, {
                onSuccess: () => toast.success("Template duplicated"),
                onError: () => toast.error("Failed to duplicate"),
              });
            }}
            className="rounded px-2 py-1 text-xs text-muted transition-colors hover:bg-accent hover:text-foreground"
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete "${row.original.name}"?`)) {
                deleteTemplate.mutate(row.original.id, {
                  onSuccess: () => toast.success("Template deleted"),
                  onError: () => toast.error("Failed to delete"),
                });
              }
            }}
            className="rounded px-2 py-1 text-xs text-destructive transition-colors hover:bg-destructive/10"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Workflow Templates</h1>
          <p className="mt-0.5 text-sm text-muted">
            {templates.length} template{templates.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + Create Template
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : templates.length === 0 ? (
        <EmptyState
          title="No workflow templates"
          description="Create templates to auto-generate tasks when project or job status changes"
        />
      ) : (
        <DataTable
          columns={columns}
          data={templates}
          searchKey="name"
          searchPlaceholder="Search templates..."
          onRowClick={(row) => navigate({ to: "/admin/workflows/$templateId", params: { templateId: row.id } })}
        />
      )}

      <CreateRecordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Create Workflow Template"
        description="Define a template that auto-generates tasks when a record's status changes."
        fields={[
          { name: "name", label: "Template name", type: "text", required: true },
          { name: "description", label: "Description", type: "textarea" },
          {
            name: "project_type",
            label: "Project type",
            type: "select",
            options: [
              { label: "All Types", value: "all" },
              { label: "Scattered Lot", value: "scattered_lot" },
              { label: "Community Development", value: "community_development" },
              { label: "Lot Purchase", value: "lot_purchase" },
              { label: "Lot Development", value: "lot_development" },
            ],
            defaultValue: "all",
          },
          {
            name: "trigger_table",
            label: "Trigger table",
            type: "select",
            options: [
              { label: "Opportunities", value: "opportunities" },
              { label: "Projects", value: "projects" },
              { label: "Jobs", value: "jobs" },
              { label: "Dispositions", value: "dispositions" },
            ],
          },
          {
            name: "trigger_value",
            label: "Trigger status value",
            type: "text",
            placeholder: "e.g. dd, pre_construction, in_progress",
          },
        ]}
        onSubmit={async (values) => {
          const triggerTable = values.trigger_table || undefined;
          const triggerValue = values.trigger_value || undefined;
          const triggerEvent =
            triggerTable && triggerValue ? `${triggerTable.replace(/s$/, "")}.status:${triggerValue}` : undefined;

          await createTemplate.mutateAsync({
            name: values.name ?? "",
            description: values.description || undefined,
            project_type: (values.project_type as ProjectType) || "all",
            trigger_table: triggerTable,
            trigger_column: "status",
            trigger_value: triggerValue,
            trigger_event: triggerEvent,
          });
          toast.success("Template created");
          setShowModal(false);
        }}
        loading={createTemplate.isPending}
      />
    </div>
  );
}

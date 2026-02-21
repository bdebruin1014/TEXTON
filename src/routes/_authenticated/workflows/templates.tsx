import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/workflows/templates")({
  component: Templates,
});

interface Template {
  id: string;
  name: string;
  transaction_type: string | null;
  workflow_name: string | null;
  description: string | null;
  usage_count: number | null;
  created_at: string;
  status: string;
}

function Templates() {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("order_templates").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addTemplate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("order_templates").insert({
        name: "New Template",
        status: "Draft",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });

  const columns: ColumnDef<Template, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Template Name" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "transaction_type",
      header: "Transaction Type",
      cell: ({ row }) => {
        const val = row.getValue("transaction_type") as string | null;
        return val ? (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">{val}</span>
        ) : (
          "—"
        );
      },
    },
    {
      accessorKey: "workflow_name",
      header: "Workflow",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("workflow_name") ?? "—"}</span>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("description") ?? "—"}</span>,
    },
    {
      accessorKey: "usage_count",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Used" />,
      cell: ({ row }) => row.getValue("usage_count") ?? 0,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      cell: ({ row }) => formatDate(row.getValue("created_at")),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const color = status === "Active" ? "bg-success-bg text-success-text" : "bg-warning-bg text-warning-text";
        return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{status}</span>;
      },
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Templates</h1>
          <p className="mt-0.5 text-sm text-muted">Pre-configured workflow + field defaults for new projects</p>
        </div>
        <button
          type="button"
          onClick={() => addTemplate.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + New Template
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : templates.length === 0 ? (
        <EmptyState
          title="No templates"
          description="Create order templates with pre-configured workflows and defaults"
        />
      ) : (
        <DataTable columns={columns} data={templates} searchKey="name" searchPlaceholder="Search templates..." />
      )}
    </div>
  );
}

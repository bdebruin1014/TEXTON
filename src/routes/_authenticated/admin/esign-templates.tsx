import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";

import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/esign-templates")({
  component: ESignTemplates,
});

interface ESignTemplate {
  id: string;
  name: string;
  description: string | null;
  docuseal_template_id: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

function ESignTemplates() {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery<ESignTemplate[]>({
    queryKey: ["esign-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("esign_templates").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addTemplate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("esign_templates").insert({
        name: "New Template",
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["esign-templates"] }),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("esign_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["esign-templates"] }),
  });

  const columns: ColumnDef<ESignTemplate, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const category = row.getValue("category") as string | null;
        return category ? (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">{category}</span>
        ) : (
          "—"
        );
      },
    },
    {
      accessorKey: "docuseal_template_id",
      header: ({ column }) => <DataTableColumnHeader column={column} title="DocuSeal Template ID" />,
      cell: ({ row }) => {
        const val = row.getValue("docuseal_template_id") as string | null;
        return val ? <span className="font-mono text-xs">{val}</span> : "—";
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const active = row.getValue("is_active") as boolean;
        const color = active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600";
        return (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
            {active ? "Active" : "Inactive"}
          </span>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      cell: ({ row }) => formatDate(row.getValue("created_at")),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteTemplate.mutate(row.original.id);
          }}
          className="rounded p-1 text-muted transition-colors hover:text-destructive"
        >
          <span className="text-xs font-medium">Delete</span>
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">E-Sign Templates</h1>
          <p className="mt-0.5 text-sm text-muted">{templates.length} DocuSeal templates configured</p>
        </div>
        <button
          type="button"
          onClick={() => addTemplate.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Add Template
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : templates.length === 0 ? (
        <EmptyState title="No e-sign templates" description="Add DocuSeal templates for contracts and agreements" />
      ) : (
        <DataTable columns={columns} data={templates} searchKey="name" searchPlaceholder="Search templates..." />
      )}
    </div>
  );
}

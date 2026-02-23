import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { useCOATemplates } from "@/hooks/useCOATemplates";
import { supabase } from "@/lib/supabase";
import type { COATemplate } from "@/types/coa";

export const Route = createFileRoute("/_authenticated/admin/coa-templates/")({
  component: COATemplateList,
});

function COATemplateList() {
  const { data: templates = [], isLoading } = useCOATemplates();

  // Fetch item counts per template
  const { data: itemCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["coa-template-item-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coa_template_items")
        .select("template_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        counts[row.template_id] = (counts[row.template_id] || 0) + 1;
      }
      return counts;
    },
  });

  const columns: ColumnDef<COATemplate, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Template Name" />,
      cell: ({ row }) => (
        <Link
          to="/admin/coa-templates/$templateId"
          params={{ templateId: row.original.id }}
          className="font-medium text-primary hover:underline"
        >
          {row.getValue("name")}
        </Link>
      ),
    },
    {
      accessorKey: "entity_types",
      header: "Entity Types",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.entity_types.map((t) => (
            <span key={t} className="rounded bg-accent px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
      ),
    },
    {
      id: "account_count",
      header: "Accounts",
      cell: ({ row }) => {
        const count = itemCounts[row.original.id] || 0;
        return <span className="text-sm text-muted">{count}</span>;
      },
    },
    {
      id: "default",
      accessorKey: "is_default",
      header: "Default",
      cell: ({ row }) =>
        row.original.is_default ? (
          <span className="rounded bg-success-bg px-2 py-0.5 text-[10px] font-semibold text-success-text">Default</span>
        ) : null,
    },
    {
      id: "active",
      header: "Status",
      cell: ({ row }) => {
        const isActive = (row.original as COATemplate & { is_active?: boolean }).is_active !== false;
        return isActive ? (
          <span className="rounded bg-success-bg px-2 py-0.5 text-[10px] font-semibold text-success-text">Active</span>
        ) : (
          <span className="rounded bg-accent px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Inactive</span>
        );
      },
    },
  ];

  if (isLoading) {
    return <FormSkeleton fields={5} />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">COA Templates</h1>
          <p className="mt-0.5 text-sm text-muted">
            {templates.length} templates — Chart of Accounts templates for automatic entity setup.
          </p>
        </div>
        <Link
          to="/admin/coa-templates/new"
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + Import Template
        </Link>
      </div>

      <DataTable columns={columns} data={templates} searchKey="name" searchPlaceholder="Search templates..." />
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { useCOATemplates } from "@/hooks/useCOATemplates";
import type { COATemplate } from "@/types/coa";

export const Route = createFileRoute("/_authenticated/admin/coa-templates/")({
  component: COATemplateList,
});

function COATemplateList() {
  const { data: templates = [], isLoading } = useCOATemplates();

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
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="text-sm text-muted">{row.original.description ?? "---"}</span>,
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
      id: "version",
      accessorKey: "version",
      header: "Version",
      cell: ({ row }) => <span className="text-sm text-muted">v{row.original.version}</span>,
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
  ];

  if (isLoading) {
    return <FormSkeleton fields={5} />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">COA Templates</h1>
        <p className="mt-0.5 text-sm text-muted">
          Chart of Accounts templates for automatic entity setup. Templates define the standard account structure for
          each entity type.
        </p>
      </div>

      <DataTable columns={columns} data={templates} />
    </div>
  );
}

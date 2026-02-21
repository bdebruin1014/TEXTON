import { createFileRoute, Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { useAssignCOA, useCOATemplate, useCOATemplateItems } from "@/hooks/useCOATemplates";
import { populateTemplate } from "@/lib/coa-engine";
import type { COATemplateItem, COAVariables } from "@/types/coa";

export const Route = createFileRoute("/_authenticated/admin/coa-templates/$templateId")({
  component: COATemplateDetail,
});

function COATemplateDetail() {
  const { templateId } = Route.useParams();
  const { data: template, isLoading: templateLoading } = useCOATemplate(templateId);
  const { data: items = [], isLoading: itemsLoading } = useCOATemplateItems(templateId);
  const assignMutation = useAssignCOA();

  // Preview variables
  const [previewVars, setPreviewVars] = useState<COAVariables>({
    ABBR: "ACME",
    MEMBER_1_NAME: "John Doe",
    MEMBER_2_NAME: "Jane Doe",
  });

  const previewAccounts = populateTemplate(items, previewVars);

  // Assign modal state
  const [showAssign, setShowAssign] = useState(false);
  const [assignEntityId, setAssignEntityId] = useState("");
  const [assignVars, setAssignVars] = useState<COAVariables>({
    ABBR: "",
    MEMBER_1_NAME: "",
    MEMBER_2_NAME: "",
  });

  const columns: ColumnDef<COATemplateItem, unknown>[] = [
    {
      accessorKey: "sort_order",
      header: ({ column }) => <DataTableColumnHeader column={column} title="#" />,
      cell: ({ row }) => <span className="text-xs text-muted">{row.original.sort_order}</span>,
      size: 40,
    },
    {
      accessorKey: "account_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Acct #" />,
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium text-foreground">{row.original.account_number}</span>
      ),
    },
    {
      accessorKey: "account_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Account Name" />,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <span className={item.is_group ? "font-semibold text-foreground" : "text-sm text-foreground"}>
            {item.account_name}
          </span>
        );
      },
    },
    {
      accessorKey: "account_type",
      header: "Type",
      cell: ({ row }) => (
        <span className="rounded bg-accent px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {row.original.account_type}
        </span>
      ),
    },
    {
      id: "flags",
      header: "Flags",
      cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.is_group && (
            <span className="rounded bg-info-bg px-1.5 py-0.5 text-[10px] font-medium text-info-text">Group</span>
          )}
          {row.original.is_required && (
            <span className="rounded bg-warning-bg px-1.5 py-0.5 text-[10px] font-medium text-warning-text">
              Required
            </span>
          )}
        </div>
      ),
    },
  ];

  if (templateLoading || itemsLoading) {
    return <FormSkeleton fields={6} />;
  }

  if (!template) {
    return <EmptyState title="Template not found" description="This COA template may have been removed." />;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/admin/coa-templates"
          className="mb-2 flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors"
        >
          {"<-"} All Templates
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{template.name}</h1>
            {template.description && <p className="mt-0.5 text-sm text-muted">{template.description}</p>}
          </div>
          <button
            type="button"
            onClick={() => setShowAssign(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Assign to Entity
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {template.entity_types.map((t) => (
            <span key={t} className="rounded bg-accent px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {t}
            </span>
          ))}
          <span className="rounded bg-accent px-2 py-0.5 text-xs font-medium text-muted-foreground">
            v{template.version}
          </span>
          <span className="rounded bg-accent px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {items.length} accounts
          </span>
        </div>
      </div>

      {/* Variable Preview */}
      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Variable Preview</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{"{{ABBR}}"}</label>
            <input
              type="text"
              value={previewVars.ABBR ?? ""}
              onChange={(e) => setPreviewVars({ ...previewVars, ABBR: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{"{{MEMBER_1_NAME}}"}</label>
            <input
              type="text"
              value={previewVars.MEMBER_1_NAME ?? ""}
              onChange={(e) => setPreviewVars({ ...previewVars, MEMBER_1_NAME: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{"{{MEMBER_2_NAME}}"}</label>
            <input
              type="text"
              value={previewVars.MEMBER_2_NAME ?? ""}
              onChange={(e) => setPreviewVars({ ...previewVars, MEMBER_2_NAME: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Account Table (read-only) */}
      <div className="mb-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          Template Accounts ({items.length})
        </h3>
      </div>
      <DataTable columns={columns} data={items} />

      {/* Preview with variables applied */}
      {previewAccounts.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
            Preview with Variables Applied
          </h3>
          <div className="rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Acct #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Account Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody>
                {previewAccounts.map((acct) => (
                  <tr key={acct.account_number} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 font-mono text-sm">{acct.account_number}</td>
                    <td className={`px-4 py-2 ${acct.is_group ? "font-semibold" : ""}`}>{acct.account_name}</td>
                    <td className="px-4 py-2">
                      <span className="rounded bg-accent px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {acct.account_type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Assign Template to Entity</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Entity ID</label>
                <input
                  type="text"
                  value={assignEntityId}
                  onChange={(e) => setAssignEntityId(e.target.value)}
                  placeholder="UUID of entity"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Abbreviation (ABBR)</label>
                <input
                  type="text"
                  value={assignVars.ABBR ?? ""}
                  onChange={(e) => setAssignVars({ ...assignVars, ABBR: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Member 1 Name</label>
                <input
                  type="text"
                  value={assignVars.MEMBER_1_NAME ?? ""}
                  onChange={(e) => setAssignVars({ ...assignVars, MEMBER_1_NAME: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Member 2 Name</label>
                <input
                  type="text"
                  value={assignVars.MEMBER_2_NAME ?? ""}
                  onChange={(e) => setAssignVars({ ...assignVars, MEMBER_2_NAME: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAssign(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!assignEntityId || assignMutation.isPending}
                onClick={() => {
                  assignMutation.mutate(
                    { entityId: assignEntityId, templateId, variables: assignVars },
                    { onSuccess: () => setShowAssign(false) },
                  );
                }}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                {assignMutation.isPending ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

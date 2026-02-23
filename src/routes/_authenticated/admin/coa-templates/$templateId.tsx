import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { useCOATemplate, useCOATemplateItems } from "@/hooks/useCOATemplates";
import { populateTemplate } from "@/lib/coa-engine";
import { supabase } from "@/lib/supabase";
import type { COATemplateItem, COAVariables } from "@/types/coa";

export const Route = createFileRoute("/_authenticated/admin/coa-templates/$templateId")({
  component: COATemplateDetail,
});

interface EntityAssignment {
  id: string;
  entity_id: string;
  variables: Record<string, string>;
  assigned_at: string;
  entities: { id: string; name: string } | null;
}

function COATemplateDetail() {
  const { templateId } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: template, isLoading: templateLoading } = useCOATemplate(templateId);
  const { data: items = [], isLoading: itemsLoading } = useCOATemplateItems(templateId);

  // Entities using this template
  const { data: assignments = [] } = useQuery<EntityAssignment[]>({
    queryKey: ["coa-template-assignments", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity_coa_assignments")
        .select("id, entity_id, variables, assigned_at, entities(id, name)")
        .eq("template_id", templateId)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EntityAssignment[];
    },
    enabled: !!templateId,
  });

  // Toggle active state
  const toggleActive = useMutation({
    mutationFn: async (isActive: boolean) => {
      const { error } = await supabase.from("coa_templates").update({ is_active: isActive }).eq("id", templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coa-template", templateId] });
      queryClient.invalidateQueries({ queryKey: ["coa-templates"] });
      toast.success("Template updated");
    },
  });

  // Provision entity via edge function
  const [showAssign, setShowAssign] = useState(false);
  const [assignEntityId, setAssignEntityId] = useState("");
  const [assignVars, setAssignVars] = useState<COAVariables>({
    ABBR: "",
    MEMBER_1_NAME: "",
    MEMBER_2_NAME: "",
    BUILDER_NAME: "",
  });

  const provisionMutation = useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/provision-entity-coa`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity_id: assignEntityId,
          template_id: templateId,
          variables: assignVars,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Provision failed");
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Provisioned ${data.accounts_created} accounts`);
      queryClient.invalidateQueries({ queryKey: ["coa-template-assignments", templateId] });
      setShowAssign(false);
      setAssignEntityId("");
      setAssignVars({ ABBR: "", MEMBER_1_NAME: "", MEMBER_2_NAME: "", BUILDER_NAME: "" });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Preview variables
  const [previewVars, setPreviewVars] = useState<COAVariables>({
    ABBR: "ACME",
    MEMBER_1_NAME: "John Doe",
    MEMBER_2_NAME: "Jane Doe",
  });

  const previewAccounts = populateTemplate(items, previewVars);

  // Entities for dropdown in assign modal
  const { data: allEntities = [] } = useQuery({
    queryKey: ["entities-for-assign"],
    queryFn: async () => {
      const { data, error } = await supabase.from("entities").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: showAssign,
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
      accessorKey: "root_type",
      header: "Root",
      cell: ({ row }) => (
        <span className="text-xs text-muted">{row.original.root_type ?? "—"}</span>
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

  const isActive = (template as typeof template & { is_active?: boolean }).is_active !== false;
  const groupCount = items.filter((i) => i.is_group).length;
  const leafCount = items.filter((i) => !i.is_group).length;

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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => toggleActive.mutate(!isActive)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "border-success-text/30 bg-success-bg text-success-text"
                  : "border-border bg-accent text-muted-foreground"
              }`}
            >
              {isActive ? "Active" : "Inactive"}
            </button>
            <button
              type="button"
              onClick={() => setShowAssign(true)}
              className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
            >
              Assign to Entity
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {template.entity_types.map((t) => (
            <span key={t} className="rounded bg-accent px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {t}
            </span>
          ))}
          {template.is_default && (
            <span className="rounded bg-success-bg px-2 py-0.5 text-xs font-semibold text-success-text">Default</span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Total Accounts</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{items.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Groups</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{groupCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Leaf Accounts</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{leafCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Entities Using</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{assignments.length}</p>
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

      {/* Account Table */}
      <div className="mb-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          Template Accounts ({items.length})
        </h3>
      </div>
      <DataTable columns={columns} data={items} searchKey="account_name" searchPlaceholder="Search accounts..." />

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

      {/* Entities Using This Template */}
      {assignments.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
            Entities Using This Template ({assignments.length})
          </h3>
          <div className="rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Entity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    ABBR
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Assigned
                  </th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 font-medium text-foreground">
                      {a.entities?.name ?? a.entity_id}
                    </td>
                    <td className="px-4 py-2 font-mono text-sm text-muted">
                      {(a.variables as Record<string, string>)?.ABBR ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted">
                      {new Date(a.assigned_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign / Provision Modal */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Provision COA for Entity</h3>
            <p className="mb-4 text-xs text-muted">
              This will create {leafCount} accounts in the entity's chart of accounts with variable substitution.
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Entity</label>
                <select
                  value={assignEntityId}
                  onChange={(e) => setAssignEntityId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select entity...</option>
                  {allEntities.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Abbreviation (ABBR) <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={assignVars.ABBR ?? ""}
                  onChange={(e) => setAssignVars({ ...assignVars, ABBR: e.target.value })}
                  placeholder="e.g. RCH"
                  maxLength={5}
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
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Builder Name</label>
                <input
                  type="text"
                  value={assignVars.BUILDER_NAME ?? ""}
                  onChange={(e) => setAssignVars({ ...assignVars, BUILDER_NAME: e.target.value })}
                  placeholder="Only for SPE types"
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
                disabled={!assignEntityId || !assignVars.ABBR || provisionMutation.isPending}
                onClick={() => provisionMutation.mutate()}
                className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover disabled:opacity-50"
              >
                {provisionMutation.isPending ? "Provisioning..." : "Provision COA"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

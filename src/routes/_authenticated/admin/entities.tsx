import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/admin/entities")({
  component: EntitiesAdmin,
});

interface Entity {
  id: string;
  name: string;
  entity_type: string | null;
  parent_entity_name: string | null;
  tax_id: string | null;
  state_of_formation: string | null;
  status: string;
}

interface COATemplate {
  id: string;
  name: string;
  entity_types: string[];
  is_default: boolean;
  is_active?: boolean;
}

interface COATemplateItem {
  template_id: string;
}

const ENTITY_TYPE_OPTIONS = [
  { label: "Operating Company", value: "operating" },
  { label: "Holding Company", value: "holding_company" },
  { label: "Investment Fund", value: "fund" },
  { label: "SPE - Development", value: "spe_development" },
  { label: "SPE - Rental", value: "spe_rental" },
  { label: "Property Management", value: "property_management" },
  { label: "SPE - Scattered Lot", value: "spe_scattered_lot" },
  { label: "SPE - Community Dev", value: "spe_community_dev" },
  { label: "SPE - Lot Dev", value: "spe_lot_dev" },
  { label: "SPE - Lot Purchase", value: "spe_lot_purchase" },
];

const LEGAL_STRUCTURE_OPTIONS = ["LLC", "LP", "Corporation", "Trust", "S-Corp", "Partnership"];

function EntitiesAdmin() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formLegalStructure, setFormLegalStructure] = useState("");
  const [formEntityType, setFormEntityType] = useState("");
  const [formTemplateId, setFormTemplateId] = useState("");
  const [formAbbr, setFormAbbr] = useState("");
  const [formMember1, setFormMember1] = useState("");
  const [formMember2, setFormMember2] = useState("");
  const [formBuilderName, setFormBuilderName] = useState("");

  const { data: entities = [], isLoading } = useQuery<Entity[]>({
    queryKey: ["admin-entities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("entities").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: coaTemplates = [] } = useQuery<COATemplate[]>({
    queryKey: ["coa-templates-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coa_templates")
        .select("id, name, entity_types, is_default, is_active")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch item counts per template
  const { data: templateItemCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["coa-template-item-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coa_template_items").select("template_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of (data ?? []) as COATemplateItem[]) {
        counts[row.template_id] = (counts[row.template_id] || 0) + 1;
      }
      return counts;
    },
  });

  // Filter templates by entity type
  const filteredTemplates = formEntityType
    ? coaTemplates.filter(
        (t) => t.is_active !== false && t.entity_types.includes(formEntityType),
      )
    : coaTemplates.filter((t) => t.is_active !== false);

  // Auto-select default template when entity type changes
  const handleEntityTypeChange = (value: string) => {
    setFormEntityType(value);
    if (value) {
      const defaultTemplate = coaTemplates.find(
        (t) => t.entity_types.includes(value) && t.is_default && t.is_active !== false,
      );
      if (defaultTemplate) {
        setFormTemplateId(defaultTemplate.id);
      } else {
        setFormTemplateId("");
      }
    } else {
      setFormTemplateId("");
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormLegalStructure("");
    setFormEntityType("");
    setFormTemplateId("");
    setFormAbbr("");
    setFormMember1("");
    setFormMember2("");
    setFormBuilderName("");
  };

  const showBuilderName = formEntityType.startsWith("spe_");

  const addEntity = useMutation({
    mutationFn: async () => {
      // 1. Create the entity
      const { data: newEntity, error } = await supabase
        .from("entities")
        .insert({
          name: formName,
          entity_type: formLegalStructure || null,
          status: "Active",
        })
        .select("id")
        .single();
      if (error) throw error;

      // 2. If a COA template was selected, provision via edge function
      if (formTemplateId && newEntity) {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        const variables: Record<string, string> = {
          ABBR: formAbbr || formName.slice(0, 4).toUpperCase(),
          MEMBER_1_NAME: formMember1 || "Member 1",
          MEMBER_2_NAME: formMember2 || "Member 2",
        };
        if (formBuilderName) {
          variables.BUILDER_NAME = formBuilderName;
        }

        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/provision-entity-coa`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            entity_id: newEntity.id,
            template_id: formTemplateId,
            variables,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          // Entity created but provisioning failed - warn but don't throw
          toast.warning(`Entity created but COA provisioning failed: ${err.error}`);
          return;
        }

        const result = await res.json();
        toast.success(`Entity created with ${result.accounts_created} accounts provisioned`);
        return;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-entities"] });
      if (!formTemplateId) toast.success("Entity created");
      setShowModal(false);
      resetForm();
    },
    onError: () => {
      toast.error("Failed to add entity");
    },
  });

  const columns: ColumnDef<Entity, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Entity Name" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "entity_type",
      header: "Type",
      cell: ({ row }) => {
        const val = row.getValue("entity_type") as string | null;
        return val ? (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium uppercase text-primary">{val}</span>
        ) : (
          "—"
        );
      },
    },
    {
      accessorKey: "parent_entity_name",
      header: "Parent Entity",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("parent_entity_name") ?? "—"}</span>,
    },
    {
      accessorKey: "tax_id",
      header: "Tax ID",
      cell: ({ row }) => {
        const val = row.getValue("tax_id") as string | null;
        return val ? <span className="font-mono text-xs">{val}</span> : "—";
      },
    },
    {
      accessorKey: "state_of_formation",
      header: "State",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("state_of_formation") ?? "—"}</span>,
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
          <h1 className="text-xl font-semibold text-foreground">Entities</h1>
          <p className="mt-0.5 text-sm text-muted">{entities.length} entities</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + Add Entity
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : entities.length === 0 ? (
        <EmptyState title="No entities" description="Create SPEs and set parent entity relationships" />
      ) : (
        <DataTable columns={columns} data={entities} searchKey="name" searchPlaceholder="Search entities..." />
      )}

      {/* Create Entity Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Add Entity</h3>
            <div className="space-y-4">
              {/* Basic Info */}
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Entity Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Legal Structure</label>
                  <select
                    value={formLegalStructure}
                    onChange={(e) => setFormLegalStructure(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select...</option>
                    {LEGAL_STRUCTURE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Entity Type</label>
                  <select
                    value={formEntityType}
                    onChange={(e) => handleEntityTypeChange(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select...</option>
                    {ENTITY_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* COA Template Selection */}
              <div className="rounded-lg border border-border bg-accent/20 p-4">
                <label className="mb-2 block text-sm font-semibold text-foreground">COA Template</label>
                <select
                  value={formTemplateId}
                  onChange={(e) => setFormTemplateId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">No template</option>
                  {filteredTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({templateItemCounts[t.id] || 0} accounts){t.is_default ? " *" : ""}
                    </option>
                  ))}
                </select>
                {formTemplateId && (
                  <p className="mt-1 text-xs text-muted">
                    {templateItemCounts[formTemplateId] || 0} accounts will be provisioned
                  </p>
                )}
              </div>

              {/* Variables Card */}
              {formTemplateId && (
                <div className="rounded-lg border border-border bg-accent/20 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                    Template Variables
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Abbreviation (ABBR) <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        value={formAbbr}
                        onChange={(e) => setFormAbbr(e.target.value.toUpperCase())}
                        placeholder="e.g. RCH (2-5 chars)"
                        maxLength={5}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Member 1 Name</label>
                        <input
                          type="text"
                          value={formMember1}
                          onChange={(e) => setFormMember1(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Member 2 Name</label>
                        <input
                          type="text"
                          value={formMember2}
                          onChange={(e) => setFormMember2(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    {showBuilderName && (
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Builder Name</label>
                        <input
                          type="text"
                          value={formBuilderName}
                          onChange={(e) => setFormBuilderName(e.target.value)}
                          placeholder="Required for SPE types"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!formName || addEntity.isPending}
                onClick={() => addEntity.mutate()}
                className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover disabled:opacity-50"
              >
                {addEntity.isPending ? "Creating..." : "Create Entity"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

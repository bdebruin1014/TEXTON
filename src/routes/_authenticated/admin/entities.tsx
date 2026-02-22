import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";
import { CreateRecordModal } from "@/components/shared/CreateRecordModal";
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
}


function EntitiesAdmin() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

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
      const { data, error } = await supabase.from("coa_templates").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addEntity = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      // 1. Create the entity
      const { data: newEntity, error } = await supabase
        .from("entities")
        .insert({
          name: values.name,
          entity_type: values.entity_type || null,
          status: "Active",
        })
        .select("id")
        .single();
      if (error) throw error;

      // 2. If a COA template was selected, provision chart of accounts
      const templateId = values.coa_template;
      if (templateId && newEntity) {
        // Fetch template items
        const { data: items, error: itemsErr } = await supabase
          .from("coa_template_items")
          .select("account_number, account_name, account_type, is_group")
          .eq("template_id", templateId)
          .order("sort_order");
        if (itemsErr) throw itemsErr;

        if (items && items.length > 0) {
          // Replace {{ABBR}} placeholder with entity abbreviation
          const abbr = values.abbreviation || (values.name ?? "").slice(0, 4).toUpperCase();
          const accounts = items
            .filter((item) => !item.is_group)
            .map((item) => ({
              entity_id: newEntity.id,
              account_number: item.account_number.replace(/\{\{ABBR\}\}/g, abbr),
              account_name: item.account_name
                .replace(/\{\{ABBR\}\}/g, abbr)
                .replace(/\{\{MEMBER_1_NAME\}\}/g, values.member_1 || "Member 1")
                .replace(/\{\{MEMBER_2_NAME\}\}/g, values.member_2 || "Member 2"),
              account_type: item.account_type,
              normal_balance: item.account_type === "Asset" || item.account_type === "Expense" ? "Debit" : "Credit",
              is_active: true,
              is_locked: true,
              source_template_id: templateId,
            }));

          const { error: coaErr } = await supabase.from("chart_of_accounts").insert(accounts);
          if (coaErr) throw coaErr;

          // Record the assignment
          await supabase.from("entity_coa_assignments").upsert(
            {
              entity_id: newEntity.id,
              template_id: templateId,
              variables: { ABBR: abbr, MEMBER_1_NAME: values.member_1 || "", MEMBER_2_NAME: values.member_2 || "" },
            },
            { onConflict: "entity_id" },
          );
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-entities"] });
      toast.success("Entity created with chart of accounts");
      setShowModal(false);
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

      <CreateRecordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Entity"
        fields={[
          { name: "name", label: "Entity name", type: "text", required: true },
          {
            name: "entity_type",
            label: "Entity type",
            type: "select",
            options: ["LLC", "LP", "Corporation", "Trust", "S-Corp", "Partnership"],
          },
          {
            name: "coa_template",
            label: "COA Template",
            type: "select",
            options: coaTemplates.map((t) => t.name),
          },
          { name: "abbreviation", label: "Abbreviation (for account names)", type: "text", placeholder: "e.g. RCH" },
        ]}
        onSubmit={async (values) => {
          // Resolve template name to ID
          if (values.coa_template) {
            const template = coaTemplates.find((t) => t.name === values.coa_template);
            if (template) values.coa_template = template.id;
            else values.coa_template = "";
          }
          await addEntity.mutateAsync(values);
        }}
        loading={addEntity.isPending}
      />
    </div>
  );
}

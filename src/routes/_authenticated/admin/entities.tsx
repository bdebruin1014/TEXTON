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

  const addEntity = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { error } = await supabase.from("entities").insert({
        name: values.name,
        entity_type: values.entity_type || null,
        status: "Active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-entities"] });
      toast.success("Entity added");
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
        ]}
        onSubmit={async (values) => {
          await addEntity.mutateAsync(values);
          setShowModal(false);
        }}
        loading={addEntity.isPending}
      />
    </div>
  );
}

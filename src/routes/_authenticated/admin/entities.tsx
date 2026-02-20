import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
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

  const { data: entities = [], isLoading } = useQuery<Entity[]>({
    queryKey: ["admin-entities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("entities").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addEntity = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("entities").insert({
        name: "New Entity",
        entity_type: "SPE",
        status: "Active",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-entities"] }),
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
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">{val}</span>
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
          <p className="mt-0.5 text-sm text-muted">{entities.length} entities (SPEs and parent companies)</p>
        </div>
        <button
          type="button"
          onClick={() => addEntity.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          +
          Add Entity
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : entities.length === 0 ? (
        <EmptyState title="No entities" description="Create SPEs and set parent entity relationships" />
      ) : (
        <DataTable columns={columns} data={entities} searchKey="name" searchPlaceholder="Search entities..." />
      )}
    </div>
  );
}

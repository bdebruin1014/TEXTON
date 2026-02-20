import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/admin/pricing-defaults")({
  component: PricingDefaults,
});

interface PricingDefault {
  id: string;
  key: string;
  value: number;
  description: string | null;
}

function PricingDefaults() {
  const queryClient = useQueryClient();

  const { data: defaults = [], isLoading } = useQuery<PricingDefault[]>({
    queryKey: ["pricing-defaults"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pricing_defaults").select("*").order("key");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addDefault = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pricing_defaults").insert({
        key: "new_default",
        value: 0,
        description: "New pricing default",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pricing-defaults"] }),
  });

  const deleteDefault = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pricing_defaults").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pricing-defaults"] }),
  });

  const columns: ColumnDef<PricingDefault, unknown>[] = [
    {
      accessorKey: "key",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Key" />,
      cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.getValue("key")}</span>,
    },
    {
      accessorKey: "value",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Value" />,
      cell: ({ row }) => <span className="font-mono text-sm">{row.getValue<number>("value")}</span>,
    },
    {
      accessorKey: "description",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("description") ?? "—"}</span>,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteDefault.mutate(row.original.id);
          }}
          className="rounded p-1 text-muted transition-colors hover:text-destructive"
          aria-label="Delete default"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Pricing Defaults</h1>
          <p className="mt-0.5 text-sm text-muted">{defaults.length} default pricing configuration values</p>
        </div>
        <button
          type="button"
          onClick={() => addDefault.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Add Default
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : defaults.length === 0 ? (
        <EmptyState
          title="No pricing defaults"
          description="Add default pricing values used across deal sheet calculations"
        />
      ) : (
        <DataTable columns={columns} data={defaults} searchKey="key" searchPlaceholder="Search by key..." />
      )}
    </div>
  );
}

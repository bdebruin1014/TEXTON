import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";

import { CreateRecordModal } from "@/components/shared/CreateRecordModal";
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
  const [showModal, setShowModal] = useState(false);

  const { data: defaults = [], isLoading } = useQuery<PricingDefault[]>({
    queryKey: ["pricing-defaults"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pricing_defaults").select("*").order("key");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addDefault = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { error } = await supabase.from("pricing_defaults").insert({
        key: values.name,
        value: values.amount ? Number(values.amount) : 0,
        description: values.category || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-defaults"] });
      toast.success("Pricing default added");
    },
    onError: () => {
      toast.error("Failed to add pricing default");
    },
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
          <span className="text-xs font-medium">Delete</span>
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
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
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

      <CreateRecordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Pricing Default"
        fields={[
          { name: "name", label: "Item name", type: "text", required: true },
          { name: "amount", label: "Default amount", type: "number" },
          { name: "category", label: "Category", type: "text" },
        ]}
        onSubmit={async (values) => {
          await addDefault.mutateAsync(values);
          setShowModal(false);
        }}
        loading={addDefault.isPending}
      />
    </div>
  );
}

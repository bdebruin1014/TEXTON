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
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/upgrade-packages")({
  component: UpgradePackages,
});

interface UpgradePackage {
  id: string;
  name: string;
  category: string;
  description: string | null;
  default_amount: number | null;
  sort_order: number;
}

const CATEGORIES = ["Exterior", "Interior", "Custom"] as const;

function UpgradePackages() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: packages = [], isLoading } = useQuery<UpgradePackage[]>({
    queryKey: ["upgrade-packages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("upgrade_packages").select("*").order("category").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addPackage = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { error } = await supabase.from("upgrade_packages").insert({
        name: values.name,
        category: values.description ? "Custom" : "Custom",
        description: values.description || null,
        default_amount: values.default_amount ? Number(values.default_amount) : 0,
        sort_order: packages.length + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upgrade-packages"] });
      toast.success("Upgrade package added");
    },
    onError: () => {
      toast.error("Failed to add upgrade package");
    },
  });

  const deletePackage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("upgrade_packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["upgrade-packages"] }),
  });

  const categoryBadge = (cat: string) => {
    const colors: Record<string, string> = {
      Exterior: "bg-blue-100 text-blue-700",
      Interior: "bg-amber-100 text-amber-700",
      Custom: "bg-accent text-gray-700",
    };
    return (
      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[cat] ?? colors.Custom}`}>
        {cat}
      </span>
    );
  };

  const columns: ColumnDef<UpgradePackage, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "category",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
      cell: ({ row }) => categoryBadge(row.getValue("category")),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: "description",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("description") ?? "—"}</span>,
    },
    {
      accessorKey: "default_amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Default Amount" />,
      cell: ({ row }) => formatCurrency(row.getValue("default_amount")),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deletePackage.mutate(row.original.id);
          }}
          className="rounded p-1 text-muted transition-colors hover:text-destructive"
          aria-label="Delete package"
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
          <h1 className="text-xl font-semibold text-foreground">Upgrade Packages</h1>
          <p className="mt-0.5 text-sm text-muted">
            {packages.length} packages across {CATEGORIES.length} categories
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Add Package
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : packages.length === 0 ? (
        <EmptyState
          title="No upgrade packages"
          description="Add exterior, interior, and custom upgrade packages for home pricing"
        />
      ) : (
        <DataTable columns={columns} data={packages} searchKey="name" searchPlaceholder="Search packages..." />
      )}

      <CreateRecordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Upgrade Package"
        fields={[
          { name: "name", label: "Package name", type: "text", required: true },
          { name: "description", label: "Description", type: "text" },
          { name: "default_amount", label: "Default price", type: "number" },
        ]}
        onSubmit={async (values) => {
          await addPackage.mutateAsync(values);
          setShowModal(false);
        }}
        loading={addPackage.isPending}
      />
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";

import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/site-work-items")({
  component: SiteWorkItems,
});

interface SiteWorkItem {
  id: string;
  code: string;
  description: string;
  default_amount: number | null;
  sort_order: number;
}

function SiteWorkItems() {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery<SiteWorkItem[]>({
    queryKey: ["site-work-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_work_items").select("*").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addItem = useMutation({
    mutationFn: async () => {
      const nextOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) + 1 : 1;
      const code = `SW-${String(nextOrder).padStart(2, "0")}`;
      const { error } = await supabase.from("site_work_items").insert({
        code,
        description: "New Item",
        default_amount: 0,
        sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["site-work-items"] }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("site_work_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["site-work-items"] }),
  });

  const columns: ColumnDef<SiteWorkItem, unknown>[] = [
    {
      accessorKey: "code",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
      cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.getValue("code")}</span>,
    },
    {
      accessorKey: "description",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("description")}</span>,
    },
    {
      accessorKey: "default_amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Default Amount" />,
      cell: ({ row }) => formatCurrency(row.getValue("default_amount")),
    },
    {
      accessorKey: "sort_order",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Order" />,
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("sort_order")}</span>,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteItem.mutate(row.original.id);
          }}
          className="rounded p-1 text-muted transition-colors hover:text-destructive"
          aria-label="Delete item"
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
          <h1 className="text-xl font-semibold text-foreground">Site Work Items</h1>
          <p className="mt-0.5 text-sm text-muted">{items.length} standard site work line items</p>
        </div>
        <button
          type="button"
          onClick={() => addItem.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Add Item
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          title="No site work items"
          description="Add standard site work line items for deal sheet calculations"
        />
      ) : (
        <DataTable columns={columns} data={items} searchKey="description" searchPlaceholder="Search items..." />
      )}
    </div>
  );
}

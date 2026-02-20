import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";

import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/disposition/$dispositionId/option-selections")({
  component: OptionSelections,
});

interface OptionSelection {
  id: string;
  category: string | null;
  option_name: string;
  standard_option: string | null;
  upgrade_option: string | null;
  price: number | null;
  is_standard: boolean;
  notes: string | null;
}

function OptionSelections() {
  const { dispositionId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: options = [], isLoading } = useQuery<OptionSelection[]>({
    queryKey: ["disposition-options", dispositionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disposition_options")
        .select("*")
        .eq("disposition_id", dispositionId)
        .order("category", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addOption = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("disposition_options").insert({
        disposition_id: dispositionId,
        option_name: "New Option",
        is_standard: true,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["disposition-options", dispositionId] }),
  });

  const deleteOption = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("disposition_options").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["disposition-options", dispositionId] }),
  });

  const upgradesTotal = options.filter((o) => !o.is_standard).reduce((sum, o) => sum + (o.price ?? 0), 0);

  const columns: ColumnDef<OptionSelection, unknown>[] = [
    {
      accessorKey: "category",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
      cell: ({ row }) => <span className="text-xs text-muted">{row.getValue("category") ?? "—"}</span>,
    },
    {
      accessorKey: "option_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Option" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("option_name")}</span>,
    },
    {
      accessorKey: "standard_option",
      header: "Standard",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("standard_option") ?? "—"}</span>,
    },
    {
      accessorKey: "upgrade_option",
      header: "Upgrade",
      cell: ({ row }) => {
        const val = row.getValue("upgrade_option") as string | null;
        return val ? <span className="text-sm font-medium text-primary">{val}</span> : "—";
      },
    },
    {
      id: "type",
      header: "Type",
      cell: ({ row }) => (
        <span className={`text-xs font-medium ${row.original.is_standard ? "text-muted" : "text-warning"}`}>
          {row.original.is_standard ? "Standard" : "Upgrade"}
        </span>
      ),
    },
    {
      accessorKey: "price",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Price" />,
      cell: ({ row }) => {
        const val = row.getValue("price") as number | null;
        if (!val) return "—";
        return <span className={row.original.is_standard ? "" : "font-medium"}>{formatCurrency(val)}</span>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteOption.mutate(row.original.id);
          }}
          className="rounded p-1 text-muted transition-colors hover:text-destructive"
        >
          Delete
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Option Selections</h2>
          {options.length > 0 && (
            <p className="mt-0.5 text-sm text-muted">
              {options.length} options · Upgrades total: {formatCurrency(upgradesTotal)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => addOption.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          + Add Option
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : options.length === 0 ? (
        <EmptyState title="No option selections" description="Track buyer option and upgrade selections with pricing" />
      ) : (
        <DataTable columns={columns} data={options} searchKey="option_name" searchPlaceholder="Search options..." />
      )}
    </div>
  );
}

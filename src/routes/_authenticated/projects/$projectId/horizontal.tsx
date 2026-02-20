import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { AutoSaveField } from "@/components/forms/AutoSaveField";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/$projectId/horizontal")({
  component: Horizontal,
});

interface LineItem {
  id: string;
  description: string;
  category: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  vendor: string | null;
  status: string;
  sort_order: number;
}

function Horizontal() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
      if (error) throw error;
      return data;
    },
  });

  const projectMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("projects").update(updates).eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });

  const saveProject = (field: string) => async (value: string | number) => {
    await projectMutation.mutateAsync({ [field]: value });
  };

  const { data: lineItems = [], isLoading } = useQuery<LineItem[]>({
    queryKey: ["horizontal-items", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("horizontal_line_items")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addItem = useMutation({
    mutationFn: async () => {
      const nextOrder = lineItems.length > 0 ? Math.max(...lineItems.map((i) => i.sort_order)) + 1 : 1;
      const { error } = await supabase.from("horizontal_line_items").insert({
        project_id: projectId,
        description: "New Line Item",
        status: "Pending",
        sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["horizontal-items", projectId] }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("horizontal_line_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["horizontal-items", projectId] }),
  });

  const totalEstimated = lineItems.reduce((sum, i) => sum + (i.estimated_cost ?? 0), 0);
  const totalActual = lineItems.reduce((sum, i) => sum + (i.actual_cost ?? 0), 0);

  const columns: ColumnDef<LineItem, unknown>[] = [
    {
      accessorKey: "description",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("description")}</span>,
    },
    {
      accessorKey: "category",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
      cell: ({ row }) => <span className="text-muted">{row.getValue("category") ?? "—"}</span>,
    },
    {
      accessorKey: "estimated_cost",
      header: "Estimated",
      cell: ({ row }) => {
        const val = row.getValue("estimated_cost") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "actual_cost",
      header: "Actual",
      cell: ({ row }) => {
        const val = row.getValue("actual_cost") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "vendor",
      header: "Vendor",
      cell: ({ row }) => <span className="text-muted">{row.getValue("vendor") ?? "—"}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
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
        >
          
        </button>
      ),
    },
  ];

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-foreground">Horizontal Development</h2>

      {/* Scope fields */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Development Scope</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CurrencyInput
            label="Infrastructure Budget"
            value={project?.infrastructure_budget}
            onSave={saveProject("infrastructure_budget")}
          />
          <AutoSaveField
            label="General Contractor"
            value={project?.horizontal_gc}
            onSave={saveProject("horizontal_gc")}
            placeholder="GC name..."
          />
          <AutoSaveField
            label="Start Date"
            value={project?.horizontal_start_date}
            onSave={saveProject("horizontal_start_date")}
            type="date"
          />
          <AutoSaveField
            label="Completion Date"
            value={project?.horizontal_completion_date}
            onSave={saveProject("horizontal_completion_date")}
            type="date"
          />
        </div>
      </div>

      {/* Totals */}
      {lineItems.length > 0 && (
        <div className="mb-4 flex items-center gap-6 text-sm">
          <span className="text-muted">
            Estimated: <span className="font-medium text-foreground">{formatCurrency(totalEstimated)}</span>
          </span>
          <span className="text-muted">
            Actual: <span className="font-medium text-foreground">{formatCurrency(totalActual)}</span>
          </span>
          <span className="text-muted">
            Variance:{" "}
            <span className={`font-medium ${totalActual > totalEstimated ? "text-destructive" : "text-success"}`}>
              {formatCurrency(totalEstimated - totalActual)}
            </span>
          </span>
        </div>
      )}

      {/* Line Items */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Line Items</h3>
        <button
          type="button"
          onClick={() => addItem.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          +
          Add Line Item
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : lineItems.length === 0 ? (
        <EmptyState title="No line items" description="Add horizontal development line items" />
      ) : (
        <DataTable columns={columns} data={lineItems} searchKey="description" searchPlaceholder="Search items..." />
      )}
    </div>
  );
}

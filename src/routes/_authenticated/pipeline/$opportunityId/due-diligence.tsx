import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";

import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pipeline/$opportunityId/due-diligence")({
  component: DueDiligence,
});

interface DDItem {
  id: string;
  item_name: string;
  status: string;
  vendor: string | null;
  due_date: string | null;
  completed_date: string | null;
  cost: number | null;
  notes: string | null;
  sort_order: number;
}

const DD_STATUSES = ["Not Started", "In Progress", "Complete", "N/A"] as const;

const DEFAULT_DD_ITEMS = [
  "Title Search",
  "Survey",
  "Environmental Phase I",
  "Geotechnical Report",
  "Wetlands Delineation",
  "Flood Zone Verification",
  "Zoning Confirmation",
  "Utility Availability Letters",
  "Traffic Study",
  "Market Study",
  "Appraisal",
  "Boundary Survey",
  "Topographic Survey",
  "Tree Survey",
  "Phase II Environmental",
  "Soil Borings",
  "HOA Review",
  "Tax Records Review",
  "Easement Review",
  "Access Verification",
];

function DueDiligence() {
  const { opportunityId } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: items = [], isLoading } = useQuery<DDItem[]>({
    queryKey: ["dd-items", opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("due_diligence_items")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addItem = useMutation({
    mutationFn: async () => {
      const nextOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) + 1 : 1;
      const { error } = await supabase.from("due_diligence_items").insert({
        opportunity_id: opportunityId,
        item_name: "New Item",
        status: "Not Started",
        sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dd-items", opportunityId] }),
  });

  const seedDefaults = useMutation({
    mutationFn: async () => {
      const inserts = DEFAULT_DD_ITEMS.map((name, i) => ({
        opportunity_id: opportunityId,
        item_name: name,
        status: "Not Started",
        sort_order: i + 1,
      }));
      const { error } = await supabase.from("due_diligence_items").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dd-items", opportunityId] }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "Complete") updates.completed_date = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("due_diligence_items").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dd-items", opportunityId] }),
  });

  const completedCount = items.filter((i) => i.status === "Complete").length;
  const totalCount = items.length;

  const columns: ColumnDef<DDItem, unknown>[] = [
    {
      id: "status-icon",
      cell: ({ row }) => {
        const status = row.original.status;
        if (status === "Complete") return <span className="text-success font-bold">Done</span>;
        if (status === "In Progress") return <span className="text-warning">Pending</span>;
        return <span className="text-muted">○</span>;
      },
      size: 40,
    },
    {
      accessorKey: "item_name",
      header: "Item",
      cell: ({ row }) => <span className="font-medium">{row.getValue("item_name")}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <select
            value={item.status}
            onChange={(e) => updateStatus.mutate({ id: item.id, status: e.target.value })}
            className="rounded border border-border bg-transparent px-2 py-1 text-xs outline-none"
          >
            {DD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      accessorKey: "vendor",
      header: "Vendor",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("vendor") ?? "—"}</span>,
    },
    {
      accessorKey: "due_date",
      header: "Due Date",
      cell: ({ row }) => formatDate(row.getValue("due_date")),
    },
    {
      accessorKey: "cost",
      header: "Cost",
      cell: ({ row }) => {
        const val = row.getValue("cost") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Due Diligence</h2>
          {totalCount > 0 && (
            <p className="mt-0.5 text-sm text-muted">
              {completedCount} of {totalCount} complete
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {items.length === 0 && (
            <button
              type="button"
              onClick={() => seedDefaults.mutate()}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary-50"
            >
              Seed Standard Items
            </button>
          )}
          <button
            type="button"
            onClick={() => addItem.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            + Add Item
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="mb-4">
          <div className="h-2 w-full rounded-full bg-accent">
            <div
              className="h-2 rounded-full bg-success transition-all"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <FormSkeleton />
      ) : (
        <DataTable columns={columns} data={items} searchKey="item_name" searchPlaceholder="Search items..." />
      )}
    </div>
  );
}

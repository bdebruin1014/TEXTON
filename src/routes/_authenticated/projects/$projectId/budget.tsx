import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { BudgetChart } from "@/components/charts/BudgetChart";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/$projectId/budget")({
  component: Budget,
});

interface BudgetLine {
  id: string;
  category: string;
  description: string;
  budgeted: number | null;
  committed: number | null;
  spent: number | null;
  sort_order: number;
}

const BUDGET_CATEGORIES = [
  "Land Acquisition",
  "Hard Costs",
  "Soft Costs",
  "Financing",
  "Fees & Permits",
  "Contingency",
  "Marketing",
  "General & Administrative",
] as const;

function Budget() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: lines = [], isLoading } = useQuery<BudgetLine[]>({
    queryKey: ["budget-lines", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_lines")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addLine = useMutation({
    mutationFn: async () => {
      const nextOrder = lines.length > 0 ? Math.max(...lines.map((l) => l.sort_order)) + 1 : 1;
      const { error } = await supabase.from("budget_lines").insert({
        project_id: projectId,
        category: "Hard Costs",
        description: "New Budget Line",
        budgeted: 0,
        sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budget-lines", projectId] }),
  });

  const deleteLine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budget_lines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budget-lines", projectId] }),
  });

  const totalBudgeted = lines.reduce((sum, l) => sum + (l.budgeted ?? 0), 0);
  const totalCommitted = lines.reduce((sum, l) => sum + (l.committed ?? 0), 0);
  const totalSpent = lines.reduce((sum, l) => sum + (l.spent ?? 0), 0);

  // Aggregate by category for chart
  const categoryData = BUDGET_CATEGORIES.map((cat) => {
    const catLines = lines.filter((l) => l.category === cat);
    return {
      category: cat,
      budgeted: catLines.reduce((s, l) => s + (l.budgeted ?? 0), 0),
      spent: catLines.reduce((s, l) => s + (l.spent ?? 0), 0),
    };
  }).filter((d) => d.budgeted > 0 || d.spent > 0);

  const columns: ColumnDef<BudgetLine, unknown>[] = [
    {
      accessorKey: "category",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
      cell: ({ row }) => <span className="text-xs text-muted">{row.getValue("category")}</span>,
    },
    {
      accessorKey: "description",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("description")}</span>,
    },
    {
      accessorKey: "budgeted",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Budgeted" />,
      cell: ({ row }) => {
        const val = row.getValue("budgeted") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "committed",
      header: "Committed",
      cell: ({ row }) => {
        const val = row.getValue("committed") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "spent",
      header: "Spent",
      cell: ({ row }) => {
        const val = row.getValue("spent") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      id: "variance",
      header: "Variance",
      cell: ({ row }) => {
        const budgeted = row.original.budgeted ?? 0;
        const spent = row.original.spent ?? 0;
        const variance = budgeted - spent;
        return <span className={variance < 0 ? "text-destructive" : "text-success"}>{formatCurrency(variance)}</span>;
      },
    },
    {
      id: "progress",
      header: "Progress",
      cell: ({ row }) => {
        const budgeted = row.original.budgeted ?? 0;
        const spent = row.original.spent ?? 0;
        const pct = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0;
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 rounded-full bg-accent">
              <div
                className={`h-1.5 rounded-full ${pct > 100 ? "bg-destructive" : "bg-primary"}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted">{pct.toFixed(0)}%</span>
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteLine.mutate(row.original.id);
          }}
          className="rounded p-1 text-muted transition-colors hover:text-destructive"
        ></button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Budget & Financials</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => addLine.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
          >
            + Add Budget Line
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted">Total Budgeted</p>
          <p className="text-lg font-semibold text-foreground">{formatCurrency(totalBudgeted)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted">Total Committed</p>
          <p className="text-lg font-semibold text-foreground">{formatCurrency(totalCommitted)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted">Total Spent</p>
          <p className="text-lg font-semibold text-foreground">{formatCurrency(totalSpent)}</p>
          <p className={`text-xs ${totalSpent > totalBudgeted ? "text-destructive" : "text-success"}`}>
            {formatCurrency(totalBudgeted - totalSpent)} remaining
          </p>
        </div>
      </div>

      {/* Budget Chart */}
      {categoryData.length > 0 && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Budget vs Actual</h3>
          <BudgetChart data={categoryData} />
        </div>
      )}

      {/* Budget Table */}
      {isLoading ? (
        <FormSkeleton />
      ) : lines.length === 0 ? (
        <EmptyState title="No budget lines" description="Add budget line items to track project financials" />
      ) : (
        <DataTable columns={columns} data={lines} searchKey="description" searchPlaceholder="Search budget..." />
      )}
    </div>
  );
}

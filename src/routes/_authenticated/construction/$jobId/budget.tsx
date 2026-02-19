import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/construction/$jobId/budget")({
  component: JobBudget,
});

interface BudgetLine {
  id: string;
  cost_code: string | null;
  description: string;
  budgeted: number | null;
  committed: number | null;
  invoiced: number | null;
  paid: number | null;
  sort_order: number;
}

const DEFAULT_COST_CODES = [
  { code: "01", desc: "General Conditions" },
  { code: "02", desc: "Site Work" },
  { code: "03", desc: "Concrete / Foundation" },
  { code: "04", desc: "Framing / Lumber" },
  { code: "05", desc: "Roofing" },
  { code: "06", desc: "Windows & Doors" },
  { code: "07", desc: "Exterior Finish" },
  { code: "08", desc: "Plumbing" },
  { code: "09", desc: "HVAC" },
  { code: "10", desc: "Electrical" },
  { code: "11", desc: "Insulation" },
  { code: "12", desc: "Drywall" },
  { code: "13", desc: "Interior Trim" },
  { code: "14", desc: "Cabinets & Countertops" },
  { code: "15", desc: "Flooring" },
  { code: "16", desc: "Paint" },
  { code: "17", desc: "Appliances" },
  { code: "18", desc: "Landscaping" },
  { code: "19", desc: "Cleanup & Final" },
  { code: "20", desc: "Permits & Fees" },
];

function JobBudget() {
  const { jobId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: lines = [], isLoading } = useQuery<BudgetLine[]>({
    queryKey: ["job-budget", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_budget_lines")
        .select("*")
        .eq("job_id", jobId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addLine = useMutation({
    mutationFn: async () => {
      const nextOrder = lines.length > 0 ? Math.max(...lines.map((l) => l.sort_order)) + 1 : 1;
      const { error } = await supabase.from("job_budget_lines").insert({
        job_id: jobId,
        description: "New Line Item",
        budgeted: 0,
        sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["job-budget", jobId] }),
  });

  const importTemplate = useMutation({
    mutationFn: async () => {
      const inserts = DEFAULT_COST_CODES.map((cc, i) => ({
        job_id: jobId,
        cost_code: cc.code,
        description: cc.desc,
        budgeted: 0,
        sort_order: i + 1,
      }));
      const { error } = await supabase.from("job_budget_lines").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["job-budget", jobId] }),
  });

  const deleteLine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_budget_lines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["job-budget", jobId] }),
  });

  const totalBudgeted = lines.reduce((sum, l) => sum + (l.budgeted ?? 0), 0);
  const totalCommitted = lines.reduce((sum, l) => sum + (l.committed ?? 0), 0);
  const totalInvoiced = lines.reduce((sum, l) => sum + (l.invoiced ?? 0), 0);
  const totalPaid = lines.reduce((sum, l) => sum + (l.paid ?? 0), 0);

  const columns: ColumnDef<BudgetLine, unknown>[] = [
    {
      accessorKey: "cost_code",
      header: "Code",
      cell: ({ row }) => <span className="text-xs font-mono text-muted">{row.getValue("cost_code") ?? "—"}</span>,
      size: 60,
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
      accessorKey: "invoiced",
      header: "Invoiced",
      cell: ({ row }) => {
        const val = row.getValue("invoiced") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "paid",
      header: "Paid",
      cell: ({ row }) => {
        const val = row.getValue("paid") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      id: "variance",
      header: "Variance",
      cell: ({ row }) => {
        const budgeted = row.original.budgeted ?? 0;
        const committed = row.original.committed ?? 0;
        if (!budgeted) return "—";
        const variance = budgeted - committed;
        return <span className={variance < 0 ? "text-destructive" : "text-success"}>{formatCurrency(variance)}</span>;
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
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Budget</h2>
        <div className="flex items-center gap-2">
          {lines.length === 0 && (
            <button
              type="button"
              onClick={() => importTemplate.mutate()}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary-50"
            >
              Import from Template
            </button>
          )}
          <button
            type="button"
            onClick={() => addLine.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Add Budget Line
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      {lines.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted">Budgeted</p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(totalBudgeted)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted">Committed</p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(totalCommitted)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted">Invoiced</p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(totalInvoiced)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted">Paid</p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(totalPaid)}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <FormSkeleton />
      ) : lines.length === 0 ? (
        <EmptyState title="No budget lines" description="Add budget lines or import from a template" />
      ) : (
        <DataTable columns={columns} data={lines} searchKey="description" searchPlaceholder="Search budget..." />
      )}
    </div>
  );
}

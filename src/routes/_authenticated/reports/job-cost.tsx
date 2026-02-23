import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { type ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { exportToCsv } from "@/lib/export-csv";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reports/job-cost")({
  component: JobCostReport,
});

interface JobCostRow {
  id: string;
  job_name: string;
  status: string;
  project_name: string | null;
  lot_number: string | null;
  budget: number;
  committed: number;
  actual: number;
  variance: number;
  pct_complete: number;
}

function JobCostReport() {
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: projects = [] } = useQuery({
    queryKey: ["report-jc-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, project_name").order("project_name");
      return data ?? [];
    },
  });

  const { data: rawJobs = [], isLoading } = useQuery({
    queryKey: ["report-job-cost"],
    queryFn: async () => {
      const { data: jobs, error } = await supabase
        .from("jobs")
        .select("id, job_name, status, project_id, project_name, lot_number, budget_total, spent_total")
        .order("job_name");
      if (error) throw error;

      // Get budget line rollups per job
      const { data: budgetLines } = await supabase
        .from("job_budget_lines")
        .select("job_id, budgeted, committed, invoiced, paid");

      const budgetByJob = new Map<string, { budgeted: number; committed: number; paid: number }>();
      for (const bl of budgetLines ?? []) {
        if (!bl.job_id) continue;
        const entry = budgetByJob.get(bl.job_id) ?? { budgeted: 0, committed: 0, paid: 0 };
        entry.budgeted += Number(bl.budgeted ?? 0);
        entry.committed += Number(bl.committed ?? 0);
        entry.paid += Number(bl.paid ?? 0);
        budgetByJob.set(bl.job_id, entry);
      }

      // Get PO totals per job (approved/in-progress only)
      const { data: pos } = await supabase
        .from("purchase_orders")
        .select("job_id, amount, status")
        .in("status", ["Approved", "In Progress", "Complete", "Invoiced", "Paid"]);

      const poByJob = new Map<string, number>();
      for (const po of pos ?? []) {
        if (!po.job_id) continue;
        poByJob.set(po.job_id, (poByJob.get(po.job_id) ?? 0) + Number(po.amount ?? 0));
      }

      return (jobs ?? []).map((j) => {
        const bl = budgetByJob.get(j.id);
        const budget = bl ? bl.budgeted : Number(j.budget_total ?? 0);
        const committed = bl ? bl.committed : (poByJob.get(j.id) ?? 0);
        const actual = bl ? bl.paid : Number(j.spent_total ?? 0);
        const variance = budget - actual;
        const pct_complete = budget > 0 ? Math.round((actual / budget) * 100) : 0;

        return {
          id: j.id,
          job_name: j.job_name,
          status: j.status,
          project_name: j.project_name,
          project_id: j.project_id,
          lot_number: j.lot_number,
          budget,
          committed,
          actual,
          variance,
          pct_complete,
        };
      });
    },
  });

  const data = useMemo(() => {
    let filtered = rawJobs;
    if (projectFilter !== "all") filtered = filtered.filter((j) => j.project_id === projectFilter);
    if (statusFilter !== "all") filtered = filtered.filter((j) => j.status === statusFilter);
    return filtered;
  }, [rawJobs, projectFilter, statusFilter]);

  const statuses = [...new Set(rawJobs.map((j) => j.status))].sort();

  const columns: ColumnDef<JobCostRow>[] = [
    {
      accessorKey: "job_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Job" />,
      cell: ({ row }) => <span className="font-medium">{row.original.job_name}</span>,
    },
    {
      accessorKey: "project_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Project" />,
    },
    {
      accessorKey: "lot_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Lot" />,
      cell: ({ row }) => row.original.lot_number ?? "-",
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "budget",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Budget" />,
      cell: ({ row }) => formatCurrency(row.original.budget),
    },
    {
      accessorKey: "committed",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Committed" />,
      cell: ({ row }) => formatCurrency(row.original.committed),
    },
    {
      accessorKey: "actual",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Actual" />,
      cell: ({ row }) => formatCurrency(row.original.actual),
    },
    {
      accessorKey: "variance",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Variance" />,
      cell: ({ row }) => {
        const v = row.original.variance;
        return <span className={v < 0 ? "font-medium text-destructive" : ""}>{formatCurrency(v)}</span>;
      },
    },
    {
      accessorKey: "pct_complete",
      header: ({ column }) => <DataTableColumnHeader column={column} title="% Complete" />,
      cell: ({ row }) => {
        const pct = row.original.pct_complete;
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 rounded-full bg-border">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <span className="text-xs">{pct}%</span>
          </div>
        );
      },
    },
  ];

  const totals = useMemo(
    () => ({
      budget: data.reduce((s, r) => s + r.budget, 0),
      committed: data.reduce((s, r) => s + r.committed, 0),
      actual: data.reduce((s, r) => s + r.actual, 0),
      variance: data.reduce((s, r) => s + r.variance, 0),
    }),
    [data],
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Job Cost Report</h1>
          <p className="text-sm text-muted">Budget vs. committed vs. actual per job with variance.</p>
        </div>
        <button
          type="button"
          onClick={() =>
            exportToCsv(
              "job-cost",
              [
                { header: "Job", accessor: (r) => r.job_name },
                { header: "Project", accessor: (r) => r.project_name ?? "" },
                { header: "Lot", accessor: (r) => r.lot_number ?? "" },
                { header: "Status", accessor: (r) => r.status },
                { header: "Budget", accessor: (r) => r.budget },
                { header: "Committed", accessor: (r) => r.committed },
                { header: "Actual", accessor: (r) => r.actual },
                { header: "Variance", accessor: (r) => r.variance },
                { header: "% Complete", accessor: (r) => r.pct_complete },
              ],
              data,
            )
          }
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-card-hover"
        >
          Export CSV
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.project_name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="all">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <DataTable columns={columns} data={data} searchKey="job_name" searchPlaceholder="Search jobs..." />

      {!isLoading && data.length > 0 && (
        <div className="mt-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
          <span className="mr-6">Totals:</span>
          <span className="mr-6">Budget: {formatCurrency(totals.budget)}</span>
          <span className="mr-6">Committed: {formatCurrency(totals.committed)}</span>
          <span className="mr-6">Actual: {formatCurrency(totals.actual)}</span>
          <span className={totals.variance < 0 ? "text-destructive" : ""}>
            Variance: {formatCurrency(totals.variance)}
          </span>
        </div>
      )}
    </div>
  );
}

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

export const Route = createFileRoute("/_authenticated/reports/project-summary")({
  component: ProjectSummaryReport,
});

interface ProjectRow {
  id: string;
  project_name: string;
  status: string;
  project_type: string | null;
  entity_name: string | null;
  total_lots: number | null;
  total_budget: number | null;
  total_spent: number | null;
  total_revenue: number | null;
  total_profit: number | null;
  lots_available: number;
  lots_sold: number;
  lots_under_construction: number;
}

function ProjectSummaryReport() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: rawProjects = [], isLoading } = useQuery({
    queryKey: ["report-project-summary"],
    queryFn: async () => {
      const { data: projects, error } = await supabase
        .from("projects")
        .select("id, project_name, status, project_type, entity_name, total_lots, total_budget, total_spent, total_revenue, total_profit")
        .order("project_name");
      if (error) throw error;

      // Fetch lot status counts per project
      const { data: lots } = await supabase
        .from("lots")
        .select("project_id, status");

      // Fetch sold disposition counts per project
      const { data: disps } = await supabase
        .from("dispositions")
        .select("project_id, status");

      const lotsByProject = new Map<string, { available: number; underConstruction: number }>();
      for (const lot of lots ?? []) {
        if (!lot.project_id) continue;
        const entry = lotsByProject.get(lot.project_id) ?? { available: 0, underConstruction: 0 };
        if (lot.status === "Available") entry.available++;
        if (lot.status === "Under Construction") entry.underConstruction++;
        lotsByProject.set(lot.project_id, entry);
      }

      const soldByProject = new Map<string, number>();
      for (const d of disps ?? []) {
        if (!d.project_id || d.status !== "Closed") continue;
        soldByProject.set(d.project_id, (soldByProject.get(d.project_id) ?? 0) + 1);
      }

      return (projects ?? []).map((p) => ({
        ...p,
        lots_available: lotsByProject.get(p.id)?.available ?? 0,
        lots_under_construction: lotsByProject.get(p.id)?.underConstruction ?? 0,
        lots_sold: soldByProject.get(p.id) ?? 0,
      }));
    },
  });

  const data = useMemo(() => {
    if (statusFilter === "all") return rawProjects;
    return rawProjects.filter((p) => p.status === statusFilter);
  }, [rawProjects, statusFilter]);

  const columns: ColumnDef<ProjectRow>[] = [
    {
      accessorKey: "project_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Project" />,
      cell: ({ row }) => <span className="font-medium">{row.original.project_name}</span>,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "project_type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    },
    {
      accessorKey: "entity_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Entity" />,
    },
    {
      accessorKey: "total_lots",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total Lots" />,
      cell: ({ row }) => row.original.total_lots ?? 0,
    },
    {
      accessorKey: "lots_available",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Available" />,
    },
    {
      accessorKey: "lots_under_construction",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Under Const." />,
    },
    {
      accessorKey: "lots_sold",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sold" />,
    },
    {
      accessorKey: "total_budget",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Budget" />,
      cell: ({ row }) => formatCurrency(row.original.total_budget ?? 0),
    },
    {
      accessorKey: "total_spent",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Spent" />,
      cell: ({ row }) => formatCurrency(row.original.total_spent ?? 0),
    },
    {
      accessorKey: "total_revenue",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Revenue" />,
      cell: ({ row }) => formatCurrency(row.original.total_revenue ?? 0),
    },
    {
      accessorKey: "total_profit",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Profit" />,
      cell: ({ row }) => {
        const v = row.original.total_profit ?? 0;
        return <span className={v < 0 ? "text-destructive" : ""}>{formatCurrency(v)}</span>;
      },
    },
  ];

  const statuses = [...new Set(rawProjects.map((p) => p.status))].sort();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Project Summary</h1>
          <p className="text-sm text-muted">Active projects with lot counts, investment, and projected margin.</p>
        </div>
        <button
          type="button"
          onClick={() =>
            exportToCsv("project-summary", [
              { header: "Project", accessor: (r) => r.project_name },
              { header: "Status", accessor: (r) => r.status },
              { header: "Type", accessor: (r) => r.project_type ?? "" },
              { header: "Entity", accessor: (r) => r.entity_name ?? "" },
              { header: "Total Lots", accessor: (r) => r.total_lots ?? 0 },
              { header: "Available", accessor: (r) => r.lots_available },
              { header: "Under Construction", accessor: (r) => r.lots_under_construction },
              { header: "Sold", accessor: (r) => r.lots_sold },
              { header: "Budget", accessor: (r) => r.total_budget ?? 0 },
              { header: "Spent", accessor: (r) => r.total_spent ?? 0 },
              { header: "Revenue", accessor: (r) => r.total_revenue ?? 0 },
              { header: "Profit", accessor: (r) => r.total_profit ?? 0 },
            ], data)
          }
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-card-hover"
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="all">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <DataTable columns={columns} data={data} searchKey="project_name" searchPlaceholder="Search projects..." />

      {!isLoading && data.length > 0 && (
        <div className="mt-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
          <span className="mr-6">Totals:</span>
          <span className="mr-6">Lots: {data.reduce((s, r) => s + (r.total_lots ?? 0), 0)}</span>
          <span className="mr-6">Budget: {formatCurrency(data.reduce((s, r) => s + (r.total_budget ?? 0), 0))}</span>
          <span className="mr-6">Spent: {formatCurrency(data.reduce((s, r) => s + (r.total_spent ?? 0), 0))}</span>
          <span className="mr-6">Revenue: {formatCurrency(data.reduce((s, r) => s + (r.total_revenue ?? 0), 0))}</span>
          <span>Profit: {formatCurrency(data.reduce((s, r) => s + (r.total_profit ?? 0), 0))}</span>
        </div>
      )}
    </div>
  );
}

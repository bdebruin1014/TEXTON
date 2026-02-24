import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { exportToCsv } from "@/lib/export-csv";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reports/lot-inventory")({
  component: LotInventoryReport,
});

interface LotRow {
  id: string;
  lot_number: string;
  status: string;
  project_id: string | null;
  project_name: string;
  job_id: string | null;
  job_name: string;
  floor_plan_name: string | null;
  base_price: number | null;
  lot_premium: number | null;
  disposition_status: string | null;
}

function LotInventoryReport() {
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: projects = [] } = useQuery({
    queryKey: ["report-lot-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, project_name").order("project_name");
      return data ?? [];
    },
  });

  const { data: rawLots = [] } = useQuery({
    queryKey: ["report-lot-inventory"],
    queryFn: async () => {
      const { data: lots, error } = await supabase
        .from("lots")
        .select("id, lot_number, status, project_id, job_id, floor_plan_name, base_price, lot_premium")
        .order("lot_number");
      if (error) throw error;

      // Get project names
      const { data: projs } = await supabase.from("projects").select("id, project_name");
      const projMap = new Map((projs ?? []).map((p) => [p.id, p.project_name]));

      // Get job names
      const { data: jobs } = await supabase.from("jobs").select("id, job_name");
      const jobMap = new Map((jobs ?? []).map((j) => [j.id, j.job_name]));

      // Get disposition statuses by lot
      const { data: disps } = await supabase.from("dispositions").select("lot_id, status");
      const dispMap = new Map<string, string>();
      for (const d of disps ?? []) {
        if (d.lot_id) dispMap.set(d.lot_id, d.status);
      }

      return (lots ?? []).map((lot) => ({
        ...lot,
        project_name: lot.project_id ? (projMap.get(lot.project_id) ?? "") : "",
        job_name: lot.job_id ? (jobMap.get(lot.job_id) ?? "") : "",
        disposition_status: dispMap.get(lot.id) ?? null,
      }));
    },
  });

  const data = useMemo(() => {
    let filtered = rawLots;
    if (projectFilter !== "all") filtered = filtered.filter((l) => l.project_id === projectFilter);
    if (statusFilter !== "all") filtered = filtered.filter((l) => l.status === statusFilter);
    return filtered;
  }, [rawLots, projectFilter, statusFilter]);

  // Status summary
  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lot of data) {
      counts.set(lot.status, (counts.get(lot.status) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  const lotStatuses = [...new Set(rawLots.map((l) => l.status))].sort();

  const columns: ColumnDef<LotRow>[] = [
    {
      accessorKey: "lot_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Lot #" />,
      cell: ({ row }) => <span className="font-medium">{row.original.lot_number}</span>,
    },
    {
      accessorKey: "project_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Project" />,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Lot Status" />,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "floor_plan_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Floor Plan" />,
      cell: ({ row }) => row.original.floor_plan_name ?? "-",
    },
    {
      accessorKey: "job_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Job" />,
      cell: ({ row }) => row.original.job_name || "-",
    },
    {
      accessorKey: "disposition_status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Disp. Status" />,
      cell: ({ row }) =>
        row.original.disposition_status ? (
          <StatusBadge status={row.original.disposition_status} />
        ) : (
          <span className="text-muted">-</span>
        ),
    },
    {
      accessorKey: "base_price",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Base Price" />,
      cell: ({ row }) => (row.original.base_price ? formatCurrency(row.original.base_price) : "-"),
    },
    {
      accessorKey: "lot_premium",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Premium" />,
      cell: ({ row }) => (row.original.lot_premium ? formatCurrency(row.original.lot_premium) : "-"),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-foreground">Lot Inventory</h1>
          <p className="text-sm text-muted">All lots across projects with status, plan, and disposition.</p>
        </div>
        <button
          type="button"
          onClick={() =>
            exportToCsv(
              "lot-inventory",
              [
                { header: "Lot #", accessor: (r) => r.lot_number },
                { header: "Project", accessor: (r) => r.project_name },
                { header: "Status", accessor: (r) => r.status },
                { header: "Floor Plan", accessor: (r) => r.floor_plan_name ?? "" },
                { header: "Job", accessor: (r) => r.job_name },
                { header: "Disp. Status", accessor: (r) => r.disposition_status ?? "" },
                { header: "Base Price", accessor: (r) => r.base_price ?? "" },
                { header: "Premium", accessor: (r) => r.lot_premium ?? "" },
              ],
              data,
            )
          }
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-card-hover"
        >
          Export CSV
        </button>
      </div>

      {/* Status summary chips */}
      {statusCounts.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {statusCounts.map(([status, count]) => (
            <span
              key={status}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground"
            >
              <StatusBadge status={status} /> {count}
            </span>
          ))}
        </div>
      )}

      {/* Filters */}
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
          {lotStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <DataTable columns={columns} data={data} searchKey="lot_number" searchPlaceholder="Search lots..." />
    </div>
  );
}

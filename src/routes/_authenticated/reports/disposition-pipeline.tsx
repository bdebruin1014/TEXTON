import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { exportToCsv } from "@/lib/export-csv";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reports/disposition-pipeline")({
  component: DispositionPipelineReport,
});

interface DispRow {
  id: string;
  project_name: string | null;
  lot_number: string | null;
  buyer_name: string | null;
  status: string;
  contract_price: number | null;
  closing_date: string | null;
  contract_date: string | null;
  days_in_status: number;
  floor_plan: string | null;
}

function DispositionPipelineReport() {
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: projects = [] } = useQuery({
    queryKey: ["report-disp-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, project_name").order("project_name");
      return data ?? [];
    },
  });

  const { data: rawDisps = [] } = useQuery({
    queryKey: ["report-disposition-pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispositions")
        .select(
          "id, project_name, lot_number, buyer_name, status, contract_price, closing_date, contract_date, floor_plan, updated_at",
        )
        .not("status", "in", "(Closed,Cancelled)")
        .order("closing_date", { ascending: true, nullsFirst: false });
      if (error) throw error;

      const now = Date.now();
      return (data ?? []).map((d) => ({
        ...d,
        days_in_status: d.updated_at ? Math.floor((now - new Date(d.updated_at).getTime()) / 86400000) : 0,
      }));
    },
  });

  const data = useMemo(() => {
    let filtered = rawDisps;
    if (projectFilter !== "all") {
      const projName = projects.find((p) => p.id === projectFilter)?.project_name;
      if (projName) filtered = filtered.filter((d) => d.project_name === projName);
    }
    if (statusFilter !== "all") filtered = filtered.filter((d) => d.status === statusFilter);
    return filtered;
  }, [rawDisps, projectFilter, statusFilter, projects]);

  const statuses = [...new Set(rawDisps.map((d) => d.status))].sort();

  const columns: ColumnDef<DispRow>[] = [
    {
      accessorKey: "project_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Project" />,
    },
    {
      accessorKey: "lot_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Lot" />,
    },
    {
      accessorKey: "buyer_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Buyer" />,
      cell: ({ row }) => row.original.buyer_name || <span className="text-muted">-</span>,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "contract_price",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Contract Price" />,
      cell: ({ row }) => (row.original.contract_price ? formatCurrency(row.original.contract_price) : "-"),
    },
    {
      accessorKey: "floor_plan",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Plan" />,
      cell: ({ row }) => row.original.floor_plan ?? "-",
    },
    {
      accessorKey: "contract_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Contract Date" />,
      cell: ({ row }) => (row.original.contract_date ? formatDate(row.original.contract_date) : "-"),
    },
    {
      accessorKey: "closing_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Expected Close" />,
      cell: ({ row }) => (row.original.closing_date ? formatDate(row.original.closing_date) : "-"),
    },
    {
      accessorKey: "days_in_status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Days in Status" />,
      cell: ({ row }) => {
        const d = row.original.days_in_status;
        const color = d > 30 ? "text-destructive" : d > 14 ? "text-warning" : "";
        return <span className={color}>{d}d</span>;
      },
    },
  ];

  const totalPipeline = data.reduce((s, r) => s + (r.contract_price ?? 0), 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-foreground">Disposition Pipeline</h1>
          <p className="text-sm text-muted">
            Active dispositions sorted by expected close date. Pipeline total: {formatCurrency(totalPipeline)}
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            exportToCsv(
              "disposition-pipeline",
              [
                { header: "Project", accessor: (r) => r.project_name ?? "" },
                { header: "Lot", accessor: (r) => r.lot_number ?? "" },
                { header: "Buyer", accessor: (r) => r.buyer_name ?? "" },
                { header: "Status", accessor: (r) => r.status },
                { header: "Contract Price", accessor: (r) => r.contract_price ?? "" },
                { header: "Plan", accessor: (r) => r.floor_plan ?? "" },
                { header: "Contract Date", accessor: (r) => r.contract_date ?? "" },
                { header: "Expected Close", accessor: (r) => r.closing_date ?? "" },
                { header: "Days in Status", accessor: (r) => r.days_in_status },
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

      <DataTable columns={columns} data={data} searchKey="buyer_name" searchPlaceholder="Search buyers..." />
    </div>
  );
}

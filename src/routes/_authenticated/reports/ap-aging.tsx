import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { exportToCsv } from "@/lib/export-csv";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reports/ap-aging")({
  component: ApAgingReport,
});

interface ApAgingRow {
  vendor_name: string;
  current: number;
  days_31_60: number;
  days_61_90: number;
  days_91_plus: number;
  total: number;
}

function ApAgingReport() {
  const [entityFilter, setEntityFilter] = useState<string>("all");

  const { data: entities = [] } = useQuery({
    queryKey: ["report-ap-aging-entities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("entities").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: rawInvoices = [], isLoading } = useQuery({
    queryKey: ["report-ap-aging"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("vendor_name, amount, invoice_date, entity_id, status")
        .neq("status", "Paid");
      if (error) throw error;
      return data ?? [];
    },
  });

  const data = useMemo(() => {
    const filtered = entityFilter === "all" ? rawInvoices : rawInvoices.filter((inv) => inv.entity_id === entityFilter);

    const buckets = new Map<string, ApAgingRow>();
    const now = Date.now();

    for (const inv of filtered) {
      const days = Math.floor((now - new Date(inv.invoice_date).getTime()) / 86400000);
      const name = inv.vendor_name ?? "Unknown Vendor";
      const entry = buckets.get(name) ?? {
        vendor_name: name,
        current: 0,
        days_31_60: 0,
        days_61_90: 0,
        days_91_plus: 0,
        total: 0,
      };
      const amt = inv.amount ?? 0;

      if (days <= 30) entry.current += amt;
      else if (days <= 60) entry.days_31_60 += amt;
      else if (days <= 90) entry.days_61_90 += amt;
      else entry.days_91_plus += amt;

      entry.total += amt;
      buckets.set(name, entry);
    }

    return [...buckets.values()].sort((a, b) => a.vendor_name.localeCompare(b.vendor_name));
  }, [rawInvoices, entityFilter]);

  const columns: ColumnDef<ApAgingRow>[] = [
    {
      accessorKey: "vendor_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vendor" />,
      cell: ({ row }) => <span className="font-medium">{row.original.vendor_name}</span>,
    },
    {
      accessorKey: "current",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Current (0-30)" />,
      cell: ({ row }) => formatCurrency(row.original.current),
    },
    {
      accessorKey: "days_31_60",
      header: ({ column }) => <DataTableColumnHeader column={column} title="31-60 Days" />,
      cell: ({ row }) => formatCurrency(row.original.days_31_60),
    },
    {
      accessorKey: "days_61_90",
      header: ({ column }) => <DataTableColumnHeader column={column} title="61-90 Days" />,
      cell: ({ row }) => formatCurrency(row.original.days_61_90),
    },
    {
      accessorKey: "days_91_plus",
      header: ({ column }) => <DataTableColumnHeader column={column} title="91+ Days" />,
      cell: ({ row }) => {
        const v = row.original.days_91_plus;
        return <span className={v > 0 ? "text-destructive" : ""}>{formatCurrency(v)}</span>;
      },
    },
    {
      accessorKey: "total",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
      cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.total)}</span>,
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-foreground">AP Aging</h1>
          <p className="text-sm text-muted">Outstanding payables by vendor grouped into aging buckets.</p>
        </div>
        <button
          type="button"
          onClick={() =>
            exportToCsv(
              "ap-aging",
              [
                { header: "Vendor", accessor: (r) => r.vendor_name },
                { header: "Current (0-30)", accessor: (r) => r.current },
                { header: "31-60 Days", accessor: (r) => r.days_31_60 },
                { header: "61-90 Days", accessor: (r) => r.days_61_90 },
                { header: "91+ Days", accessor: (r) => r.days_91_plus },
                { header: "Total", accessor: (r) => r.total },
              ],
              data,
            )
          }
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-card-hover"
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="all">All Entities</option>
          {entities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      <DataTable columns={columns} data={data} searchKey="vendor_name" searchPlaceholder="Search vendors..." />

      {!isLoading && data.length > 0 && (
        <div className="mt-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
          <span className="mr-6">Totals:</span>
          <span className="mr-6">Current: {formatCurrency(data.reduce((s, r) => s + r.current, 0))}</span>
          <span className="mr-6">31-60: {formatCurrency(data.reduce((s, r) => s + r.days_31_60, 0))}</span>
          <span className="mr-6">61-90: {formatCurrency(data.reduce((s, r) => s + r.days_61_90, 0))}</span>
          <span className="mr-6">91+: {formatCurrency(data.reduce((s, r) => s + r.days_91_plus, 0))}</span>
          <span>Total: {formatCurrency(data.reduce((s, r) => s + r.total, 0))}</span>
        </div>
      )}
    </div>
  );
}

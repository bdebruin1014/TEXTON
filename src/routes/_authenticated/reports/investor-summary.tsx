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

export const Route = createFileRoute("/_authenticated/reports/investor-summary")({
  component: InvestorSummaryReport,
});

interface InvestorRow {
  investor_name: string;
  fund_name: string;
  fund_id: string;
  status: string;
  commitment_amount: number;
  called_amount: number;
  distributed_amount: number;
  unreturned_capital: number;
  ownership_pct: number | null;
  preferred_return_rate: number | null;
}

function InvestorSummaryReport() {
  const [fundFilter, setFundFilter] = useState<string>("all");

  const { data: rawInvestors = [], isLoading } = useQuery({
    queryKey: ["report-investor-summary"],
    queryFn: async () => {
      const { data: funds, error: fundsError } = await supabase
        .from("funds")
        .select("id, name, entity_id, preferred_return, status")
        .order("name");
      if (fundsError) throw fundsError;

      const { data: investments, error: investmentsError } = await supabase
        .from("investments")
        .select(
          "id, fund_id, investor_name, commitment_amount, called_amount, distributed_amount, ownership_pct, status",
        );
      if (investmentsError) throw investmentsError;

      const fundMap = new Map<string, { name: string; preferred_return: number | null }>();
      for (const f of funds ?? []) {
        fundMap.set(f.id, { name: f.name, preferred_return: f.preferred_return });
      }

      return (investments ?? []).map((inv) => {
        const fund = fundMap.get(inv.fund_id);
        const called = inv.called_amount ?? 0;
        const distributed = inv.distributed_amount ?? 0;
        return {
          investor_name: inv.investor_name,
          fund_name: fund?.name ?? "Unknown",
          fund_id: inv.fund_id,
          status: inv.status ?? "Active",
          commitment_amount: inv.commitment_amount ?? 0,
          called_amount: called,
          distributed_amount: distributed,
          unreturned_capital: Math.max(0, called - distributed),
          ownership_pct: inv.ownership_pct ?? null,
          preferred_return_rate: fund?.preferred_return ?? null,
        } satisfies InvestorRow;
      });
    },
  });

  const data = useMemo(() => {
    if (fundFilter === "all") return rawInvestors;
    return rawInvestors.filter((r) => r.fund_id === fundFilter);
  }, [rawInvestors, fundFilter]);

  const funds = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rawInvestors) {
      if (!seen.has(r.fund_id)) seen.set(r.fund_id, r.fund_name);
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rawInvestors]);

  const columns: ColumnDef<InvestorRow>[] = [
    {
      accessorKey: "investor_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Investor" />,
      cell: ({ row }) => <span className="font-medium">{row.original.investor_name}</span>,
    },
    {
      accessorKey: "fund_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fund Name" />,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "commitment_amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Commitment" />,
      cell: ({ row }) => formatCurrency(row.original.commitment_amount),
    },
    {
      accessorKey: "called_amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Called" />,
      cell: ({ row }) => formatCurrency(row.original.called_amount),
    },
    {
      accessorKey: "distributed_amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Distributed" />,
      cell: ({ row }) => formatCurrency(row.original.distributed_amount),
    },
    {
      accessorKey: "unreturned_capital",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Unreturned Capital" />,
      cell: ({ row }) => {
        const v = row.original.unreturned_capital;
        return <span className={v > 0 ? "text-destructive" : ""}>{formatCurrency(v)}</span>;
      },
    },
    {
      accessorKey: "ownership_pct",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ownership %" />,
      cell: ({ row }) => {
        const v = row.original.ownership_pct;
        return v != null ? `${v.toFixed(1)}%` : "—";
      },
    },
    {
      accessorKey: "preferred_return_rate",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Pref Return" />,
      cell: ({ row }) => {
        const v = row.original.preferred_return_rate;
        return v != null ? `${v.toFixed(1)}%` : "—";
      },
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-foreground">Investor Summary</h1>
          <p className="text-sm text-muted">
            Capital commitments, calls, distributions, and unreturned capital by investor.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            exportToCsv(
              "investor-summary",
              [
                { header: "Investor", accessor: (r) => r.investor_name },
                { header: "Fund Name", accessor: (r) => r.fund_name },
                { header: "Status", accessor: (r) => r.status },
                { header: "Commitment", accessor: (r) => r.commitment_amount },
                { header: "Called", accessor: (r) => r.called_amount },
                { header: "Distributed", accessor: (r) => r.distributed_amount },
                { header: "Unreturned Capital", accessor: (r) => r.unreturned_capital },
                { header: "Ownership %", accessor: (r) => r.ownership_pct ?? "" },
                { header: "Pref Return", accessor: (r) => r.preferred_return_rate ?? "" },
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
          value={fundFilter}
          onChange={(e) => setFundFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="all">All Funds</option>
          {funds.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <DataTable columns={columns} data={data} searchKey="investor_name" searchPlaceholder="Search investors..." />

      {!isLoading && data.length > 0 && (
        <div className="mt-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
          <span className="mr-6">Totals:</span>
          <span className="mr-6">Commitment: {formatCurrency(data.reduce((s, r) => s + r.commitment_amount, 0))}</span>
          <span className="mr-6">Called: {formatCurrency(data.reduce((s, r) => s + r.called_amount, 0))}</span>
          <span className="mr-6">
            Distributed: {formatCurrency(data.reduce((s, r) => s + r.distributed_amount, 0))}
          </span>
          <span>Unreturned: {formatCurrency(data.reduce((s, r) => s + r.unreturned_capital, 0))}</span>
        </div>
      )}
    </div>
  );
}

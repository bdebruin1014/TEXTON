import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { type ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { exportToCsv } from "@/lib/export-csv";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reports/trial-balance")({
  component: TrialBalanceReport,
});

interface TrialBalanceRow {
  account_number: string;
  account_name: string;
  account_type: string;
  debit: number;
  credit: number;
  balance: number;
}

function TrialBalanceReport() {
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");

  const { data: entities = [] } = useQuery({
    queryKey: ["report-trial-balance-entities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entities")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: allPeriods = [] } = useQuery({
    queryKey: ["report-trial-balance-periods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fiscal_periods")
        .select("id, period_name, start_date, end_date, entity_id, fiscal_year")
        .order("fiscal_year", { ascending: false })
        .order("period_number", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const periods = useMemo(() => {
    if (entityFilter === "all") return allPeriods;
    return allPeriods.filter((p) => p.entity_id === entityFilter);
  }, [allPeriods, entityFilter]);

  const { data: rawRows = [], isLoading } = useQuery({
    queryKey: ["report-trial-balance", entityFilter, periodFilter],
    queryFn: async () => {
      // Fetch chart of accounts
      let accountsQuery = supabase
        .from("chart_of_accounts")
        .select("id, account_number, account_name, account_type, normal_balance, entity_id")
        .eq("is_active", true)
        .order("account_number");
      if (entityFilter !== "all") {
        accountsQuery = accountsQuery.eq("entity_id", entityFilter);
      }
      const { data: accounts, error: accErr } = await accountsQuery;
      if (accErr) throw accErr;

      // Fetch journal entry lines
      let linesQuery = supabase
        .from("journal_entry_lines")
        .select("account_id, debit, credit, entity_id, transaction_date");
      if (entityFilter !== "all") {
        linesQuery = linesQuery.eq("entity_id", entityFilter);
      }
      const { data: lines, error: lineErr } = await linesQuery;
      if (lineErr) throw lineErr;

      // Find selected period for date filtering
      const selectedPeriod = periodFilter !== "all"
        ? allPeriods.find((p) => p.id === periodFilter)
        : null;

      // Filter lines by period date range
      const filteredLines = (lines ?? []).filter((line) => {
        if (!selectedPeriod) return true;
        if (!line.transaction_date) return false;
        return line.transaction_date >= selectedPeriod.start_date && line.transaction_date <= selectedPeriod.end_date;
      });

      // Group lines by account_id
      const linesByAccount = new Map<string, { debit: number; credit: number }>();
      for (const line of filteredLines) {
        if (!line.account_id) continue;
        const entry = linesByAccount.get(line.account_id) ?? { debit: 0, credit: 0 };
        entry.debit += line.debit ?? 0;
        entry.credit += line.credit ?? 0;
        linesByAccount.set(line.account_id, entry);
      }

      // Build rows
      const rows: TrialBalanceRow[] = [];
      for (const acct of accounts ?? []) {
        const totals = linesByAccount.get(acct.id) ?? { debit: 0, credit: 0 };
        const balance = acct.normal_balance === "debit"
          ? totals.debit - totals.credit
          : totals.credit - totals.debit;

        // Only include accounts with non-zero activity or balance
        if (totals.debit === 0 && totals.credit === 0 && balance === 0) continue;

        rows.push({
          account_number: acct.account_number,
          account_name: acct.account_name,
          account_type: acct.account_type,
          debit: totals.debit,
          credit: totals.credit,
          balance,
        });
      }

      return rows;
    },
  });

  const data = rawRows;

  const columns: ColumnDef<TrialBalanceRow>[] = [
    {
      accessorKey: "account_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Account #" />,
      cell: ({ row }) => <span className="font-mono">{row.original.account_number}</span>,
    },
    {
      accessorKey: "account_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Account Name" />,
      cell: ({ row }) => <span className="font-medium">{row.original.account_name}</span>,
    },
    {
      accessorKey: "account_type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    },
    {
      accessorKey: "debit",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Debits" />,
      cell: ({ row }) => formatCurrency(row.original.debit),
    },
    {
      accessorKey: "credit",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Credits" />,
      cell: ({ row }) => formatCurrency(row.original.credit),
    },
    {
      accessorKey: "balance",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Balance" />,
      cell: ({ row }) => {
        const v = row.original.balance;
        return <span className={v < 0 ? "text-destructive" : ""}>{formatCurrency(v)}</span>;
      },
    },
  ];

  const totalDebits = data.reduce((s, r) => s + r.debit, 0);
  const totalCredits = data.reduce((s, r) => s + r.credit, 0);
  const netBalance = data.reduce((s, r) => s + r.balance, 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Trial Balance</h1>
          <p className="text-sm text-muted">Account balances with total debits, credits, and net balance by period.</p>
        </div>
        <button
          type="button"
          onClick={() =>
            exportToCsv("trial-balance", [
              { header: "Account #", accessor: (r) => r.account_number },
              { header: "Account Name", accessor: (r) => r.account_name },
              { header: "Type", accessor: (r) => r.account_type },
              { header: "Debits", accessor: (r) => r.debit },
              { header: "Credits", accessor: (r) => r.credit },
              { header: "Balance", accessor: (r) => r.balance },
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
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value);
            setPeriodFilter("all");
          }}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="all">All Entities</option>
          {entities.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="all">All Periods</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>{p.period_name}</option>
          ))}
        </select>
      </div>

      <DataTable columns={columns} data={data} searchKey="account_name" searchPlaceholder="Search accounts..." />

      {!isLoading && data.length > 0 && (
        <div className="mt-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
          <span className="mr-6">Totals:</span>
          <span className="mr-6">Debits: {formatCurrency(totalDebits)}</span>
          <span className="mr-6">Credits: {formatCurrency(totalCredits)}</span>
          <span className={netBalance < 0 ? "text-destructive" : ""}>Net Balance: {formatCurrency(netBalance)}</span>
        </div>
      )}
    </div>
  );
}

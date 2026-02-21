import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import {
  FilterClickList,
  FilterSection,
  FilterToggleGroup,
  RightFilterPanel,
} from "@/components/layout/RightFilterPanel";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/accounting/$entityId/register")({
  component: EntityRegister,
});

interface Transaction {
  id: string;
  journal_entry_id: string | null;
  transaction_date: string;
  reference: string | null;
  description: string | null;
  debit: number | null;
  credit: number | null;
  running_balance: number | null;
  account_name: string | null;
  account_number: string | null;
  type: string | null;
  payee: string | null;
  instrument: string | null;
  receipt_number: string | null;
  project_name: string | null;
  entity_name: string | null;
  is_void: boolean | null;
  is_reconciled: boolean | null;
  is_cleared: boolean | null;
}

interface Filters {
  search: string;
  dateStart: string;
  dateEnd: string;
  statementType: string;
  debitCredit: string;
  checkWire: string;
  voidStatus: string;
  reconciledStatus: string;
  clearedStatus: string;
}

const defaultFilters: Filters = {
  search: "",
  dateStart: "",
  dateEnd: "",
  statementType: "Full Ledger",
  debitCredit: "All",
  checkWire: "All",
  voidStatus: "Non Void",
  reconciledStatus: "All",
  clearedStatus: "All",
};

const columns: ColumnDef<Transaction, unknown>[] = [
  {
    accessorKey: "transaction_date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Post Date" />,
    cell: ({ row }) => <span className="text-xs font-medium">{formatDate(row.getValue("transaction_date"))}</span>,
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => <span className="text-xs text-muted">{row.getValue("type") ?? "JE"}</span>,
  },
  {
    accessorKey: "payee",
    header: "To/From",
    cell: ({ row }) => <span className="text-xs">{row.getValue("payee") ?? row.original.description ?? "\u2014"}</span>,
  },
  {
    accessorKey: "instrument",
    header: "Instrument",
    cell: ({ row }) => <span className="font-mono text-xs text-muted">{row.getValue("instrument") ?? "\u2014"}</span>,
  },
  {
    accessorKey: "receipt_number",
    header: "Receipt #",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted">{row.getValue("receipt_number") ?? "\u2014"}</span>
    ),
  },
  {
    accessorKey: "project_name",
    header: "Project",
    cell: ({ row }) => <span className="text-xs text-muted">{row.getValue("project_name") ?? "\u2014"}</span>,
  },
  {
    accessorKey: "entity_name",
    header: "Entity",
    cell: ({ row }) => <span className="text-xs text-muted">{row.getValue("entity_name") ?? "\u2014"}</span>,
  },
  {
    accessorKey: "credit",
    header: "Credit",
    cell: ({ row }) => {
      const val = row.getValue("credit") as number | null;
      return val ? (
        <span className="text-xs font-medium" style={{ color: "var(--color-success)" }}>
          {formatCurrency(val)}
        </span>
      ) : (
        ""
      );
    },
  },
  {
    accessorKey: "debit",
    header: "Debit",
    cell: ({ row }) => {
      const val = row.getValue("debit") as number | null;
      return val ? (
        <span className="text-xs font-medium" style={{ color: "var(--color-destructive)" }}>
          {formatCurrency(val)}
        </span>
      ) : (
        ""
      );
    },
  },
];

function EntityRegister() {
  const { entityId } = Route.useParams();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [activeTab, setActiveTab] = useState<"filter" | "daily-recs">("filter");

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Fetch entity name for display
  const { data: entity } = useQuery({
    queryKey: ["entity", entityId],
    queryFn: async () => {
      const { data, error } = await supabase.from("entities").select("id, name").eq("id", entityId).single();
      if (error) return null;
      return data;
    },
  });

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["register", entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select(
          "id, journal_entry_id, transaction_date, reference, description, debit, credit, running_balance, account_name, account_number",
        )
        .eq("entity_id", entityId)
        .order("transaction_date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        type: null,
        payee: null,
        instrument: null,
        receipt_number: null,
        project_name: null,
        entity_name: null,
        is_void: false,
        is_reconciled: false,
        is_cleared: false,
      }));
    },
  });

  // Apply client-side filters
  const filtered = useMemo(() => {
    let result = transactions;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.description?.toLowerCase().includes(q) ||
          t.payee?.toLowerCase().includes(q) ||
          t.reference?.toLowerCase().includes(q) ||
          t.account_name?.toLowerCase().includes(q),
      );
    }

    if (filters.dateStart) {
      result = result.filter((t) => t.transaction_date >= filters.dateStart);
    }
    if (filters.dateEnd) {
      result = result.filter((t) => t.transaction_date <= filters.dateEnd);
    }

    if (filters.debitCredit === "Debits") {
      result = result.filter((t) => (t.debit ?? 0) > 0);
    } else if (filters.debitCredit === "Credits") {
      result = result.filter((t) => (t.credit ?? 0) > 0);
    }

    if (filters.voidStatus === "Non Void") {
      result = result.filter((t) => !t.is_void);
    } else if (filters.voidStatus === "Void") {
      result = result.filter((t) => t.is_void);
    }

    if (filters.reconciledStatus === "Reconciled") {
      result = result.filter((t) => t.is_reconciled);
    } else if (filters.reconciledStatus === "Unreconciled") {
      result = result.filter((t) => !t.is_reconciled);
    }

    if (filters.clearedStatus === "Cleared") {
      result = result.filter((t) => t.is_cleared);
    } else if (filters.clearedStatus === "Uncleared") {
      result = result.filter((t) => !t.is_cleared);
    }

    return result;
  }, [transactions, filters]);

  // Compute balance
  const accountBalance = useMemo(() => {
    return transactions.reduce((sum, t) => sum + (t.credit ?? 0) - (t.debit ?? 0), 0);
  }, [transactions]);

  const entityName = entity?.name ?? "Entity";

  return (
    <>
      <div>
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Register</h1>
            <p className="mt-0.5 text-xs text-muted">
              Showing {filters.voidStatus === "Non Void" ? "non-void" : filters.voidStatus === "Void" ? "void" : "all"}{" "}
              transactions for {entityName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-card-hover"
            >
              Finish Daily Reconciliation
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-button-hover"
            >
              + Add Transaction
            </button>
          </div>
        </div>

        {/* Balance card */}
        <div
          className="mb-5 rounded-lg border border-border bg-card px-5 py-4"
          style={{ borderLeft: "4px solid var(--color-primary)" }}
        >
          <span className="text-2xl font-bold text-foreground">{formatCurrency(accountBalance)}</span>
          <p
            className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Account Balance
          </p>
        </div>

        {/* Table */}
        {isLoading ? (
          <FormSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No transactions"
            description="Create journal entries to see transactions in the register"
          />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            searchKey="description"
            searchPlaceholder="Search transactions..."
          />
        )}
      </div>

      {/* Right filter panel */}
      <RightFilterPanel>
        {/* Tab bar */}
        <div className="flex" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <button
            type="button"
            onClick={() => setActiveTab("filter")}
            className="flex-1 px-3 py-2.5 text-xs font-medium transition-colors"
            style={{
              color: activeTab === "filter" ? "var(--color-primary)" : "var(--color-text-secondary)",
              borderBottom: activeTab === "filter" ? "2px solid var(--color-primary)" : "2px solid transparent",
            }}
          >
            Filter
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("daily-recs")}
            className="flex-1 px-3 py-2.5 text-xs font-medium transition-colors"
            style={{
              color: activeTab === "daily-recs" ? "var(--color-primary)" : "var(--color-text-secondary)",
              borderBottom: activeTab === "daily-recs" ? "2px solid var(--color-primary)" : "2px solid transparent",
            }}
          >
            Daily Recs.
          </button>
        </div>

        {activeTab === "filter" ? (
          <>
            {/* Search */}
            <FilterSection label="Query">
              <input
                type="text"
                placeholder="Search register..."
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none placeholder:text-muted transition-colors focus:border-primary"
              />
            </FilterSection>

            {/* Date Range */}
            <FilterSection label="Date Range">
              <div className="space-y-1.5">
                <input
                  type="date"
                  value={filters.dateStart}
                  onChange={(e) => updateFilter("dateStart", e.target.value)}
                  className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                />
                <input
                  type="date"
                  value={filters.dateEnd}
                  onChange={(e) => updateFilter("dateEnd", e.target.value)}
                  className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
            </FilterSection>

            {/* Statement Type */}
            <FilterSection label="Statement Type">
              <FilterClickList
                options={["Full Ledger", "Bank Charge", "Miscellaneous", "Opening Balance", "Research"]}
                value={filters.statementType}
                onChange={(v) => updateFilter("statementType", v)}
              />
            </FilterSection>

            {/* Debits/Credits */}
            <FilterSection label="Debits / Credits">
              <FilterToggleGroup
                options={["All", "Debits", "Credits"]}
                value={filters.debitCredit}
                onChange={(v) => updateFilter("debitCredit", v)}
              />
            </FilterSection>

            {/* Checks/Wires */}
            <FilterSection label="Checks / Wires">
              <FilterToggleGroup
                options={["All", "Check", "Wire"]}
                value={filters.checkWire}
                onChange={(v) => updateFilter("checkWire", v)}
              />
            </FilterSection>

            {/* Void Status */}
            <FilterSection label="Void Status">
              <FilterToggleGroup
                options={["All", "Non Void", "Void"]}
                value={filters.voidStatus}
                onChange={(v) => updateFilter("voidStatus", v)}
              />
            </FilterSection>

            {/* Reconciled Status */}
            <FilterSection label="Reconciled Status">
              <FilterToggleGroup
                options={["All", "Reconciled", "Unreconciled"]}
                value={filters.reconciledStatus}
                onChange={(v) => updateFilter("reconciledStatus", v)}
              />
            </FilterSection>

            {/* Cleared Status */}
            <FilterSection label="Cleared Status">
              <FilterToggleGroup
                options={["All", "Cleared", "Uncleared"]}
                value={filters.clearedStatus}
                onChange={(v) => updateFilter("clearedStatus", v)}
              />
            </FilterSection>
          </>
        ) : (
          <div className="p-3">
            <p className="text-center text-xs text-muted">Daily reconciliation controls will appear here</p>
          </div>
        )}
      </RightFilterPanel>
    </>
  );
}

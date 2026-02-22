import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { CreateRecordModal } from "@/components/shared/CreateRecordModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/accounting/banking")({
  component: Banking,
});

interface BankAccount {
  id: string;
  account_name: string;
  account_number: string | null;
  bank_name: string | null;
  routing_number: string | null;
  account_type: string | null;
  current_balance: number | null;
  status: string;
  entity_id: string | null;
}

interface BankTransaction {
  id: string;
  bank_account_id: string;
  transaction_date: string;
  description: string | null;
  reference: string | null;
  amount: number;
  transaction_type: string | null;
  payee: string | null;
  is_matched: boolean;
  import_batch: string | null;
}

function Banking() {
  const queryClient = useQueryClient();
  const activeEntityId = useEntityStore((s) => s.activeEntityId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const { data: accounts = [], isLoading } = useQuery<BankAccount[]>({
    queryKey: ["bank-accounts", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("bank_accounts").select("*").order("account_name");
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: transactions = [] } = useQuery<BankTransaction[]>({
    queryKey: ["bank-transactions", selectedAccountId],
    enabled: !!selectedAccountId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_transactions")
        .select("id, bank_account_id, transaction_date, description, reference, amount, transaction_type, payee, is_matched, import_batch")
        .eq("bank_account_id", selectedAccountId as string)
        .order("transaction_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const addAccount = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { error } = await supabase.from("bank_accounts").insert({
        account_name: values.account_name,
        bank_name: values.bank_name || null,
        account_number: values.account_number || null,
        routing_number: values.routing_number || null,
        account_type: values.account_type || null,
        status: "Active",
        entity_id: activeEntityId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts", activeEntityId] });
      toast.success("Bank account added");
      setShowModal(false);
    },
    onError: () => toast.error("Failed to add bank account"),
  });

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAccountId) {
      if (!selectedAccountId) toast.error("Select a bank account first (click a row)");
      e.target.value = "";
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        toast.error("CSV file is empty or has no data rows");
        return;
      }

      // Parse CSV header
      const headerLine = lines[0]!;
      const headers = headerLine.split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
      const dateIdx = headers.findIndex((h) => h.includes("date"));
      const descIdx = headers.findIndex((h) => h.includes("description") || h.includes("memo"));
      const amountIdx = headers.findIndex((h) => h === "amount");
      const refIdx = headers.findIndex((h) => h.includes("reference") || h.includes("ref") || h.includes("check"));
      const payeeIdx = headers.findIndex((h) => h.includes("payee") || h.includes("name"));

      if (dateIdx === -1 || amountIdx === -1) {
        toast.error("CSV must have 'date' and 'amount' columns");
        return;
      }

      const batchId = `import-${Date.now()}`;
      const rows = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i]!.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
        const rawDate = cols[dateIdx];
        const rawAmount = cols[amountIdx];
        if (!rawDate || !rawAmount) continue;

        const amount = Number(rawAmount.replace(/[,$]/g, ""));
        if (Number.isNaN(amount)) continue;

        // Parse date: try ISO first, then MM/DD/YYYY
        let parsedDate = rawDate;
        if (rawDate.includes("/")) {
          const parts = rawDate.split("/");
          if (parts.length === 3) {
            const m = parts[0]!;
            const d = parts[1]!;
            const y = parts[2]!;
            const year = y.length === 2 ? `20${y}` : y;
            parsedDate = `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
          }
        }

        rows.push({
          bank_account_id: selectedAccountId,
          entity_id: activeEntityId,
          transaction_date: parsedDate,
          description: descIdx >= 0 ? cols[descIdx] || null : null,
          amount: Math.abs(amount),
          transaction_type: amount < 0 ? "Debit" : ("Credit" as "Debit" | "Credit"),
          reference: refIdx >= 0 ? cols[refIdx] || null : null,
          payee: payeeIdx >= 0 ? cols[payeeIdx] || null : null,
          import_batch: batchId,
          import_source: file.name,
        });
      }

      if (rows.length === 0) {
        toast.error("No valid rows found in CSV");
        return;
      }

      const { error } = await supabase.from("bank_transactions").insert(rows);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["bank-transactions", selectedAccountId] });
      toast.success(`Imported ${rows.length} transactions`);
    } catch (err) {
      toast.error("Import failed");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const totalBalance = accounts.reduce((sum, a) => sum + (a.current_balance ?? 0), 0);

  const accountColumns: ColumnDef<BankAccount, unknown>[] = [
    {
      accessorKey: "account_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Account Name" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("account_name")}</span>,
    },
    {
      accessorKey: "bank_name",
      header: "Bank",
      cell: ({ row }) => <span className="text-muted">{row.getValue("bank_name") ?? "—"}</span>,
    },
    {
      accessorKey: "account_number",
      header: "Account #",
      cell: ({ row }) => {
        const val = row.getValue("account_number") as string | null;
        return val ? <span className="font-mono text-xs">••••{val.slice(-4)}</span> : "—";
      },
    },
    {
      accessorKey: "account_type",
      header: "Type",
      cell: ({ row }) => <span className="text-xs text-muted">{row.getValue("account_type") ?? "—"}</span>,
    },
    {
      accessorKey: "current_balance",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Balance" />,
      cell: ({ row }) => {
        const val = row.getValue("current_balance") as number | null;
        return val != null ? <span className="font-medium">{formatCurrency(val)}</span> : "—";
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
  ];

  const txnColumns: ColumnDef<BankTransaction, unknown>[] = [
    {
      accessorKey: "transaction_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => <span className="text-xs">{formatDate(row.getValue("transaction_date"))}</span>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="text-sm">{row.getValue("description") ?? "—"}</span>,
    },
    {
      accessorKey: "payee",
      header: "Payee",
      cell: ({ row }) => <span className="text-xs text-muted">{row.getValue("payee") ?? "—"}</span>,
    },
    {
      accessorKey: "transaction_type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("transaction_type") as string | null;
        return (
          <span className={`text-xs font-medium ${type === "Credit" ? "text-success" : "text-destructive"}`}>
            {type ?? "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => <span className="font-medium">{formatCurrency(row.getValue("amount") as number)}</span>,
    },
    {
      accessorKey: "reference",
      header: "Ref",
      cell: ({ row }) => <span className="font-mono text-xs text-muted">{row.getValue("reference") ?? "—"}</span>,
    },
    {
      accessorKey: "is_matched",
      header: "Matched",
      cell: ({ row }) =>
        row.getValue("is_matched") ? (
          <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success-text">Matched</span>
        ) : (
          <span className="rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning-text">Unmatched</span>
        ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Bank Accounts</h1>
          <p className="mt-0.5 text-sm text-muted">
            {accounts.length} accounts · Total: {formatCurrency(totalBalance)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-hover disabled:opacity-50"
          >
            {importing ? (
              <div className="h-3 w-3 animate-spin rounded-full border border-foreground border-t-transparent" />
            ) : null}
            Import Transactions
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
          >
            + Add Bank Account
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : accounts.length === 0 ? (
        <EmptyState title="No bank accounts" description="Add bank accounts to track balances and transactions" />
      ) : (
        <>
          <DataTable
            columns={accountColumns}
            data={accounts}
            searchKey="account_name"
            searchPlaceholder="Search accounts..."
            onRowClick={(row) => setSelectedAccountId(selectedAccountId === row.id ? null : row.id)}
          />

          {selectedAccountId && (
            <div className="mt-4 rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Transactions for {accounts.find((a) => a.id === selectedAccountId)?.account_name}
                </h3>
                <span className="text-xs text-muted">{transactions.length} transactions</span>
              </div>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted">
                  No transactions — use "Import Transactions" to load a CSV file.
                </p>
              ) : (
                <DataTable
                  columns={txnColumns}
                  data={transactions}
                  searchKey="description"
                  searchPlaceholder="Search transactions..."
                />
              )}
            </div>
          )}
        </>
      )}

      <CreateRecordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Bank Account"
        fields={[
          { name: "account_name", label: "Account name", type: "text", required: true, placeholder: "Account name" },
          { name: "bank_name", label: "Bank name", type: "text", placeholder: "Bank name" },
          { name: "account_number", label: "Account number", type: "text", placeholder: "Account number" },
          { name: "routing_number", label: "Routing number", type: "text", placeholder: "Routing number" },
          {
            name: "account_type",
            label: "Account type",
            type: "select",
            placeholder: "Account type",
            options: ["Checking", "Savings", "Money Market", "Trust"],
          },
        ]}
        onSubmit={async (values) => {
          await addAccount.mutateAsync(values);
        }}
        loading={addAccount.isPending}
      />
    </div>
  );
}

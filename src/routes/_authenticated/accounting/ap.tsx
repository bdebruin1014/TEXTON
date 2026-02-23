import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
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

export const Route = createFileRoute("/_authenticated/accounting/ap")({
  component: AccountsPayable,
});

interface Bill {
  id: string;
  bill_number: string | null;
  vendor_name: string | null;
  bill_date: string | null;
  due_date: string | null;
  amount: number | null;
  paid_amount: number | null;
  status: string;
  description: string | null;
  job_name: string | null;
  cost_code: string | null;
  approval_level: string | null;
  po_id: string | null;
  project_id: string | null;
}

interface BillLine {
  id: string;
  bill_id: string;
  line_number: number;
  description: string | null;
  account_id: string | null;
  account_name: string | null;
  account_number: string | null;
  cost_code: string | null;
  job_id: string | null;
  job_name: string | null;
  amount: number;
}

interface COAAccount {
  id: string;
  account_number: string;
  account_name: string;
}

interface Job {
  id: string;
  job_name: string | null;
}

function getApprovalLevel(amount: number): string {
  if (amount < 5000) return "Auto";
  if (amount < 25000) return "PM";
  if (amount < 50000) return "Director";
  return "Executive";
}

const APPROVAL_COLORS: Record<string, string> = {
  Auto: "text-success-text bg-success-bg",
  PM: "text-info-text bg-info-bg",
  Director: "text-warning-text bg-warning-bg",
  Executive: "text-destructive-text bg-destructive-bg",
};

function AccountsPayable() {
  const queryClient = useQueryClient();
  const activeEntityId = useEntityStore((s) => s.activeEntityId);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [expandedBill, setExpandedBill] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState<string | null>(null);

  const { data: bills = [], isLoading } = useQuery<Bill[]>({
    queryKey: ["ap-bills", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("bills").select("*").order("due_date", { ascending: true });
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: billLines = [] } = useQuery<BillLine[]>({
    queryKey: ["bill-lines", expandedBill],
    enabled: !!expandedBill,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bill_lines")
        .select("id, bill_id, line_number, description, account_id, account_name, account_number, cost_code, job_id, job_name, amount")
        .eq("bill_id", expandedBill as string)
        .order("line_number");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: coaAccounts = [] } = useQuery<COAAccount[]>({
    queryKey: ["coa-accounts", activeEntityId],
    queryFn: async () => {
      let query = supabase
        .from("chart_of_accounts")
        .select("id, account_number, account_name")
        .eq("is_active", true)
        .order("account_number");
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["jobs-list", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("jobs").select("id, job_name").order("job_name");
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const addBill = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const count = bills.length + 1;
      const today = new Date().toISOString().split("T")[0];
      const amount = values.amount ? Number(values.amount) : 0;
      const { error } = await supabase.from("bills").insert({
        bill_number: `BILL-${String(count).padStart(4, "0")}`,
        bill_date: today,
        status: "Pending",
        entity_id: activeEntityId,
        vendor_name: values.vendor_name || null,
        description: values.description || null,
        amount: amount || null,
        due_date: values.due_date || null,
        approval_level: amount ? getApprovalLevel(amount) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-bills", activeEntityId] });
      toast.success("Bill created");
      setShowModal(false);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to create bill"),
  });

  const bulkAction = useMutation({
    mutationFn: async (status: string) => {
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from("bills").update({ status }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["ap-bills", activeEntityId] });
    },
  });

  const addBillLine = useMutation({
    mutationFn: async (billId: string) => {
      const nextLine = billLines.length + 1;
      const { error } = await supabase.from("bill_lines").insert({
        bill_id: billId,
        line_number: nextLine,
        amount: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bill-lines", expandedBill] }),
  });

  const updateBillLine = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: unknown }) => {
      const updates: Record<string, unknown> = { [field]: value };
      if (field === "account_id" && value) {
        const account = coaAccounts.find((a) => a.id === value);
        if (account) {
          updates.account_name = account.account_name;
          updates.account_number = account.account_number;
        }
      }
      if (field === "job_id" && value) {
        const job = jobs.find((j) => j.id === value);
        if (job) {
          updates.job_name = job.job_name;
        }
      }
      const { error } = await supabase.from("bill_lines").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bill-lines", expandedBill] });
      queryClient.invalidateQueries({ queryKey: ["ap-bills", activeEntityId] });
    },
  });

  const deleteBillLine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bill_lines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bill-lines", expandedBill] });
      queryClient.invalidateQueries({ queryKey: ["ap-bills", activeEntityId] });
    },
  });

  const recordPayment = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const billId = showPayModal;
      if (!billId) return;
      const bill = bills.find((b) => b.id === billId);
      if (!bill) return;
      const paymentAmount = Number(values.amount) || 0;

      const { error } = await supabase.from("payment_applications").insert({
        entity_id: activeEntityId,
        payment_type: "AP",
        bill_id: billId,
        amount: paymentAmount,
        payment_method: values.payment_method || null,
        reference_number: values.reference_number || null,
        notes: values.notes || null,
      });
      if (error) throw error;

      const newPaid = (bill.paid_amount ?? 0) + paymentAmount;
      const newStatus = newPaid >= (bill.amount ?? 0) ? "Paid" : "Partial";
      const { error: updateErr } = await supabase
        .from("bills")
        .update({ paid_amount: newPaid, status: newStatus })
        .eq("id", billId);
      if (updateErr) throw updateErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-bills", activeEntityId] });
      toast.success("Payment recorded");
      setShowPayModal(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to record payment"),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalPayable = bills
    .filter((b) => b.status !== "Paid" && b.status !== "Void")
    .reduce((sum, b) => sum + (b.amount ?? 0), 0);
  const overdueCount = bills.filter(
    (b) => b.due_date && new Date(b.due_date) < new Date() && b.status !== "Paid" && b.status !== "Void",
  ).length;

  const columns: ColumnDef<Bill, unknown>[] = [
    {
      id: "select",
      header: () => <span className="text-xs text-muted">Select</span>,
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.original.id)}
          onChange={() => toggleSelect(row.original.id)}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-border"
        />
      ),
      size: 40,
    },
    {
      accessorKey: "bill_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Bill #" />,
      cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.getValue("bill_number") ?? "—"}</span>,
    },
    {
      accessorKey: "vendor_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vendor" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("vendor_name") ?? "—"}</span>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("description") ?? "—"}</span>,
    },
    {
      accessorKey: "due_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Due" />,
      cell: ({ row }) => {
        const val = row.getValue("due_date") as string | null;
        if (!val) return "—";
        const overdue = new Date(val) < new Date() && row.original.status !== "Paid";
        return <span className={overdue ? "font-medium text-destructive" : ""}>{formatDate(val)}</span>;
      },
    },
    {
      accessorKey: "amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => {
        const val = row.getValue("amount") as number | null;
        return val ? <span className="font-medium">{formatCurrency(val)}</span> : "—";
      },
    },
    {
      accessorKey: "approval_level",
      header: "Approval",
      cell: ({ row }) => {
        const level = row.getValue("approval_level") as string | null;
        if (!level) {
          const amount = row.original.amount ?? 0;
          if (amount > 0) {
            const computed = getApprovalLevel(amount);
            return (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${APPROVAL_COLORS[computed] ?? ""}`}>
                {computed}
              </span>
            );
          }
          return "—";
        }
        return (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${APPROVAL_COLORS[level] ?? ""}`}>
            {level}
          </span>
        );
      },
    },
    {
      accessorKey: "job_name",
      header: "Job",
      cell: ({ row }) => <span className="text-xs text-muted">{row.getValue("job_name") ?? "—"}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const bill = row.original;
        if (bill.status === "Paid" || bill.status === "Void") return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowPayModal(bill.id);
            }}
            className="rounded px-2 py-1 text-xs font-medium text-success transition-colors hover:bg-success-bg"
          >
            Pay
          </button>
        );
      },
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Accounts Payable</h1>
          <p className="mt-0.5 text-sm text-muted">
            {bills.length} bills · Payable: {formatCurrency(totalPayable)}
            {overdueCount > 0 && <span className="text-destructive"> · {overdueCount} overdue</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <button
                type="button"
                onClick={() => bulkAction.mutate("Approved")}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-info-bg"
              >
                Approve Selected ({selectedIds.size})
              </button>
              <button
                type="button"
                onClick={() => bulkAction.mutate("Paid")}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-success transition-colors hover:bg-success-bg"
              >
                Pay Selected ({selectedIds.size})
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
          >
            + New Bill
          </button>
        </div>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : bills.length === 0 ? (
        <EmptyState title="No bills" description="Track accounts payable with approval and payment workflow" />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={bills}
            searchKey="vendor_name"
            searchPlaceholder="Search bills..."
            onRowClick={(row) => setExpandedBill(expandedBill === row.id ? null : row.id)}
          />

          {expandedBill && (
            <div className="mt-4 rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Line Items for {bills.find((b) => b.id === expandedBill)?.bill_number}
                </h3>
                <button
                  type="button"
                  onClick={() => addBillLine.mutate(expandedBill)}
                  className="flex items-center gap-1 rounded bg-button px-2 py-1 text-xs font-medium text-white hover:bg-button-hover"
                >
                  + Add Line
                </button>
              </div>
              {billLines.length === 0 ? (
                <p className="text-sm text-muted">No line items — add lines with account and cost allocation.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted">
                      <th className="py-2 font-medium">#</th>
                      <th className="py-2 font-medium">Account</th>
                      <th className="py-2 font-medium">Description</th>
                      <th className="py-2 font-medium">Cost Code</th>
                      <th className="py-2 font-medium">Job</th>
                      <th className="py-2 text-right font-medium">Amount</th>
                      <th className="w-8 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {billLines.map((line) => (
                      <tr key={line.id} className="border-b border-border/50">
                        <td className="py-2 text-xs text-muted">{line.line_number}</td>
                        <td className="py-2">
                          <select
                            value={line.account_id ?? ""}
                            onChange={(e) =>
                              updateBillLine.mutate({
                                id: line.id,
                                field: "account_id",
                                value: e.target.value || null,
                              })
                            }
                            className="w-full rounded border border-border bg-card px-2 py-1 text-xs"
                          >
                            <option value="">Select account...</option>
                            {coaAccounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.account_number} — {a.account_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2">
                          <input
                            type="text"
                            defaultValue={line.description ?? ""}
                            onBlur={(e) =>
                              updateBillLine.mutate({
                                id: line.id,
                                field: "description",
                                value: e.target.value || null,
                              })
                            }
                            className="w-full rounded border border-border bg-card px-2 py-1 text-xs"
                            placeholder="Description"
                          />
                        </td>
                        <td className="py-2">
                          <input
                            type="text"
                            defaultValue={line.cost_code ?? ""}
                            onBlur={(e) =>
                              updateBillLine.mutate({
                                id: line.id,
                                field: "cost_code",
                                value: e.target.value || null,
                              })
                            }
                            className="w-20 rounded border border-border bg-card px-2 py-1 text-xs"
                            placeholder="Code"
                          />
                        </td>
                        <td className="py-2">
                          <select
                            value={line.job_id ?? ""}
                            onChange={(e) =>
                              updateBillLine.mutate({
                                id: line.id,
                                field: "job_id",
                                value: e.target.value || null,
                              })
                            }
                            className="w-full rounded border border-border bg-card px-2 py-1 text-xs"
                          >
                            <option value="">No job</option>
                            {jobs.map((j) => (
                              <option key={j.id} value={j.id}>
                                {j.job_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 text-right">
                          <input
                            type="number"
                            defaultValue={line.amount}
                            onBlur={(e) =>
                              updateBillLine.mutate({
                                id: line.id,
                                field: "amount",
                                value: Number(e.target.value) || 0,
                              })
                            }
                            className="w-24 rounded border border-border bg-card px-2 py-1 text-right text-xs"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="py-2 text-center">
                          <button
                            type="button"
                            onClick={() => deleteBillLine.mutate(line.id)}
                            className="rounded p-1 text-muted transition-colors hover:text-destructive"
                          >
                            &times;
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="font-medium">
                      <td className="py-2" colSpan={5}>
                        Total
                      </td>
                      <td className="py-2 text-right">
                        {formatCurrency(billLines.reduce((s, l) => s + (l.amount ?? 0), 0))}
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      <CreateRecordModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="New Bill"
        fields={[
          { name: "vendor_name", label: "Vendor name", type: "text", required: true, placeholder: "Vendor name" },
          { name: "description", label: "Description", type: "text", placeholder: "Description" },
          { name: "amount", label: "Amount", type: "number", placeholder: "Amount" },
          { name: "due_date", label: "Due date", type: "date", placeholder: "Due date" },
        ]}
        onSubmit={async (values) => {
          await addBill.mutateAsync(values);
        }}
        loading={addBill.isPending}
      />

      <CreateRecordModal
        open={!!showPayModal}
        onClose={() => setShowPayModal(null)}
        title="Record Payment"
        fields={[
          {
            name: "amount",
            label: "Payment amount",
            type: "number",
            required: true,
            placeholder: "Amount",
            defaultValue: String(bills.find((b) => b.id === showPayModal)?.amount ?? 0),
          },
          {
            name: "payment_method",
            label: "Payment method",
            type: "select",
            options: ["Check", "Wire", "ACH", "EFT", "Cash", "Other"],
          },
          { name: "reference_number", label: "Reference #", type: "text", placeholder: "Check # or ref" },
          { name: "notes", label: "Notes", type: "text", placeholder: "Notes" },
        ]}
        onSubmit={async (values) => {
          await recordPayment.mutateAsync(values);
        }}
        loading={recordPayment.isPending}
      />
    </div>
  );
}

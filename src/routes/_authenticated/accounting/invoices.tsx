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

export const Route = createFileRoute("/_authenticated/accounting/invoices")({
  component: Invoices,
});

interface Invoice {
  id: string;
  invoice_number: string | null;
  vendor_name: string | null;
  customer_name: string | null;
  invoice_date: string | null;
  due_date: string | null;
  amount: number | null;
  paid_amount: number | null;
  status: string;
  description: string | null;
}

interface InvoiceLine {
  id: string;
  invoice_id: string;
  line_number: number;
  description: string | null;
  account_id: string | null;
  account_name: string | null;
  account_number: string | null;
  quantity: number | null;
  unit_price: number | null;
  amount: number;
}

interface COAAccount {
  id: string;
  account_number: string;
  account_name: string;
}

function Invoices() {
  const queryClient = useQueryClient();
  const activeEntityId = useEntityStore((s) => s.activeEntityId);
  const [showModal, setShowModal] = useState(false);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["invoices", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("invoices").select("*").order("invoice_date", { ascending: false });
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: invoiceLines = [] } = useQuery<InvoiceLine[]>({
    queryKey: ["invoice-lines", expandedInvoice],
    enabled: !!expandedInvoice,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_lines")
        .select("id, invoice_id, line_number, description, account_id, account_name, account_number, quantity, unit_price, amount")
        .eq("invoice_id", expandedInvoice as string)
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

  const addInvoice = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const count = invoices.length + 1;
      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("invoices").insert({
        invoice_number: `INV-${String(count).padStart(4, "0")}`,
        invoice_date: today,
        status: "Draft",
        entity_id: activeEntityId,
        vendor_name: values.vendor_name || null,
        customer_name: values.customer_name || null,
        description: values.description || null,
        amount: values.amount ? Number(values.amount) : null,
        due_date: values.due_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", activeEntityId] });
      toast.success("Invoice created");
      setShowModal(false);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to create invoice"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "Paid") {
        const inv = invoices.find((i) => i.id === id);
        updates.paid_amount = inv?.amount ?? 0;
      }
      const { error } = await supabase.from("invoices").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices", activeEntityId] }),
  });

  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices", activeEntityId] }),
  });

  const addInvoiceLine = useMutation({
    mutationFn: async (invoiceId: string) => {
      const nextLine = invoiceLines.length + 1;
      const { error } = await supabase.from("invoice_lines").insert({
        invoice_id: invoiceId,
        line_number: nextLine,
        quantity: 1,
        unit_price: 0,
        amount: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoice-lines", expandedInvoice] }),
  });

  const updateInvoiceLine = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: unknown }) => {
      const updates: Record<string, unknown> = { [field]: value };
      if (field === "account_id" && value) {
        const account = coaAccounts.find((a) => a.id === value);
        if (account) {
          updates.account_name = account.account_name;
          updates.account_number = account.account_number;
        }
      }
      const { error } = await supabase.from("invoice_lines").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-lines", expandedInvoice] });
      queryClient.invalidateQueries({ queryKey: ["invoices", activeEntityId] });
    },
  });

  const deleteInvoiceLine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoice_lines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-lines", expandedInvoice] });
      queryClient.invalidateQueries({ queryKey: ["invoices", activeEntityId] });
    },
  });

  const totalOutstanding = invoices
    .filter((i) => i.status !== "Paid" && i.status !== "Void")
    .reduce((sum, i) => sum + (i.amount ?? 0), 0);

  const columns: ColumnDef<Invoice, unknown>[] = [
    {
      accessorKey: "invoice_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Invoice #" />,
      cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.getValue("invoice_number") ?? "—"}</span>,
    },
    {
      accessorKey: "customer_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
      cell: ({ row }) => {
        const customer = row.getValue("customer_name") as string | null;
        const vendor = row.original.vendor_name;
        return <span className="font-medium">{customer || vendor || "—"}</span>;
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="text-sm text-muted">{row.getValue("description") ?? "—"}</span>,
    },
    {
      accessorKey: "invoice_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => <span>{formatDate(row.getValue("invoice_date"))}</span>,
    },
    {
      accessorKey: "due_date",
      header: "Due",
      cell: ({ row }) => {
        const val = row.getValue("due_date") as string | null;
        if (!val) return "—";
        const overdue = new Date(val) < new Date();
        return <span className={overdue ? "text-destructive" : ""}>{formatDate(val)}</span>;
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
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const inv = row.original;
        return (
          <div className="flex items-center gap-1">
            {inv.status === "Draft" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateStatus.mutate({ id: inv.id, status: "Approved" });
                }}
                className="rounded px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-info-bg"
              >
                Approve
              </button>
            )}
            {inv.status === "Approved" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateStatus.mutate({ id: inv.id, status: "Paid" });
                }}
                className="rounded px-2 py-1 text-xs font-medium text-success transition-colors hover:bg-success-bg"
              >
                Pay
              </button>
            )}
            {(inv.status === "Draft" || inv.status === "Approved") && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateStatus.mutate({ id: inv.id, status: "Void" });
                }}
                className="rounded px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive-bg"
              >
                Void
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteInvoice.mutate(inv.id);
              }}
              className="rounded p-1 text-muted transition-colors hover:text-destructive"
            >
              &times;
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Invoices</h1>
          <p className="mt-0.5 text-sm text-muted">
            {invoices.length} invoices · Outstanding: {formatCurrency(totalOutstanding)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + New Invoice
        </button>
      </div>

      {isLoading ? (
        <FormSkeleton />
      ) : invoices.length === 0 ? (
        <EmptyState title="No invoices" description="Create and manage invoices with approval workflow" />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={invoices}
            searchKey="customer_name"
            searchPlaceholder="Search invoices..."
            onRowClick={(row) => setExpandedInvoice(expandedInvoice === row.id ? null : row.id)}
          />

          {expandedInvoice && (
            <div className="mt-4 rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Line Items for {invoices.find((i) => i.id === expandedInvoice)?.invoice_number}
                </h3>
                <button
                  type="button"
                  onClick={() => addInvoiceLine.mutate(expandedInvoice)}
                  className="flex items-center gap-1 rounded bg-button px-2 py-1 text-xs font-medium text-white hover:bg-button-hover"
                >
                  + Add Line
                </button>
              </div>
              {invoiceLines.length === 0 ? (
                <p className="text-sm text-muted">No line items — add lines with account, quantity, and price.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted">
                      <th className="py-2 font-medium">#</th>
                      <th className="py-2 font-medium">Account</th>
                      <th className="py-2 font-medium">Description</th>
                      <th className="py-2 text-right font-medium">Qty</th>
                      <th className="py-2 text-right font-medium">Unit Price</th>
                      <th className="py-2 text-right font-medium">Amount</th>
                      <th className="w-8 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceLines.map((line) => (
                      <tr key={line.id} className="border-b border-border/50">
                        <td className="py-2 text-xs text-muted">{line.line_number}</td>
                        <td className="py-2">
                          <select
                            value={line.account_id ?? ""}
                            onChange={(e) =>
                              updateInvoiceLine.mutate({
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
                              updateInvoiceLine.mutate({
                                id: line.id,
                                field: "description",
                                value: e.target.value || null,
                              })
                            }
                            className="w-full rounded border border-border bg-card px-2 py-1 text-xs"
                            placeholder="Description"
                          />
                        </td>
                        <td className="py-2 text-right">
                          <input
                            type="number"
                            defaultValue={line.quantity ?? 1}
                            onBlur={(e) =>
                              updateInvoiceLine.mutate({
                                id: line.id,
                                field: "quantity",
                                value: Number(e.target.value) || 1,
                              })
                            }
                            className="w-16 rounded border border-border bg-card px-2 py-1 text-right text-xs"
                            min="0"
                            step="1"
                          />
                        </td>
                        <td className="py-2 text-right">
                          <input
                            type="number"
                            defaultValue={line.unit_price ?? 0}
                            onBlur={(e) =>
                              updateInvoiceLine.mutate({
                                id: line.id,
                                field: "unit_price",
                                value: Number(e.target.value) || 0,
                              })
                            }
                            className="w-24 rounded border border-border bg-card px-2 py-1 text-right text-xs"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="py-2 text-right">
                          <input
                            type="number"
                            defaultValue={line.amount}
                            onBlur={(e) =>
                              updateInvoiceLine.mutate({
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
                            onClick={() => deleteInvoiceLine.mutate(line.id)}
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
                        {formatCurrency(invoiceLines.reduce((s, l) => s + (l.amount ?? 0), 0))}
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
        title="New Invoice"
        fields={[
          { name: "customer_name", label: "Customer", type: "text", required: true, placeholder: "Customer name" },
          { name: "vendor_name", label: "Vendor", type: "text", placeholder: "Vendor (optional)" },
          { name: "description", label: "Description", type: "text", placeholder: "Description" },
          { name: "amount", label: "Amount", type: "number", placeholder: "Amount" },
          { name: "due_date", label: "Due date", type: "date", placeholder: "Due date" },
        ]}
        onSubmit={async (values) => {
          await addInvoice.mutateAsync(values);
        }}
        loading={addInvoice.isPending}
      />
    </div>
  );
}

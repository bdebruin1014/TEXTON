import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";
import { CreateRecordModal } from "@/components/shared/CreateRecordModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate, getErrorMessage } from "@/lib/utils";
import { useEntityStore } from "@/stores/entityStore";

export const Route = createFileRoute("/_authenticated/accounting/journal-entries")({
  component: JournalEntries,
});

interface JournalEntry {
  id: string;
  entry_number: string | null;
  entry_date: string;
  description: string | null;
  total_debits: number | null;
  total_credits: number | null;
  status: string;
  is_balanced: boolean;
  created_at: string;
}

interface JELine {
  id: string;
  account_id: string | null;
  account_name: string | null;
  account_number: string | null;
  debit: number | null;
  credit: number | null;
  description: string | null;
}

interface COAAccount {
  id: string;
  account_number: string;
  account_name: string;
  account_type: string;
}

function JournalEntries() {
  const queryClient = useQueryClient();
  const activeEntityId = useEntityStore((s) => s.activeEntityId);
  const [expandedJE, setExpandedJE] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { data: entries = [], isLoading } = useQuery<JournalEntry[]>({
    queryKey: ["journal-entries", activeEntityId],
    queryFn: async () => {
      let query = supabase.from("journal_entries").select("*").order("entry_date", { ascending: false }).limit(200);
      if (activeEntityId) {
        query = query.eq("entity_id", activeEntityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: lines = [] } = useQuery<JELine[]>({
    queryKey: ["je-lines", expandedJE],
    enabled: !!expandedJE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select("id, account_id, account_name, account_number, debit, credit, description")
        .eq("journal_entry_id", expandedJE as string)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: coaAccounts = [] } = useQuery<COAAccount[]>({
    queryKey: ["coa-accounts", activeEntityId],
    queryFn: async () => {
      let query = supabase
        .from("chart_of_accounts")
        .select("id, account_number, account_name, account_type")
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

  const addEntry = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const count = entries.length + 1;
      const { error } = await supabase.from("journal_entries").insert({
        entry_number: `JE-${String(count).padStart(4, "0")}`,
        entry_date: values.entry_date || new Date().toISOString().split("T")[0],
        description: values.description || null,
        status: "Draft",
        is_balanced: true,
        entity_id: activeEntityId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries", activeEntityId] });
      toast.success("Journal entry created");
      setShowModal(false);
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err) || "Failed to create journal entry"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("journal_entries").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["journal-entries", activeEntityId] }),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("journal_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["journal-entries", activeEntityId] }),
  });

  const addLine = useMutation({
    mutationFn: async (jeId: string) => {
      const { error } = await supabase.from("journal_entry_lines").insert({
        journal_entry_id: jeId,
        debit: 0,
        credit: 0,
        entity_id: activeEntityId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["je-lines", expandedJE] }),
  });

  const updateLine = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: unknown }) => {
      const updates: Record<string, unknown> = { [field]: value };
      if (field === "account_id" && value) {
        const account = coaAccounts.find((a) => a.id === value);
        if (account) {
          updates.account_name = account.account_name;
          updates.account_number = account.account_number;
        }
      }
      const { error } = await supabase.from("journal_entry_lines").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["je-lines", expandedJE] }),
  });

  const deleteLine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("journal_entry_lines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["je-lines", expandedJE] }),
  });

  const reverseEntry = useMutation({
    mutationFn: async (jeId: string) => {
      const je = entries.find((e) => e.id === jeId);
      if (!je) throw new Error("Entry not found");

      const { data: sourceLines, error: linesErr } = await supabase
        .from("journal_entry_lines")
        .select("account_id, account_name, account_number, debit, credit, description")
        .eq("journal_entry_id", jeId);
      if (linesErr) throw linesErr;

      const count = entries.length + 1;
      const { data: newJE, error: jeErr } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: `JE-${String(count).padStart(4, "0")}`,
          entry_date: new Date().toISOString().split("T")[0],
          description: `Reversal of ${je.entry_number}`,
          status: "Draft",
          is_balanced: true,
          entity_id: activeEntityId,
          reversal_of_id: jeId,
        })
        .select("id")
        .single();
      if (jeErr) throw jeErr;

      if (sourceLines && sourceLines.length > 0) {
        const reversedLines = sourceLines.map((l) => ({
          journal_entry_id: newJE.id,
          account_id: l.account_id,
          account_name: l.account_name,
          account_number: l.account_number,
          debit: l.credit ?? 0,
          credit: l.debit ?? 0,
          description: l.description,
          entity_id: activeEntityId,
        }));
        const { error: insertErr } = await supabase.from("journal_entry_lines").insert(reversedLines);
        if (insertErr) throw insertErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries", activeEntityId] });
      toast.success("Reversal entry created");
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err) || "Failed to create reversal"),
  });

  const expandedEntry = entries.find((e) => e.id === expandedJE);
  const isExpandedDraft = expandedEntry?.status === "Draft";

  const columns: ColumnDef<JournalEntry, unknown>[] = [
    {
      accessorKey: "entry_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Entry #" />,
      cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.getValue("entry_number") ?? "—"}</span>,
      size: 100,
    },
    {
      accessorKey: "entry_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => <span className="font-medium">{formatDate(row.getValue("entry_date"))}</span>,
    },
    {
      accessorKey: "description",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => <span className="text-sm">{row.getValue("description") ?? "—"}</span>,
    },
    {
      accessorKey: "total_debits",
      header: "Debits",
      cell: ({ row }) => {
        const val = row.getValue("total_debits") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      accessorKey: "total_credits",
      header: "Credits",
      cell: ({ row }) => {
        const val = row.getValue("total_credits") as number | null;
        return val ? formatCurrency(val) : "—";
      },
    },
    {
      id: "balanced",
      header: "Balanced",
      cell: ({ row }) => {
        const je = row.original;
        const debits = je.total_debits ?? 0;
        const credits = je.total_credits ?? 0;
        const balanced = Math.abs(debits - credits) < 0.01;
        return balanced ? (
          <span className="text-xs font-medium text-success">Balanced</span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-medium text-destructive">
            Off by {formatCurrency(Math.abs(debits - credits))}
          </span>
        );
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
        const je = row.original;
        return (
          <div className="flex items-center gap-1">
            {je.status === "Draft" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateStatus.mutate({ id: je.id, status: "Posted" });
                }}
                className="rounded px-2 py-1 text-xs font-medium text-success transition-colors hover:bg-success-bg"
              >
                Post
              </button>
            )}
            {je.status === "Posted" && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    reverseEntry.mutate(je.id);
                  }}
                  className="rounded px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-info-bg"
                >
                  Reverse
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateStatus.mutate({ id: je.id, status: "Void" });
                  }}
                  className="rounded px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive-bg"
                >
                  Void
                </button>
              </>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteEntry.mutate(je.id);
              }}
              className="rounded p-1 text-muted transition-colors hover:text-destructive"
              aria-label="Delete"
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
          <h1 className="text-xl font-semibold text-foreground">Journal Entries</h1>
          <p className="mt-0.5 text-sm text-muted">{entries.length} entries</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + New Journal Entry
        </button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : entries.length === 0 ? (
        <EmptyState title="No journal entries" description="Create journal entries with balanced debit/credit lines" />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={entries}
            searchKey="description"
            searchPlaceholder="Search entries..."
            onRowClick={(row) => setExpandedJE(expandedJE === row.id ? null : row.id)}
          />

          {expandedJE && (
            <div className="mt-4 rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Lines for {expandedEntry?.entry_number}
                  {!isExpandedDraft && (
                    <span className="ml-2 text-xs font-normal text-muted">
                      (read-only — entry is {expandedEntry?.status})
                    </span>
                  )}
                </h3>
                {isExpandedDraft && (
                  <button
                    type="button"
                    onClick={() => addLine.mutate(expandedJE)}
                    className="flex items-center gap-1 rounded bg-button px-2 py-1 text-xs font-medium text-white hover:bg-button-hover"
                  >
                    + Add Line
                  </button>
                )}
              </div>
              {lines.length === 0 ? (
                <p className="text-sm text-muted">No lines — add debit/credit lines to this entry.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted">
                      <th className="py-2 font-medium">Account</th>
                      <th className="py-2 font-medium">Description</th>
                      <th className="py-2 text-right font-medium">Debit</th>
                      <th className="py-2 text-right font-medium">Credit</th>
                      {isExpandedDraft && <th className="w-8 py-2" />}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.id} className="border-b border-border/50">
                        <td className="py-2">
                          {isExpandedDraft ? (
                            <select
                              value={line.account_id ?? ""}
                              onChange={(e) =>
                                updateLine.mutate({
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
                          ) : (
                            <>
                              <span className="font-mono text-xs">{line.account_number}</span>
                              {line.account_name && <span className="ml-2 text-muted">{line.account_name}</span>}
                            </>
                          )}
                        </td>
                        <td className="py-2">
                          {isExpandedDraft ? (
                            <input
                              type="text"
                              defaultValue={line.description ?? ""}
                              onBlur={(e) =>
                                updateLine.mutate({
                                  id: line.id,
                                  field: "description",
                                  value: e.target.value || null,
                                })
                              }
                              className="w-full rounded border border-border bg-card px-2 py-1 text-xs"
                              placeholder="Description"
                            />
                          ) : (
                            <span className="text-muted">{line.description ?? "—"}</span>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          {isExpandedDraft ? (
                            <input
                              type="number"
                              defaultValue={line.debit ?? 0}
                              onBlur={(e) =>
                                updateLine.mutate({
                                  id: line.id,
                                  field: "debit",
                                  value: Number(e.target.value) || 0,
                                })
                              }
                              className="w-24 rounded border border-border bg-card px-2 py-1 text-right text-xs"
                              min="0"
                              step="0.01"
                            />
                          ) : (
                            <span>{line.debit ? formatCurrency(line.debit) : ""}</span>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          {isExpandedDraft ? (
                            <input
                              type="number"
                              defaultValue={line.credit ?? 0}
                              onBlur={(e) =>
                                updateLine.mutate({
                                  id: line.id,
                                  field: "credit",
                                  value: Number(e.target.value) || 0,
                                })
                              }
                              className="w-24 rounded border border-border bg-card px-2 py-1 text-right text-xs"
                              min="0"
                              step="0.01"
                            />
                          ) : (
                            <span>{line.credit ? formatCurrency(line.credit) : ""}</span>
                          )}
                        </td>
                        {isExpandedDraft && (
                          <td className="py-2 text-center">
                            <button
                              type="button"
                              onClick={() => deleteLine.mutate(line.id)}
                              className="rounded p-1 text-muted transition-colors hover:text-destructive"
                              aria-label="Delete line"
                            >
                              &times;
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    <tr className="font-medium">
                      <td className="py-2" colSpan={2}>
                        Totals
                      </td>
                      <td className="py-2 text-right">
                        {formatCurrency(lines.reduce((s, l) => s + (l.debit ?? 0), 0))}
                      </td>
                      <td className="py-2 text-right">
                        {formatCurrency(lines.reduce((s, l) => s + (l.credit ?? 0), 0))}
                      </td>
                      {isExpandedDraft && <td />}
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
        title="New Journal Entry"
        fields={[
          { name: "description", label: "Description", type: "text", required: true, placeholder: "Description" },
          {
            name: "entry_date",
            label: "Entry date",
            type: "date",
            required: true,
            defaultValue: new Date().toISOString().split("T")[0],
          },
        ]}
        onSubmit={async (values) => {
          await addEntry.mutateAsync(values);
        }}
        loading={addEntry.isPending}
      />
    </div>
  );
}

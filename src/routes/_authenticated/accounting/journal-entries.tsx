import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
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
  account_name: string | null;
  account_number: string | null;
  debit: number | null;
  credit: number | null;
  description: string | null;
}

function JournalEntries() {
  const queryClient = useQueryClient();
  const activeEntityId = useEntityStore((s) => s.activeEntityId);
  const [expandedJE, setExpandedJE] = useState<string | null>(null);

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
        .select("id, account_name, account_number, debit, credit, description")
        .eq("journal_entry_id", expandedJE as string)
        .order("debit", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addEntry = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const count = entries.length + 1;
      const { error } = await supabase.from("journal_entries").insert({
        entry_number: `JE-${String(count).padStart(4, "0")}`,
        entry_date: today,
        status: "Draft",
        is_balanced: true,
        entity_id: activeEntityId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["journal-entries", activeEntityId] }),
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
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteEntry.mutate(je.id);
              }}
              className="rounded p-1 text-muted transition-colors hover:text-destructive"
            >
              
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
          onClick={() => addEntry.mutate()}
          className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          +
          New Journal Entry
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

          {/* Expanded JE Lines */}
          {expandedJE && (
            <div className="mt-4 rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Lines for {entries.find((e) => e.id === expandedJE)?.entry_number}
                </h3>
                <button
                  type="button"
                  onClick={() => addLine.mutate(expandedJE)}
                  className="flex items-center gap-1 rounded bg-button px-2 py-1 text-xs font-medium text-white hover:bg-button-hover"
                >
                  +
                  Add Line
                </button>
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
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.id} className="border-b border-border/50">
                        <td className="py-2">
                          <span className="font-mono text-xs">{line.account_number}</span>
                          {line.account_name && <span className="ml-2 text-muted">{line.account_name}</span>}
                        </td>
                        <td className="py-2 text-muted">{line.description ?? "—"}</td>
                        <td className="py-2 text-right">{line.debit ? formatCurrency(line.debit) : ""}</td>
                        <td className="py-2 text-right">{line.credit ? formatCurrency(line.credit) : ""}</td>
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
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

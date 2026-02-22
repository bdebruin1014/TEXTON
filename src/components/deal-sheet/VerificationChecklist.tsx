import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { JENNYS_CHECKLIST_ITEMS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

interface ChecklistItem {
  id: string;
  deal_sheet_id: string;
  item_name: string;
  completed: boolean;
  completed_date: string | null;
  completed_by: string | null;
  notes: string | null;
  sort_order: number;
}

interface VerificationChecklistProps {
  dealSheetId: string;
}

export function VerificationChecklist({ dealSheetId }: VerificationChecklistProps) {
  const queryClient = useQueryClient();
  const queryKey = ["deal-sheet-checklist", dealSheetId];
  const [expanded, setExpanded] = useState(false);

  const { data: items = [], isLoading } = useQuery<ChecklistItem[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_sheet_checklist")
        .select("*")
        .eq("deal_sheet_id", dealSheetId)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const initializeChecklist = useMutation({
    mutationFn: async () => {
      const rows = JENNYS_CHECKLIST_ITEMS.map((item, i) => ({
        deal_sheet_id: dealSheetId,
        item_name: item,
        completed: false,
        sort_order: i + 1,
      }));
      const { error } = await supabase.from("deal_sheet_checklist").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const toggleItem = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("deal_sheet_checklist")
        .update({
          completed,
          completed_date: completed ? new Date().toISOString().split("T")[0] : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const completedCount = items.filter((i) => i.completed).length;
  const totalCount = items.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted">Loading checklist...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Verification Checklist</h3>
            <p className="mt-1 text-xs text-muted">38-item verification checklist for deal sheet review.</p>
          </div>
          <button
            type="button"
            onClick={() => initializeChecklist.mutate()}
            disabled={initializeChecklist.isPending}
            className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover disabled:opacity-50"
          >
            {initializeChecklist.isPending ? "Initializing..." : "Initialize Checklist"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Verification Checklist</h3>
          <p className="mt-1 text-xs text-muted">
            {completedCount} of {totalCount} items completed
          </p>
        </div>
        <span className="text-xs text-muted">{expanded ? "Collapse" : "Expand"}</span>
      </button>

      {/* Progress bar */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-accent/30">
        <div
          className="h-full rounded-full bg-[#3D7A4E] transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {expanded && (
        <div className="mt-4 space-y-1">
          {items.map((item) => (
            <ChecklistRow key={item.id} item={item} onToggle={toggleItem.mutate} queryKey={queryKey} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChecklistRow({
  item,
  onToggle,
  queryKey,
}: {
  item: ChecklistItem;
  onToggle: (payload: { id: string; completed: boolean }) => void;
  queryKey: unknown[];
}) {
  const queryClient = useQueryClient();
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(item.notes ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingNotes) notesInputRef.current?.focus();
  }, [editingNotes]);

  const saveNotes = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        await supabase
          .from("deal_sheet_checklist")
          .update({ notes: value || null })
          .eq("id", item.id);
        queryClient.invalidateQueries({ queryKey });
      }, 800);
    },
    [item.id, queryClient, queryKey],
  );

  return (
    <div className={`flex items-start gap-3 rounded-md px-3 py-2 ${item.completed ? "bg-green-50/50" : "bg-gray-50"}`}>
      <input
        type="checkbox"
        checked={item.completed}
        onChange={(e) => onToggle({ id: item.id, completed: e.target.checked })}
        className="mt-0.5 rounded border-border"
      />
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${item.completed ? "text-muted line-through" : "text-foreground"}`}>{item.item_name}</p>
        {editingNotes ? (
          <input
            ref={notesInputRef}
            type="text"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              saveNotes(e.target.value);
            }}
            onBlur={() => setEditingNotes(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") setEditingNotes(false);
            }}
            placeholder="Add notes..."
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingNotes(true)}
            className="mt-0.5 block text-left text-[10px] text-muted hover:text-foreground"
          >
            {notes || "Add notes..."}
          </button>
        )}
      </div>
      {item.completed_date && <span className="shrink-0 text-[10px] text-muted">{item.completed_date}</span>}
    </div>
  );
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { useCostBookLineItems } from "@/hooks/useCostBooks";
import { Sentry } from "@/lib/sentry";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

interface CostBookLineItemsProps {
  bookId: string;
  planId: string;
  planName: string;
  onBack: () => void;
}

export function CostBookLineItems({ bookId, planId, planName, onBack }: CostBookLineItemsProps) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["cost-book-line-items", bookId, planId], [bookId, planId]);
  const { data: items = [], isLoading } = useCostBookLineItems(bookId, planId);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const addItem = useMutation({
    mutationFn: async () => {
      const nextOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) + 1 : 1;
      const { error } = await supabase.from("cost_book_line_items").insert({
        cost_book_id: bookId,
        floor_plan_id: planId,
        category: "",
        description: "",
        amount: 0,
        sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cost_book_line_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const saveTextField = useCallback(
    (id: string, field: string, value: string) => {
      const timerKey = `li-${id}-${field}`;
      if (debounceTimers.current[timerKey]) clearTimeout(debounceTimers.current[timerKey]);
      debounceTimers.current[timerKey] = setTimeout(async () => {
        const { error } = await supabase
          .from("cost_book_line_items")
          .update({ [field]: value })
          .eq("id", id);
        if (error) Sentry.captureException(error);
        queryClient.invalidateQueries({ queryKey });
      }, 800);
    },
    [queryClient, queryKey],
  );

  const makeAmountSave = useCallback(
    (id: string) => async (value: number) => {
      const { error } = await supabase.from("cost_book_line_items").update({ amount: value }).eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey });
    },
    [queryClient, queryKey],
  );

  const total = items.reduce((sum, item) => sum + (item.amount ?? 0), 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
            {"\u2190"} Back to Plans
          </button>
          <h3 className="text-sm font-semibold text-foreground">S&B Line Items — {planName}</h3>
        </div>
        <button
          type="button"
          onClick={() => addItem.mutate()}
          className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + Add Line Item
        </button>
      </div>

      {isLoading ? (
        <p className="py-4 text-center text-sm text-muted">Loading line items...</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No line items yet. Click "+ Add Line Item" to begin.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Category
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Description
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Amount
                </th>
                <th className="w-20 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <LineItemRow
                  key={item.id}
                  item={item}
                  onTextChange={saveTextField}
                  makeAmountSave={makeAmountSave}
                  onDelete={() => deleteItem.mutate(item.id)}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border">
                <td className="px-3 py-2 text-sm font-semibold text-foreground" colSpan={2}>
                  Total
                </td>
                <td className="px-3 py-2 text-sm font-semibold text-foreground">{formatCurrency(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function LineItemRow({
  item,
  onTextChange,
  makeAmountSave,
  onDelete,
}: {
  item: { id: string; category: string | null; description: string | null; amount: number | null };
  onTextChange: (id: string, field: string, value: string) => void;
  makeAmountSave: (id: string) => (value: number) => Promise<void>;
  onDelete: () => void;
}) {
  const [category, setCategory] = useState(item.category ?? "");
  const [description, setDescription] = useState(item.description ?? "");

  return (
    <tr className="group border-b border-border/50 hover:bg-accent/30">
      <td className="px-3 py-1.5">
        <input
          type="text"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            onTextChange(item.id, "category", e.target.value);
          }}
          placeholder="Category"
          className="w-full rounded border border-transparent bg-transparent px-2 py-1 text-sm outline-none focus:border-border focus:bg-background"
        />
      </td>
      <td className="px-3 py-1.5">
        <input
          type="text"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            onTextChange(item.id, "description", e.target.value);
          }}
          placeholder="Description"
          className="w-full rounded border border-transparent bg-transparent px-2 py-1 text-sm outline-none focus:border-border focus:bg-background"
        />
      </td>
      <td className="px-3 py-1.5">
        <CurrencyInput label="" value={item.amount} onSave={makeAmountSave(item.id)} />
      </td>
      <td className="px-3 py-1.5 text-right">
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-1 text-xs font-medium text-muted opacity-0 transition-colors group-hover:opacity-100 hover:text-destructive"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

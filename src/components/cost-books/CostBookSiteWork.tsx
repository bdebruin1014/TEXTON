import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { useCostBookSiteWork } from "@/hooks/useCostBooks";
import { supabase } from "@/lib/supabase";

interface CostBookSiteWorkProps {
  bookId: string;
}

export function CostBookSiteWork({ bookId }: CostBookSiteWorkProps) {
  const queryClient = useQueryClient();
  const { data: items = [], isLoading } = useCostBookSiteWork(bookId);
  const queryKey = useMemo(() => ["cost-book-site-work", bookId], [bookId]);

  const makeOnSave = useCallback(
    (rowId: string) => async (value: number) => {
      const { error } = await supabase.from("cost_book_site_work").update({ amount: value }).eq("id", rowId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey });
    },
    [queryClient, queryKey],
  );

  if (isLoading) {
    return <p className="py-4 text-center text-sm text-muted">Loading site work...</p>;
  }

  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No site work items in this cost book.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">Code</th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">
              Description
            </th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border/50 hover:bg-accent/30">
              <td className="px-3 py-1.5 text-sm font-medium text-foreground">{item.site_work_items?.code ?? "—"}</td>
              <td className="px-3 py-1.5 text-sm text-muted">{item.site_work_items?.description ?? "—"}</td>
              <td className="px-3 py-1.5">
                <CurrencyInput label="" value={item.amount} onSave={makeOnSave(item.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

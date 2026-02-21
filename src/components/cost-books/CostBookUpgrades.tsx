import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { useCostBookUpgrades } from "@/hooks/useCostBooks";
import { supabase } from "@/lib/supabase";

interface CostBookUpgradesProps {
  bookId: string;
}

export function CostBookUpgrades({ bookId }: CostBookUpgradesProps) {
  const queryClient = useQueryClient();
  const { data: upgrades = [], isLoading } = useCostBookUpgrades(bookId);
  const queryKey = useMemo(() => ["cost-book-upgrades", bookId], [bookId]);

  const makeOnSave = useCallback(
    (rowId: string) => async (value: number) => {
      const { error } = await supabase.from("cost_book_upgrades").update({ amount: value }).eq("id", rowId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey });
    },
    [queryClient, queryKey],
  );

  if (isLoading) {
    return <p className="py-4 text-center text-sm text-muted">Loading upgrades...</p>;
  }

  if (upgrades.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No upgrade packages in this cost book.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">
              Package
            </th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">
              Category
            </th>
            <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {upgrades.map((u) => (
            <tr key={u.id} className="border-b border-border/50 hover:bg-accent/30">
              <td className="px-3 py-1.5 text-sm font-medium text-foreground">
                {u.upgrade_packages?.name ?? "Unknown"}
              </td>
              <td className="px-3 py-1.5">
                <span className="text-sm text-muted">{u.upgrade_packages?.category ?? "—"}</span>
              </td>
              <td className="px-3 py-1.5">
                <CurrencyInput label="" value={u.amount} onSave={makeOnSave(u.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

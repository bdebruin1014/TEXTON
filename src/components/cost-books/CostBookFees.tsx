import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { useCostBookFees } from "@/hooks/useCostBooks";
import { supabase } from "@/lib/supabase";

interface CostBookFeesProps {
  bookId: string;
}

const FEE_FIELDS = [
  { key: "builder_fee", label: "Builder Fee" },
  { key: "am_fee", label: "Asset Management Fee" },
  { key: "builder_warranty", label: "Builder Warranty Reserve" },
  { key: "builders_risk", label: "Builder's Risk Insurance" },
  { key: "po_fee", label: "PO Fee" },
  { key: "bookkeeping", label: "Bookkeeping" },
  { key: "pm_fee", label: "Project Management Fee" },
  { key: "utilities", label: "Utilities During Construction" },
] as const;

export function CostBookFees({ bookId }: CostBookFeesProps) {
  const queryClient = useQueryClient();
  const { data: fees, isLoading } = useCostBookFees(bookId);
  const queryKey = useMemo(() => ["cost-book-fees", bookId], [bookId]);

  const makeOnSave = useCallback(
    (field: string) => async (value: number) => {
      if (!fees) return;
      const { error } = await supabase
        .from("cost_book_fees")
        .update({ [field]: value })
        .eq("id", fees.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey });
    },
    [fees, queryClient, queryKey],
  );

  if (isLoading) {
    return <p className="py-4 text-center text-sm text-muted">Loading fees...</p>;
  }

  if (!fees) {
    return <p className="py-8 text-center text-sm text-muted">No fee overrides for this cost book.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {FEE_FIELDS.map(({ key, label }) => (
        <CurrencyInput
          key={key}
          label={label}
          value={fees[key as keyof typeof fees] as number | null}
          onSave={makeOnSave(key)}
        />
      ))}
    </div>
  );
}

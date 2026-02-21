import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

interface Comp {
  id: string;
  deal_sheet_id: string;
  address: string | null;
  sale_price: number | null;
  sale_date: string | null;
  square_footage: number | null;
  price_per_sqft: number | null;
  beds: number | null;
  baths: number | null;
  notes: string | null;
}

interface DealSheetCompsProps {
  dealSheetId: string;
}

export function DealSheetComps({ dealSheetId }: DealSheetCompsProps) {
  const queryClient = useQueryClient();
  const queryKey = ["deal-sheet-comps", dealSheetId];

  const { data: comps = [], isLoading } = useQuery<Comp[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_sheet_comps")
        .select("*")
        .eq("deal_sheet_id", dealSheetId)
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addComp = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("deal_sheet_comps").insert({
        deal_sheet_id: dealSheetId,
        address: "",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteComp = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deal_sheet_comps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const stats = useMemo(() => {
    const withPrice = comps.filter((c) => c.sale_price && c.sale_price > 0);
    if (withPrice.length === 0) return null;
    const prices = withPrice.map((c) => c.sale_price as number);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const sorted = [...prices].sort((a, b) => a - b);
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    const withPSF = comps.filter((c) => c.price_per_sqft && c.price_per_sqft > 0);
    const avgPSF =
      withPSF.length > 0
        ? withPSF.map((c) => c.price_per_sqft as number).reduce((a, b) => a + b, 0) / withPSF.length
        : 0;
    return { count: withPrice.length, avg, median, avgPSF };
  }, [comps]);

  if (isLoading) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Comparable Sales</h3>
        <button
          type="button"
          onClick={() => addComp.mutate()}
          className="rounded-md bg-button px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + Add Comp
        </button>
      </div>

      {comps.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted">No comps yet. Add comparable sales to support ASP.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="pb-2 pr-2 font-medium">Address</th>
                  <th className="pb-2 pr-2 font-medium">Sale Price</th>
                  <th className="pb-2 pr-2 font-medium">Date</th>
                  <th className="pb-2 pr-2 font-medium">SF</th>
                  <th className="pb-2 pr-2 font-medium">$/SF</th>
                  <th className="pb-2 pr-2 font-medium">Beds</th>
                  <th className="pb-2 pr-2 font-medium">Baths</th>
                  <th className="pb-2 pr-2 font-medium">Notes</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {comps.map((comp) => (
                  <CompRow key={comp.id} comp={comp} queryKey={queryKey} onDelete={() => deleteComp.mutate(comp.id)} />
                ))}
              </tbody>
            </table>
          </div>

          {stats && (
            <div className="mt-4 grid grid-cols-4 gap-3 border-t border-border pt-3">
              <StatCell label="Comp Count" value={String(stats.count)} />
              <StatCell label="Avg Sale Price" value={formatCurrency(stats.avg)} />
              <StatCell label="Median Sale Price" value={formatCurrency(stats.median)} />
              <StatCell label="Avg $/SF" value={stats.avgPSF > 0 ? `$${stats.avgPSF.toFixed(0)}` : "—"} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function CompRow({ comp, queryKey, onDelete }: { comp: Comp; queryKey: unknown[]; onDelete: () => void }) {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const saveField = useCallback(
    (field: string, value: string | number | null) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        await supabase
          .from("deal_sheet_comps")
          .update({ [field]: value })
          .eq("id", comp.id);
        queryClient.invalidateQueries({ queryKey });
      }, 800);
    },
    [comp.id, queryClient, queryKey],
  );

  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-1.5 pr-2">
        <input
          type="text"
          defaultValue={comp.address ?? ""}
          onChange={(e) => saveField("address", e.target.value)}
          placeholder="Address"
          className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
        />
      </td>
      <td className="py-1.5 pr-2">
        <input
          type="number"
          defaultValue={comp.sale_price ?? ""}
          onChange={(e) => saveField("sale_price", Number(e.target.value) || null)}
          placeholder="0"
          className="w-24 rounded border border-border bg-background px-2 py-1 text-right font-mono text-xs"
        />
      </td>
      <td className="py-1.5 pr-2">
        <input
          type="date"
          defaultValue={comp.sale_date ?? ""}
          onChange={(e) => saveField("sale_date", e.target.value || null)}
          className="rounded border border-border bg-background px-2 py-1 text-xs"
        />
      </td>
      <td className="py-1.5 pr-2">
        <input
          type="number"
          defaultValue={comp.square_footage ?? ""}
          onChange={(e) => saveField("square_footage", Number(e.target.value) || null)}
          placeholder="0"
          className="w-20 rounded border border-border bg-background px-2 py-1 text-right font-mono text-xs"
        />
      </td>
      <td className="py-1.5 pr-2">
        <input
          type="number"
          defaultValue={comp.price_per_sqft ?? ""}
          onChange={(e) => saveField("price_per_sqft", Number(e.target.value) || null)}
          placeholder="0"
          className="w-16 rounded border border-border bg-background px-2 py-1 text-right font-mono text-xs"
        />
      </td>
      <td className="py-1.5 pr-2">
        <input
          type="number"
          defaultValue={comp.beds ?? ""}
          onChange={(e) => saveField("beds", Number(e.target.value) || null)}
          className="w-12 rounded border border-border bg-background px-2 py-1 text-center text-xs"
        />
      </td>
      <td className="py-1.5 pr-2">
        <input
          type="number"
          defaultValue={comp.baths ?? ""}
          onChange={(e) => saveField("baths", Number(e.target.value) || null)}
          className="w-12 rounded border border-border bg-background px-2 py-1 text-center text-xs"
        />
      </td>
      <td className="py-1.5 pr-2">
        <input
          type="text"
          defaultValue={comp.notes ?? ""}
          onChange={(e) => saveField("notes", e.target.value)}
          placeholder="Notes"
          className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
        />
      </td>
      <td className="py-1.5">
        <button
          type="button"
          onClick={onDelete}
          className="rounded px-1.5 py-0.5 text-xs text-destructive-text transition-colors hover:bg-destructive-bg"
        >
          Remove
        </button>
      </td>
    </tr>
  );
}

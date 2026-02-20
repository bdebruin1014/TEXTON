import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pipeline/$opportunityId/comps")({
  component: Comps,
});

interface Comp {
  id: string;
  opportunity_id: string;
  address: string | null;
  sale_price: number | null;
  sale_date: string | null;
  square_footage: number | null;
  price_per_sqft: number | null;
  beds: number | null;
  baths: number | null;
  notes: string | null;
}

function Comps() {
  const { opportunityId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: comps = [], isLoading } = useQuery<Comp[]>({
    queryKey: ["comps", opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comparable_sales")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addComp = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("comparable_sales").insert({
        opportunity_id: opportunityId,
        address: "",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comps", opportunityId] }),
  });

  const updateComp = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: unknown }) => {
      const { error } = await supabase
        .from("comparable_sales")
        .update({ [field]: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comps", opportunityId] }),
  });

  const deleteComp = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comparable_sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comps", opportunityId] }),
  });

  // Summary stats
  const stats = useMemo(() => {
    const prices = comps.map((c) => c.sale_price).filter((v): v is number => v != null);
    const ppsf = comps.map((c) => c.price_per_sqft).filter((v): v is number => v != null);

    const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const median = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
    };

    return {
      count: comps.length,
      avgPrice: avg(prices),
      medianPrice: median(prices),
      avgPPSF: avg(ppsf),
    };
  }, [comps]);

  if (isLoading) return <FormSkeleton />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Comparable Sales</h2>
        <button
          type="button"
          onClick={() => addComp.mutate()}
          className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + Add Comp
        </button>
      </div>

      {/* Summary Stats */}
      {comps.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Comps" value={String(stats.count)} />
          <StatCard label="Avg Sale Price" value={formatCurrency(stats.avgPrice)} />
          <StatCard label="Median Sale Price" value={formatCurrency(stats.medianPrice)} />
          <StatCard label="Avg $/SF" value={stats.avgPPSF > 0 ? `$${stats.avgPPSF.toFixed(0)}` : "—"} />
        </div>
      )}

      {comps.length === 0 ? (
        <EmptyState title="No comparable sales" description="Add comparable sales to support your ASP assumption" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="px-3 py-2 text-left font-medium text-muted">Address</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Sale Price</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Date</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Sq Ft</th>
                <th className="px-3 py-2 text-left font-medium text-muted">$/SF</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Beds</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Baths</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Notes</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {comps.map((comp) => (
                <CompRow
                  key={comp.id}
                  comp={comp}
                  onUpdate={(field, value) => updateComp.mutate({ id: comp.id, field, value })}
                  onDelete={() => deleteComp.mutate(comp.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-mono text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function CompRow({
  comp,
  onUpdate,
  onDelete,
}: {
  comp: Comp;
  onUpdate: (field: string, value: unknown) => void;
  onDelete: () => void;
}) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const debouncedUpdate = useCallback(
    (field: string, value: unknown) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onUpdate(field, value), 800);
    },
    [onUpdate],
  );

  const handlePriceChange = useCallback(
    (value: string, comp: Comp) => {
      const price = Number.parseFloat(value) || 0;
      debouncedUpdate("sale_price", price);
      if (comp.square_footage && comp.square_footage > 0) {
        debouncedUpdate("price_per_sqft", Math.round(price / comp.square_footage));
      }
    },
    [debouncedUpdate],
  );

  const handleSqFtChange = useCallback(
    (value: string, comp: Comp) => {
      const sf = Number.parseFloat(value) || 0;
      debouncedUpdate("square_footage", sf);
      if (comp.sale_price && sf > 0) {
        debouncedUpdate("price_per_sqft", Math.round(comp.sale_price / sf));
      }
    },
    [debouncedUpdate],
  );

  const inputClass =
    "w-full border-0 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:bg-blue-50 transition-colors";

  return (
    <tr className="border-b border-border last:border-b-0 hover:bg-gray-50">
      <td>
        <input
          defaultValue={comp.address ?? ""}
          onBlur={(e) => onUpdate("address", e.target.value)}
          className={inputClass}
          placeholder="123 Main St"
        />
      </td>
      <td>
        <input
          defaultValue={comp.sale_price ?? ""}
          onChange={(e) => handlePriceChange(e.target.value, comp)}
          className={`${inputClass} font-mono`}
          type="number"
          placeholder="0"
        />
      </td>
      <td>
        <input
          defaultValue={comp.sale_date ?? ""}
          onBlur={(e) => onUpdate("sale_date", e.target.value || null)}
          className={inputClass}
          type="date"
        />
      </td>
      <td>
        <input
          defaultValue={comp.square_footage ?? ""}
          onChange={(e) => handleSqFtChange(e.target.value, comp)}
          className={`${inputClass} font-mono`}
          type="number"
          placeholder="0"
        />
      </td>
      <td className="px-3 py-2 font-mono text-sm text-muted">
        {comp.price_per_sqft ? `$${comp.price_per_sqft.toFixed(0)}` : "—"}
      </td>
      <td>
        <input
          defaultValue={comp.beds ?? ""}
          onBlur={(e) => onUpdate("beds", Number(e.target.value) || null)}
          className={`${inputClass} font-mono`}
          type="number"
          placeholder="—"
        />
      </td>
      <td>
        <input
          defaultValue={comp.baths ?? ""}
          onBlur={(e) => onUpdate("baths", Number(e.target.value) || null)}
          className={`${inputClass} font-mono`}
          type="number"
          step="0.5"
          placeholder="—"
        />
      </td>
      <td>
        <input
          defaultValue={comp.notes ?? ""}
          onBlur={(e) => onUpdate("notes", e.target.value || null)}
          className={inputClass}
          placeholder="Notes..."
        />
      </td>
      <td className="px-2">
        <button type="button" onClick={onDelete} className="rounded p-1 text-xs text-muted hover:text-destructive">
          Delete
        </button>
      </td>
    </tr>
  );
}

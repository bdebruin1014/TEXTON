import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DealSheetForm, type DealSheetRecord } from "@/components/deal-sheet/DealSheetForm";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/tools/deal-analyzer")({
  component: StandaloneDealAnalyzer,
});

function StandaloneDealAnalyzer() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryKey = ["deal-sheets-standalone"];

  const { data: sheets = [], isLoading } = useQuery<DealSheetRecord[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_sheets")
        .select("*")
        .is("opportunity_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const active = useMemo(() => {
    if (selectedId) return sheets.find((s) => s.id === selectedId) ?? sheets[0];
    return sheets[0];
  }, [sheets, selectedId]);

  const createSheet = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("deal_sheets")
        .insert({
          opportunity_id: null,
          name: `Quick Analysis ${sheets.length + 1}`,
          deal_type: "scattered_lot",
          lot_purchase_price: 0,
          closing_costs: 0,
          sticks_bricks: 0,
          upgrades: 0,
          soft_costs: 0,
          land_prep: 0,
          site_specific: 0,
          site_work_total: 0,
          other_site_costs: 0,
          is_rch_related_owner: true,
          asset_sales_price: 0,
          selling_cost_rate: 0.085,
          selling_concessions: 0,
          ltc_ratio: 0.85,
          interest_rate: 0.1,
          cost_of_capital: 0.16,
          project_duration_days: 120,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey });
      setSelectedId(data.id);
    },
  });

  if (isLoading) return <FormSkeleton />;

  if (!active) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Deal Analyzer</h1>
            <p className="mt-0.5 text-sm text-muted">
              Quick scattered lot underwriting — not linked to a pipeline opportunity
            </p>
          </div>
          <button
            type="button"
            onClick={() => createSheet.mutate()}
            className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
          >
            + New Analysis
          </button>
        </div>
        <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-24">
          <p className="text-sm text-muted">Create a new analysis to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Deal Analyzer</h1>
            <p className="mt-0.5 text-sm text-muted">Standalone scattered lot underwriting</p>
          </div>
          {sheets.length > 1 && (
            <select
              value={active.id}
              onChange={(e) => setSelectedId(e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
            >
              {sheets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || "Untitled"}
                </option>
              ))}
            </select>
          )}
        </div>
        <button
          type="button"
          onClick={() => createSheet.mutate()}
          className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
        >
          + New Analysis
        </button>
      </div>

      <DealSheetForm sheet={active} queryKey={queryKey} />
    </div>
  );
}

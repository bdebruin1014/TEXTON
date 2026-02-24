import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CommunityDevDealSheet } from "@/components/deal-sheet/CommunityDevDealSheet";
import { DealSheetForm, type DealSheetRecord } from "@/components/deal-sheet/DealSheetForm";
import { LotDevDealSheet } from "@/components/deal-sheet/LotDevDealSheet";
import { LotPurchaseDealSheet } from "@/components/deal-sheet/LotPurchaseDealSheet";
import { ProjectTypeGate } from "@/components/deal-sheet/ProjectTypeGate";
import { ScenarioComparison } from "@/components/deal-sheet/ScenarioComparison";
import { ScenarioTabBar } from "@/components/deal-sheet/ScenarioTabBar";
import { FormSkeleton } from "@/components/shared/Skeleton";
import { Sentry } from "@/lib/sentry";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/pipeline/$opportunityId/deal-sheet")({
  component: DealSheet,
});

function DealSheet() {
  const { opportunityId } = Route.useParams();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Fetch opportunity to check project_type
  const { data: opp, isLoading: oppLoading } = useQuery({
    queryKey: ["opportunity", opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("id, project_type")
        .eq("id", opportunityId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch all deal sheets for this opportunity
  const sheetsQueryKey = useMemo(() => ["deal-sheets", opportunityId], [opportunityId]);
  const { data: sheets = [], isLoading: sheetsLoading } = useQuery<DealSheetRecord[]>({
    queryKey: sheetsQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_sheets")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("scenario_number", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!opp?.project_type && opp.project_type === "Scattered Lot",
  });

  const active = useMemo(() => {
    if (selectedId) return sheets.find((s) => s.id === selectedId) ?? sheets[0];
    // Default to primary, or first
    return sheets.find((s) => s.is_primary) ?? sheets[0];
  }, [sheets, selectedId]);

  const createSheet = useMutation({
    mutationFn: async () => {
      const nextNumber = sheets.length + 1;
      const { data, error } = await supabase
        .from("deal_sheets")
        .insert({
          opportunity_id: opportunityId,
          name: `Scenario ${nextNumber}`,
          scenario_number: nextNumber,
          scenario_name: `Scenario ${nextNumber}`,
          is_primary: sheets.length === 0,
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
      queryClient.invalidateQueries({ queryKey: sheetsQueryKey });
      setSelectedId(data.id);
      setCompareMode(false);
    },
  });

  const suggestScenarios = async () => {
    setAiLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-deal-scenarios`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ opportunityId }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        Sentry.captureMessage(`AI scenario generation failed: ${errBody}`, "error");
      }
      queryClient.invalidateQueries({ queryKey: sheetsQueryKey });
    } catch (err) {
      Sentry.captureException(err);
    } finally {
      setAiLoading(false);
    }
  };

  if (oppLoading || sheetsLoading) return <FormSkeleton />;

  // Gate 1: No project type → show classification cards
  if (!opp?.project_type) {
    return <ProjectTypeGate opportunityId={opportunityId} />;
  }

  // Route by project type
  if (opp.project_type === "Community Development") {
    return <CommunityDevDealSheet opportunityId={opportunityId} />;
  }
  if (opp.project_type === "Lot Development") {
    return <LotDevDealSheet opportunityId={opportunityId} />;
  }
  if (opp.project_type === "Lot Purchase") {
    return <LotPurchaseDealSheet opportunityId={opportunityId} />;
  }

  // No sheets yet → empty state
  if (!active) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Deal Analyzer</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={suggestScenarios}
              disabled={aiLoading}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
            >
              {aiLoading ? "Generating..." : "Suggest Scenarios"}
            </button>
            <button
              type="button"
              onClick={() => createSheet.mutate()}
              disabled={createSheet.isPending}
              className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
            >
              + New Scenario
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-24">
          <p className="text-sm text-muted">No deal scenarios yet. Create one or let AI suggest scenarios.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Deal Analyzer</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={suggestScenarios}
            disabled={aiLoading}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            {aiLoading ? "Generating..." : "Suggest Scenarios"}
          </button>
          {sheets.length < 5 && (
            <button
              type="button"
              onClick={() => createSheet.mutate()}
              disabled={createSheet.isPending}
              className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
            >
              + New Scenario
            </button>
          )}
        </div>
      </div>

      {/* Scenario tabs */}
      {sheets.length > 1 && (
        <div className="mb-6">
          <ScenarioTabBar
            sheets={sheets}
            activeId={active.id}
            compareMode={compareMode}
            onSelect={(id) => {
              setSelectedId(id);
              setCompareMode(false);
            }}
            onCompare={() => setCompareMode(true)}
          />
        </div>
      )}

      {/* Content */}
      {compareMode ? (
        <ScenarioComparison sheets={sheets} queryKey={sheetsQueryKey} />
      ) : (
        <DealSheetForm sheet={active} queryKey={sheetsQueryKey} />
      )}
    </div>
  );
}

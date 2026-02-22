import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getAuthUser } from "../_shared/auth.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface RequestPayload {
  opportunityId: string;
}

interface ScenarioSuggestion {
  scenario_name: string;
  floor_plan_name: string;
  floor_plan_id: string | null;
  sticks_bricks: number;
  upgrades: number;
  asset_sales_price: number;
  lot_purchase_price: number;
  closing_costs: number;
  soft_costs: number;
  site_work_total: number;
  project_duration_days: number;
  rationale: string;
}

interface ClaudeResponse {
  scenarios: ScenarioSuggestion[];
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are a deal analysis engine for Red Cedar Homes, a for-sale \
residential builder operating in the Greenville-Spartanburg-Charlotte corridor.

Given property details and available floor plans with construction costs, generate \
2-3 realistic deal scenarios for a scattered lot build. Each scenario should represent \
a different strategy (e.g., entry-level vs. premium, different floor plans, different \
price points).

For each scenario, provide:
1. scenario_name: descriptive name (e.g., "Economy Build - Aspen 1400")
2. floor_plan_name: the name of the floor plan to use
3. floor_plan_id: the UUID of the floor plan (from the provided list)
4. sticks_bricks: construction cost (use contract_snb or dm_budget_snb from the plan)
5. upgrades: upgrade budget (typically $0-$15,000)
6. asset_sales_price: estimated selling price based on plan size and market
7. lot_purchase_price: from the opportunity data
8. closing_costs: estimated closing costs (typically 1-2% of lot price)
9. soft_costs: municipality fees estimate (typically $8,000-$20,000)
10. site_work_total: site work estimate (typically $8,000-$25,000)
11. project_duration_days: estimated build time (90-180 days)
12. rationale: 2-3 sentences explaining why this scenario makes sense

Target net profit margins of 7-12%. Consider the lot price relative to the ASP.

Respond ONLY with valid JSON: { "scenarios": [...] }`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const user = await getAuthUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: RequestPayload = await req.json();
    const { opportunityId } = payload;

    if (!opportunityId) {
      return jsonResponse({ error: "Missing required field: opportunityId" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch opportunity details
    const { data: opp, error: oppError } = await supabase
      .from("opportunities")
      .select("id, opportunity_name, address_street, address_city, address_state, address_zip, estimated_value, project_type")
      .eq("id", opportunityId)
      .single();

    if (oppError || !opp) {
      return jsonResponse({ error: "Opportunity not found" }, 404);
    }

    // Fetch existing deal sheets count
    const { count: existingCount } = await supabase
      .from("deal_sheets")
      .select("id", { count: "exact", head: true })
      .eq("opportunity_id", opportunityId);

    if ((existingCount ?? 0) >= 5) {
      return jsonResponse({ error: "Maximum 5 scenarios per opportunity" }, 400);
    }

    // Fetch available floor plans with pricing
    const { data: plans } = await supabase
      .from("floor_plans")
      .select("id, name, heated_sqft, plan_type, bed_count, bath_count, stories, width_ft, depth_ft, base_construction_cost, contract_snb, dm_budget_snb, base_sale_price")
      .eq("status", "Active")
      .order("name");

    // Fetch municipalities for fee context
    const { data: municipalities } = await supabase
      .from("municipalities")
      .select("name, water_tap, sewer_tap, gas_tap, permitting, impact, architect, engineering, survey")
      .limit(10);

    // Build user prompt
    const planContext = (plans ?? [])
      .map(
        (p) =>
          `- ${p.name} (${p.heated_sqft ?? "?"}sf, ${p.bed_count ?? "?"}bd/${p.bath_count ?? "?"}ba, ${p.stories ?? "?"}st) — S&B: $${p.contract_snb ?? p.dm_budget_snb ?? p.base_construction_cost ?? 0}, Base Sale: $${p.base_sale_price ?? "N/A"} [ID: ${p.id}]`,
      )
      .join("\n");

    const muniContext = (municipalities ?? [])
      .map(
        (m) => {
          const total = (m.water_tap ?? 0) + (m.sewer_tap ?? 0) + (m.gas_tap ?? 0) + (m.permitting ?? 0) + (m.impact ?? 0) + (m.architect ?? 0) + (m.engineering ?? 0) + (m.survey ?? 0);
          return `- ${m.name}: ~$${total.toLocaleString()} total fees`;
        },
      )
      .join("\n");

    const userPrompt = `PROPERTY:
Name: ${opp.opportunity_name}
Address: ${opp.address_street ?? "TBD"}, ${opp.address_city ?? ""}, ${opp.address_state ?? ""} ${opp.address_zip ?? ""}
Estimated Value: ${opp.estimated_value ? `$${Number(opp.estimated_value).toLocaleString()}` : "Not set"}

AVAILABLE FLOOR PLANS:
${planContext || "No floor plans available"}

MUNICIPALITY FEE RANGES:
${muniContext || "No municipality data available"}

DEFAULTS:
- Selling cost rate: 8.5%
- LTC ratio: 85%
- Interest rate: 10%
- Cost of capital: 16%
- RCH-related entity: yes (fixed per-house fees = $35,400)
- Builder fee: MAX($25K, 10% of sections 1-5)
- Contingency: MIN($10K, 5% of sections 1-5)

Generate ${Math.min(3, 5 - (existingCount ?? 0))} scenarios. Pick different floor plans for variety.`;

    // Call Claude API
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return jsonResponse({ error: "ANTHROPIC_API_KEY not configured" }, 500);
    }

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!anthropicResponse.ok) {
      const errBody = await anthropicResponse.text();
      console.error("Anthropic API error:", anthropicResponse.status, errBody);
      return jsonResponse({ error: "AI scenario generation failed", detail: errBody }, 500);
    }

    const anthropicData = await anthropicResponse.json();
    const textBlock = anthropicData.content?.find((b: { type: string }) => b.type === "text");
    if (!textBlock?.text) {
      return jsonResponse({ error: "Unexpected AI response format" }, 500);
    }

    let result: ClaudeResponse;
    try {
      result = JSON.parse(textBlock.text);
    } catch {
      console.error("Failed to parse AI JSON:", textBlock.text);
      return jsonResponse({ error: "AI returned invalid JSON", raw: textBlock.text }, 500);
    }

    // Insert scenarios as deal_sheet records
    const startNumber = (existingCount ?? 0) + 1;
    const insertedIds: string[] = [];

    for (let i = 0; i < result.scenarios.length && startNumber + i <= 5; i++) {
      const s = result.scenarios[i];
      const scenarioNumber = startNumber + i;

      const { data: inserted, error: insertError } = await supabase
        .from("deal_sheets")
        .insert({
          opportunity_id: opportunityId,
          name: s.scenario_name,
          scenario_number: scenarioNumber,
          scenario_name: s.scenario_name,
          is_primary: scenarioNumber === 1,
          deal_type: "scattered_lot",
          floor_plan_id: s.floor_plan_id,
          lot_purchase_price: s.lot_purchase_price ?? 0,
          closing_costs: s.closing_costs ?? 0,
          sticks_bricks: s.sticks_bricks ?? 0,
          upgrades: s.upgrades ?? 0,
          soft_costs: s.soft_costs ?? 0,
          land_prep: 0,
          site_specific: 0,
          site_work_total: s.site_work_total ?? 0,
          other_site_costs: 0,
          is_rch_related_owner: true,
          asset_sales_price: s.asset_sales_price ?? 0,
          selling_cost_rate: 0.085,
          selling_concessions: 0,
          ltc_ratio: 0.85,
          interest_rate: 0.1,
          cost_of_capital: 0.16,
          project_duration_days: s.project_duration_days ?? 120,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error(`Scenario insert error (${scenarioNumber}):`, insertError);
        continue;
      }

      if (inserted) {
        insertedIds.push(inserted.id);
      }
    }

    return jsonResponse({
      success: true,
      scenarios_created: insertedIds.length,
      scenario_ids: insertedIds,
    });
  } catch (err) {
    console.error("generate-deal-scenarios unhandled error:", err);
    return jsonResponse(
      {
        error: "Internal server error",
        detail: err instanceof Error ? err.message : String(err),
      },
      500,
    );
  }
});

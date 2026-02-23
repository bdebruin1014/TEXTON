import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getAuthUser } from "../_shared/auth.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LinkedRecord {
  record_type: string;
  record_id: string;
  label: string;
}

interface UploadedFile {
  file_name: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
}

interface RequestPayload {
  moduleKey: string;
  userId: string;
  entityId?: string;
  steps: Record<string, string>;
  linkedRecords?: LinkedRecord[];
  uploadedFiles?: UploadedFile[];
}

// ---------------------------------------------------------------------------
// Per-Module System Prompts
// ---------------------------------------------------------------------------
const BASE_CONTEXT = `You work for VanRock Holdings LLC, a for-sale residential development \
company operating in the Greenville-Spartanburg-Charlotte corridor. The company builds \
through Red Cedar Homes LLC (general contractor) and operates through project-specific SPEs. \
Development types: scattered lot, community development, lot development, and lot purchase — \
all for-sale residential, no rentals.`;

const MODULE_PROMPTS: Record<string, string> = {
  pipeline: `${BASE_CONTEXT}

You are creating a new pipeline opportunity record. Extract structured data from the user's \
description. They may paste emails, listing sheets, or free-form descriptions about a potential \
land/property deal.

Return JSON with these fields:
- opportunity_name (string, max 100 chars — a concise name for this opportunity)
- status (always "New Lead")
- project_type (one of: "Scattered Lot", "Community Development", "Lot Development", "Lot Purchase", or null if unclear)
- source (string or null — where the lead came from)
- estimated_value (number or null — estimated deal value in dollars)
- property_address (string or null)
- address_city (string or null)
- address_state (string, default "SC" if in the corridor area)
- acreage (number or null)
- total_lots (number or null — estimated lot count)
- notes (string — 2-4 sentence summary of the opportunity)

Respond ONLY with valid JSON — no markdown, no explanation.`,

  projects: `${BASE_CONTEXT}

You are creating a new project record. Extract structured data from the user's description \
about a development project. They may paste deal details, partnership terms, or project overviews.

Return JSON with these fields:
- project_name (string, max 100 chars)
- status (always "Pre-Development")
- project_type (one of: "Scattered Lot", "Community Development", "Lot Development", "Lot Purchase", or null)
- entity_name (string or null — the entity/SPE for this project)
- total_lots (number or null)
- total_budget (number or null — estimated total budget in dollars)
- address_city (string or null)
- address_state (string, default "SC" if in the corridor area)
- property_address (string or null)
- notes (string — 2-4 sentence summary)

Respond ONLY with valid JSON — no markdown, no explanation.`,

  construction: `${BASE_CONTEXT}

You are creating a new construction job record. Extract structured data from the user's \
description. They may describe a lot, floor plan, buyer, or spec home build.

Return JSON with these fields:
- lot_number (string or null)
- floor_plan_name (string or null)
- project_name (string or null — the project this job belongs to)
- status (always "Pre-Construction")
- buyer_name (string or null)
- budget_total (number or null — estimated construction budget in dollars)
- start_date (string ISO date or null)
- target_completion (string ISO date or null)
- notes (string — 2-4 sentence summary)

Respond ONLY with valid JSON — no markdown, no explanation.`,

  disposition: `${BASE_CONTEXT}

You are creating a new disposition/sale record. Extract structured data from the user's \
description about a home sale. They may paste buyer inquiries, contract details, or listing info.

Return JSON with these fields:
- lot_number (string or null)
- project_name (string or null)
- buyer_name (string or null)
- status (always "Lead")
- contract_price (number or null — sale price in dollars)
- closing_date (string ISO date or null — expected close date)
- buyer_email (string or null)
- buyer_phone (string or null)
- notes (string — 2-4 sentence summary)

Respond ONLY with valid JSON — no markdown, no explanation.`,

  contacts: `${BASE_CONTEXT}

You are creating a new contact record (a person), and optionally a company record if company \
details are provided. Extract structured data from the user's description. They may paste email \
signatures, website info, or free-form descriptions.

Return JSON with these fields:
- first_name (string or null)
- last_name (string or null)
- email (string or null)
- phone (string or null)
- title (string or null — job title)
- company_name (string or null — the company this person works at)
- company_type (string or null — e.g., "Subcontractor", "Supplier", "Lender", "Attorney", "Realtor", "Title Company", "Engineer", "Surveyor", "Architect")
- company_phone (string or null — company main phone, if different from contact phone)
- company_email (string or null — company main email, if different from contact email)
- company_website (string or null)
- company_address (string or null)
- company_city (string or null)
- company_state (string or null)
- company_notes (string or null — notes about the company)

Respond ONLY with valid JSON — no markdown, no explanation.`,

  investors: `${BASE_CONTEXT}

You are creating a new fund/investment vehicle record. Extract structured data from the \
user's description. They may paste investor communications, fund docs, or term sheets.

Return JSON with these fields:
- name (string, max 100 chars — fund name)
- fund_type (string or null — e.g., "Equity Fund", "Debt Fund", "Joint Venture", "LP Fund")
- vintage_year (number or null)
- total_committed (number or null — target/committed fund size in dollars)
- preferred_return (number or null — e.g., 0.08 for 8%)
- promote_structure (string or null — e.g., "80/20 after 8% pref")
- description (string — 2-4 sentence summary)

Respond ONLY with valid JSON — no markdown, no explanation.`,
};

// ---------------------------------------------------------------------------
// Per-Module Table Config
// ---------------------------------------------------------------------------
interface ModuleTableConfig {
  tableName: string;
  idField: string;
  mapFields: (aiData: Record<string, unknown>, entityId?: string) => Record<string, unknown>;
}

const MODULE_TABLES: Record<string, ModuleTableConfig> = {
  pipeline: {
    tableName: "opportunities",
    idField: "id",
    mapFields: (ai, entityId) => ({
      opportunity_name: ai.opportunity_name ?? "New Opportunity",
      status: "New Lead",
      project_type: ai.project_type ?? null,
      source: ai.source ?? null,
      estimated_value: ai.estimated_value ?? null,
      property_address: ai.property_address ?? null,
      address_city: ai.address_city ?? null,
      address_state: ai.address_state ?? null,
      acreage: ai.acreage ?? null,
      total_lots: ai.total_lots ?? null,
      notes: ai.notes ?? null,
      entity_id: entityId ?? null,
    }),
  },
  projects: {
    tableName: "projects",
    idField: "id",
    mapFields: (ai, entityId) => ({
      project_name: ai.project_name ?? "New Project",
      status: "Pre-Development",
      project_type: ai.project_type ?? null,
      entity_name: ai.entity_name ?? null,
      total_lots: ai.total_lots ?? null,
      total_budget: ai.total_budget ?? null,
      address_city: ai.address_city ?? null,
      address_state: ai.address_state ?? null,
      property_address: ai.property_address ?? null,
      notes: ai.notes ?? null,
      entity_id: entityId ?? null,
    }),
  },
  construction: {
    tableName: "jobs",
    idField: "id",
    mapFields: (ai, entityId) => ({
      lot_number: ai.lot_number ?? "New",
      floor_plan_name: ai.floor_plan_name ?? null,
      project_name: ai.project_name ?? null,
      status: "Pre-Construction",
      buyer_name: ai.buyer_name ?? null,
      budget_total: ai.budget_total ?? null,
      start_date: ai.start_date ?? null,
      target_completion: ai.target_completion ?? null,
      notes: ai.notes ?? null,
      entity_id: entityId ?? null,
    }),
  },
  disposition: {
    tableName: "dispositions",
    idField: "id",
    mapFields: (ai, entityId) => ({
      lot_number: ai.lot_number ?? null,
      project_name: ai.project_name ?? null,
      buyer_name: ai.buyer_name ?? null,
      status: "Lead",
      contract_price: ai.contract_price ?? null,
      closing_date: ai.closing_date ?? null,
      buyer_email: ai.buyer_email ?? null,
      buyer_phone: ai.buyer_phone ?? null,
      notes: ai.notes ?? null,
      entity_id: entityId ?? null,
    }),
  },
  contacts: {
    tableName: "contacts",
    idField: "id",
    mapFields: (ai) => ({
      first_name: ai.first_name ?? null,
      last_name: ai.last_name ?? null,
      name: [ai.first_name, ai.last_name].filter(Boolean).join(" ") || "New Contact",
      email: ai.email ?? null,
      phone: ai.phone ?? null,
      title: ai.title ?? null,
      company: typeof ai.company_name === "string" ? ai.company_name : null,
    }),
  },
  investors: {
    tableName: "funds",
    idField: "id",
    mapFields: (ai, entityId) => ({
      name: ai.name ?? (ai as Record<string, unknown>).fund_name ?? "New Fund",
      fund_type: ai.fund_type ?? null,
      vintage_year: ai.vintage_year ?? null,
      total_committed: ai.total_committed ?? null,
      preferred_return: ai.preferred_return ?? null,
      promote_structure: ai.promote_structure ?? null,
      status: "Active",
      description: ai.description ?? null,
      entity_id: entityId ?? null,
    }),
  },
};

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
  // ── Preflight ───────────────────────────────────────────────────────────
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

    // ── Parse & validate request ────────────────────────────────────────
    const payload: RequestPayload = await req.json();
    const { moduleKey, userId, entityId, steps = {}, linkedRecords = [], uploadedFiles = [] } = payload;

    if (!moduleKey || !userId) {
      return jsonResponse({ error: "Missing required fields: moduleKey and userId are required" }, 400);
    }

    const systemPrompt = MODULE_PROMPTS[moduleKey];
    const tableConfig = MODULE_TABLES[moduleKey];
    if (!systemPrompt || !tableConfig) {
      return jsonResponse({ error: `Unknown module: ${moduleKey}` }, 400);
    }

    // ── Supabase client (service role — bypasses RLS) ───────────────────
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ── Fetch linked-record context for the Claude prompt ───────────────
    const contextParts: string[] = [];

    const projectIds = linkedRecords.filter((r) => r.record_type === "project").map((r) => r.record_id);
    const opportunityIds = linkedRecords.filter((r) => r.record_type === "opportunity").map((r) => r.record_id);
    const contactIds = linkedRecords.filter((r) => r.record_type === "contact").map((r) => r.record_id);

    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from("projects")
        .select("id, project_name, status, project_type, entity_name, address_city, address_state")
        .in("id", projectIds);

      if (projects?.length) {
        contextParts.push(
          "LINKED PROJECTS:\n" +
            projects
              .map(
                (p: Record<string, unknown>) =>
                  `- ${p.project_name} (${p.project_type ?? "N/A"}) — Status: ${p.status}, Location: ${p.address_city ?? ""}${p.address_state ? ", " + p.address_state : ""}`,
              )
              .join("\n"),
        );
      }
    }

    if (opportunityIds.length > 0) {
      const { data: opportunities } = await supabase
        .from("opportunities")
        .select("id, opportunity_name, status, project_type, address_city, address_state, estimated_value")
        .in("id", opportunityIds);

      if (opportunities?.length) {
        contextParts.push(
          "LINKED OPPORTUNITIES:\n" +
            opportunities
              .map(
                (o: Record<string, unknown>) =>
                  `- ${o.opportunity_name} (${o.project_type ?? "N/A"}) — Status: ${o.status}, Est. Value: ${o.estimated_value ? "$" + Number(o.estimated_value).toLocaleString() : "N/A"}`,
              )
              .join("\n"),
        );
      }
    }

    if (contactIds.length > 0) {
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, company, email, phone, title")
        .in("id", contactIds);

      if (contacts?.length) {
        contextParts.push(
          "LINKED CONTACTS:\n" +
            contacts
              .map(
                (c: Record<string, unknown>) =>
                  `- ${c.first_name ?? ""} ${c.last_name ?? ""} — ${c.title ?? ""} at ${c.company ?? "N/A"}, Email: ${c.email ?? "N/A"}`,
              )
              .join("\n"),
        );
      }
    }

    // ── Build user prompt from all step texts ────────────────────────────
    const stepEntries = Object.entries(steps).filter(([_, v]) => v?.trim());
    const stepText = stepEntries.map(([key, value]) => `${key.toUpperCase()}:\n${value}`).join("\n\n");

    const linkedContext =
      contextParts.length > 0 ? "\n\n--- LINKED RECORD CONTEXT ---\n" + contextParts.join("\n\n") : "";

    const fileContext =
      uploadedFiles.length > 0
        ? "\n\n--- UPLOADED FILES ---\n" + uploadedFiles.map((f) => `- ${f.file_name} (${f.mime_type})`).join("\n")
        : "";

    const userPrompt = `${stepText}${linkedContext}${fileContext}\n\nToday's date is ${new Date().toISOString().split("T")[0]}.`;

    // ── Call Claude API ─────────────────────────────────────────────────
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
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!anthropicResponse.ok) {
      const errBody = await anthropicResponse.text();
      console.error("Anthropic API error:", anthropicResponse.status, errBody);
      return jsonResponse({ error: "AI record generation failed", detail: errBody }, 500);
    }

    const anthropicData = await anthropicResponse.json();

    // Extract text content
    const textBlock = anthropicData.content?.find((b: { type: string }) => b.type === "text");
    if (!textBlock?.text) {
      return jsonResponse({ error: "Unexpected AI response format — no text block found" }, 500);
    }

    let aiData: Record<string, unknown>;
    try {
      aiData = JSON.parse(textBlock.text);
    } catch {
      console.error("Failed to parse AI JSON:", textBlock.text);
      return jsonResponse({ error: "AI returned invalid JSON", raw: textBlock.text }, 500);
    }

    // ── Insert record ────────────────────────────────────────────────────
    const insertData = tableConfig.mapFields(aiData, entityId);

    // For contacts: create company record first if company details provided
    if (moduleKey === "contacts" && aiData.company_name) {
      const companyData: Record<string, unknown> = {
        name: aiData.company_name,
        company_type: aiData.company_type ?? null,
        phone: aiData.company_phone ?? null,
        email: aiData.company_email ?? null,
        website: aiData.company_website ?? null,
        address: aiData.company_address ?? null,
        city: aiData.company_city ?? null,
        state: aiData.company_state ?? null,
        notes: aiData.company_notes ?? null,
        entity_id: entityId ?? null,
      };
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert(companyData)
        .select("id")
        .single();
      if (companyError) {
        console.warn("Company insert failed (may already exist):", companyError.message);
      } else if (company) {
        (insertData as Record<string, unknown>).company_id = company.id;
      }
    }

    // Validate mapped fields against known columns (log warnings for unknowns)
    const knownColumns: Record<string, string[]> = {
      opportunities: ["opportunity_name", "status", "project_type", "source", "estimated_value", "property_address", "address_city", "address_state", "acreage", "total_lots", "notes", "entity_id"],
      projects: ["project_name", "status", "project_type", "entity_name", "total_lots", "total_budget", "address_city", "address_state", "property_address", "notes", "entity_id"],
      jobs: ["lot_number", "floor_plan_name", "project_name", "status", "buyer_name", "budget_total", "start_date", "target_completion", "notes", "entity_id"],
      dispositions: ["lot_number", "project_name", "buyer_name", "status", "contract_price", "closing_date", "buyer_email", "buyer_phone", "notes", "entity_id"],
      contacts: ["first_name", "last_name", "name", "email", "phone", "title", "company", "company_id"],
      funds: ["name", "fund_type", "vintage_year", "total_committed", "preferred_return", "promote_structure", "status", "description", "entity_id"],
    };
    const allowed = knownColumns[tableConfig.tableName];
    if (allowed) {
      for (const key of Object.keys(insertData as Record<string, unknown>)) {
        if (!allowed.includes(key)) {
          console.warn(`[generate-record] Unmapped field "${key}" for table "${tableConfig.tableName}" — skipping`);
          delete (insertData as Record<string, unknown>)[key];
        }
      }
    }

    const { data: record, error: insertError } = await supabase
      .from(tableConfig.tableName)
      .insert(insertData)
      .select("id")
      .single();

    if (insertError || !record) {
      console.error(`${moduleKey} insert error:`, insertError);
      return jsonResponse({ error: `Failed to create ${moduleKey} record`, detail: insertError?.message }, 500);
    }

    // ── Return success ───────────────────────────────────────────────────
    return jsonResponse({
      success: true,
      record_id: record.id,
      record_type: moduleKey,
    });
  } catch (err) {
    console.error("generate-record unhandled error:", err);
    return jsonResponse(
      {
        error: "Internal server error",
        detail: err instanceof Error ? err.message : String(err),
      },
      500,
    );
  }
});

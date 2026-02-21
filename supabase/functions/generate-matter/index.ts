import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LinkedRecord {
  record_type: "project" | "opportunity" | "entity" | "contact" | "matter";
  record_id: string;
  relationship_description?: string;
}

interface UploadedFile {
  file_name: string;
  file_url?: string;
  storage_path?: string;
  file_size?: number;
  mime_type?: string;
  document_type?: string;
}

interface RequestPayload {
  userId: string;
  /** Direct fields (legacy) */
  situationText?: string;
  relevantInfoText?: string;
  goalsText?: string;
  /** Generic intake payload (from AIIntakePage) */
  steps?: Record<string, string>;
  entityId?: string;
  moduleKey?: string;
  linkedRecords?: LinkedRecord[];
  uploadedFiles?: UploadedFile[];
}

interface WorkflowStep {
  step_order: number;
  step_type: string;
  title: string;
  description: string;
  suggested_due_offset_days: number;
  depends_on: number[];
}

interface ContactRole {
  contact_id: string;
  suggested_role: string;
}

interface ClaudeWorkflowResponse {
  title: string;
  category: string;
  priority: string;
  situation_summary: string;
  relevant_information: string;
  goals_and_deliverables: string;
  target_completion_date: string;
  workflow_steps: WorkflowStep[];
  contact_roles: ContactRole[];
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are a workflow generation engine for VanRock Holdings LLC, a for-sale \
residential development company operating in the Greenville-Spartanburg-Charlotte \
corridor. The company builds through Red Cedar Homes LLC (general contractor) \
and operates through project-specific SPEs. Development types: scattered lot, \
community development, lot development, and lot purchase — all for-sale \
residential, no rentals.

Take a conversational intake about a "matter" (a one-off workflow item outside \
standard project operations) and produce structured JSON with:

1. title (max 80 chars)
2. category (one of: contract_dispute, refinance, insurance_claim, legal, compliance, zoning, permitting, partnership, vendor_dispute, title_issue, environmental, tax, investor_relations, construction_defect, other)
3. priority (critical/high/medium/low)
4. situation_summary (2-4 sentences)
5. relevant_information (2-4 sentences)
6. goals_and_deliverables (2-4 sentences)
7. target_completion_date (ISO date string YYYY-MM-DD)
8. workflow_steps: array of 5-15 steps, each with:
   - step_order (int starting at 1)
   - step_type (milestone/task/deliverable/decision_point/review)
   - title (string)
   - description (string)
   - suggested_due_offset_days (int, days from today)
   - depends_on (array of step_order ints that must complete first)
9. contact_roles: array of { contact_id, suggested_role } for any linked contacts

Front-load information gathering. Include decision points. End with resolution.
Respond ONLY with valid JSON — no markdown, no explanation.`;

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
    // ── Parse & validate request ────────────────────────────────────────
    const payload: RequestPayload = await req.json();

    const { userId, steps = {}, linkedRecords = [], uploadedFiles = [] } = payload;

    // Support both direct fields (legacy) and generic steps payload (AIIntakePage)
    const situationText = payload.situationText || steps.situationText || "";
    const relevantInfoText = payload.relevantInfoText || steps.relevantInfoText || "";
    const goalsText = payload.goalsText || steps.goalsText || "";

    if (!userId || !situationText) {
      return jsonResponse({ error: "Missing required fields: userId and situationText are required" }, 400);
    }

    // ── Supabase client (service role — bypasses RLS) ───────────────────
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ── Fetch linked-record context for the Claude prompt ───────────────
    const contextParts: string[] = [];

    const projectIds = linkedRecords.filter((r) => r.record_type === "project").map((r) => r.record_id);
    const opportunityIds = linkedRecords.filter((r) => r.record_type === "opportunity").map((r) => r.record_id);
    const entityIds = linkedRecords.filter((r) => r.record_type === "entity").map((r) => r.record_id);
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
                (p) =>
                  `- ${p.project_name} (${p.project_type ?? "N/A"}) — Status: ${p.status}, Entity: ${p.entity_name ?? "N/A"}, Location: ${p.address_city ?? ""}${p.address_state ? ", " + p.address_state : ""}`,
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
                (o) =>
                  `- ${o.opportunity_name} (${o.project_type ?? "N/A"}) — Status: ${o.status}, Location: ${o.address_city ?? ""}${o.address_state ? ", " + o.address_state : ""}, Est. Value: ${o.estimated_value ? "$" + Number(o.estimated_value).toLocaleString() : "N/A"}`,
              )
              .join("\n"),
        );
      }
    }

    if (entityIds.length > 0) {
      const { data: entities } = await supabase
        .from("entities")
        .select("id, name, entity_type, status")
        .in("id", entityIds);

      if (entities?.length) {
        contextParts.push(
          "LINKED ENTITIES:\n" +
            entities.map((e) => `- ${e.name} (${e.entity_type ?? "N/A"}) — Status: ${e.status}`).join("\n"),
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
                (c) =>
                  `- ${c.first_name ?? ""} ${c.last_name ?? ""} — ${c.title ?? ""} at ${c.company ?? "N/A"}, Email: ${c.email ?? "N/A"}, Phone: ${c.phone ?? "N/A"} (contact_id: ${c.id})`,
              )
              .join("\n"),
        );
      }
    }

    // ── Build user prompt ───────────────────────────────────────────────
    const linkedContext =
      contextParts.length > 0 ? "\n\n--- LINKED RECORD CONTEXT ---\n" + contextParts.join("\n\n") : "";

    const userPrompt = `SITUATION:\n${situationText}\n\nRELEVANT INFORMATION:\n${relevantInfoText || "None provided."}\n\nGOALS:\n${goalsText || "None provided."}${linkedContext}\n\nToday's date is ${new Date().toISOString().split("T")[0]}.`;

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
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!anthropicResponse.ok) {
      const errBody = await anthropicResponse.text();
      console.error("Anthropic API error:", anthropicResponse.status, errBody);
      return jsonResponse({ error: "AI workflow generation failed", detail: errBody }, 500);
    }

    const anthropicData = await anthropicResponse.json();

    // Extract text content from the Claude response
    const textBlock = anthropicData.content?.find((b: { type: string }) => b.type === "text");
    if (!textBlock?.text) {
      return jsonResponse({ error: "Unexpected AI response format — no text block found" }, 500);
    }

    let workflow: ClaudeWorkflowResponse;
    try {
      workflow = JSON.parse(textBlock.text);
    } catch {
      console.error("Failed to parse AI JSON:", textBlock.text);
      return jsonResponse({ error: "AI returned invalid JSON", raw: textBlock.text }, 500);
    }

    // ── Determine first-class linked IDs for the matter record ──────────
    const linkedProjectId = projectIds.length > 0 ? projectIds[0] : null;
    const linkedOpportunityId = opportunityIds.length > 0 ? opportunityIds[0] : null;
    const linkedEntityId = entityIds.length > 0 ? entityIds[0] : null;

    // ── 1. Insert matter record ─────────────────────────────────────────
    const { data: matter, error: matterError } = await supabase
      .from("matters")
      .insert({
        title: workflow.title,
        category: workflow.category,
        priority: workflow.priority,
        status: "open",
        situation_summary: workflow.situation_summary,
        relevant_information: workflow.relevant_information,
        goals_and_deliverables: workflow.goals_and_deliverables,
        target_completion_date: workflow.target_completion_date,
        intake_conversation: {
          situation: situationText,
          relevant_info: relevantInfoText,
          goals: goalsText,
        },
        ai_generated_workflow: workflow,
        linked_project_id: linkedProjectId,
        linked_opportunity_id: linkedOpportunityId,
        linked_entity_id: linkedEntityId,
        created_by: userId,
      })
      .select("id, matter_number")
      .single();

    if (matterError || !matter) {
      console.error("Matter insert error:", matterError);
      return jsonResponse({ error: "Failed to create matter record", detail: matterError?.message }, 500);
    }

    const matterId: string = matter.id;

    // ── 2. Insert workflow steps (resolve step_order → UUID deps) ───────
    const today = new Date();
    const stepOrderToId: Map<number, string> = new Map();

    // Insert steps sequentially so we can capture each UUID
    for (const step of workflow.workflow_steps ?? []) {
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + (step.suggested_due_offset_days ?? 0));

      // Resolve depends_on step_order ints to previously-inserted UUIDs
      const resolvedDeps: string[] = (step.depends_on ?? [])
        .map((orderInt: number) => stepOrderToId.get(orderInt))
        .filter((id): id is string => !!id);

      const { data: insertedStep, error: stepError } = await supabase
        .from("matter_workflow_steps")
        .insert({
          matter_id: matterId,
          step_order: step.step_order,
          step_type: step.step_type,
          title: step.title,
          description: step.description,
          status: "pending",
          due_date: dueDate.toISOString().split("T")[0],
          depends_on: resolvedDeps.length > 0 ? resolvedDeps : null,
          ai_generated: true,
        })
        .select("id")
        .single();

      if (stepError) {
        console.error(`Step insert error (step_order ${step.step_order}):`, stepError);
        // Continue inserting remaining steps rather than aborting entirely
        continue;
      }

      if (insertedStep) {
        stepOrderToId.set(step.step_order, insertedStep.id);
      }
    }

    // ── 3. Insert contact links with AI-suggested roles ─────────────────
    if (workflow.contact_roles?.length) {
      const contactRows = workflow.contact_roles.map((cr) => ({
        matter_id: matterId,
        contact_id: cr.contact_id,
        role: cr.suggested_role,
      }));

      const { error: contactError } = await supabase.from("matter_contacts").insert(contactRows);

      if (contactError) {
        console.error("Contact link insert error:", contactError);
      }
    }

    // ── 4. Insert linked records ────────────────────────────────────────
    if (linkedRecords.length > 0) {
      const linkedRows = linkedRecords.map((lr) => ({
        matter_id: matterId,
        record_type: lr.record_type,
        record_id: lr.record_id,
        relationship_description: lr.relationship_description ?? null,
      }));

      const { error: linkedError } = await supabase.from("matter_linked_records").insert(linkedRows);

      if (linkedError) {
        console.error("Linked records insert error:", linkedError);
      }
    }

    // ── 5. Insert document references from uploaded files ────────────────
    if (uploadedFiles.length > 0) {
      const docRows = uploadedFiles.map((f) => ({
        matter_id: matterId,
        file_name: f.file_name,
        file_url: f.file_url ?? null,
        storage_path: f.storage_path ?? null,
        file_size: f.file_size ?? null,
        mime_type: f.mime_type ?? null,
        document_type: f.document_type ?? "other",
        uploaded_by: userId,
      }));

      const { error: docError } = await supabase.from("matter_documents").insert(docRows);

      if (docError) {
        console.error("Document insert error:", docError);
      }
    }

    // ── 6. Return success ───────────────────────────────────────────────
    return jsonResponse({
      success: true,
      record_id: matterId,
      matter_id: matterId,
      matter_number: matter.matter_number,
    });
  } catch (err) {
    console.error("generate-matter unhandled error:", err);
    return jsonResponse(
      {
        error: "Internal server error",
        detail: err instanceof Error ? err.message : String(err),
      },
      500,
    );
  }
});

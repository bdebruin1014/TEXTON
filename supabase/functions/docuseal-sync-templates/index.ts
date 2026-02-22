import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getAuthUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await getAuthUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { entityId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get DocuSeal config
    const { data: config, error: configError } = await supabase
      .from("docuseal_config")
      .select("*")
      .eq("entity_id", entityId)
      .eq("is_active", true)
      .single();

    if (configError || !config) {
      return new Response(JSON.stringify({ error: "DocuSeal not configured for this entity" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch templates from DocuSeal API
    const response = await fetch(`${config.api_url}/templates`, {
      headers: {
        "X-Auth-Token": config.api_key,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(JSON.stringify({ error: `DocuSeal API error: ${response.status} ${text}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const templates = await response.json();
    let synced = 0;

    // Upsert each template
    for (const tmpl of templates.data ?? templates) {
      const { error: upsertError } = await supabase.from("esign_templates").upsert(
        {
          external_id: String(tmpl.id),
          docuseal_template_id: tmpl.id,
          name: tmpl.name,
          description: tmpl.description ?? null,
          provider: "docuseal",
          status: "Active",
          docuseal_schema: tmpl.schema ?? tmpl.fields ?? {},
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "external_id" },
      );

      if (!upsertError) synced++;
    }

    return new Response(JSON.stringify({ success: true, synced }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

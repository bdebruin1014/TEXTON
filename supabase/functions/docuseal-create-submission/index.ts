import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { entityId, documentId, templateId, signers, fieldValues } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get DocuSeal config
    const { data: config } = await supabase
      .from("docuseal_config")
      .select("*")
      .eq("entity_id", entityId)
      .eq("is_active", true)
      .single();

    if (!config) {
      return new Response(JSON.stringify({ error: "DocuSeal not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get template's DocuSeal ID
    const { data: template } = await supabase
      .from("esign_templates")
      .select("docuseal_template_id")
      .eq("id", templateId)
      .single();

    if (!template?.docuseal_template_id) {
      return new Response(JSON.stringify({ error: "Template not synced with DocuSeal" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create submission in DocuSeal
    const submissionPayload = {
      template_id: template.docuseal_template_id,
      send_email: true,
      submitters: signers.map((s: { name: string; email: string; role: string }, idx: number) => ({
        name: s.name,
        email: s.email,
        role: s.role || `Signer ${idx + 1}`,
        fields: fieldValues?.[idx] ?? [],
      })),
    };

    const response = await fetch(`${config.api_url}/submissions`, {
      method: "POST",
      headers: {
        "X-Auth-Token": config.api_key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submissionPayload),
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(JSON.stringify({ error: `DocuSeal API error: ${response.status} ${text}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const submission = await response.json();
    const submissionData = Array.isArray(submission) ? submission : [submission];
    const submissionId = submissionData[0]?.submission_id ?? submissionData[0]?.id;

    // Update esign_document with submission info
    await supabase
      .from("esign_documents")
      .update({
        docuseal_submission_id: submissionId,
        docuseal_status: "pending",
        status: "Sent",
        sent_date: new Date().toISOString(),
        field_values: fieldValues ?? {},
      })
      .eq("id", documentId);

    // Create/update signer records
    for (const [idx, submitter] of submissionData.entries()) {
      const signerInput = signers[idx];
      if (!signerInput) continue;

      await supabase.from("esign_signers").upsert(
        {
          document_id: documentId,
          name: signerInput.name,
          email: signerInput.email,
          role: signerInput.role || `Signer ${idx + 1}`,
          status: "Sent",
          sort_order: idx,
          docuseal_signer_id: submitter.id,
          embed_url: submitter.embed_src ?? null,
        },
        { onConflict: "document_id,email" },
      );
    }

    return new Response(JSON.stringify({ success: true, submissionId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

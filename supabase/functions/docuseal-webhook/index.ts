import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify webhook secret — DocuSeal sends this in the X-Webhook-Secret header
    const webhookSecret = Deno.env.get("DOCUSEAL_WEBHOOK_SECRET");
    if (webhookSecret) {
      const providedSecret =
        req.headers.get("x-webhook-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
      if (providedSecret !== webhookSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const event = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const eventType = event.event_type ?? event.type;
    const submissionId = event.data?.submission_id ?? event.submission_id;
    const submitterId = event.data?.id ?? event.submitter_id;

    if (!eventType || !submissionId) {
      return new Response(JSON.stringify({ error: "Missing event_type or submission_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the document by submission ID
    const { data: doc } = await supabase
      .from("esign_documents")
      .select("id, webhook_events")
      .eq("docuseal_submission_id", submissionId)
      .single();

    if (!doc) {
      return new Response(JSON.stringify({ error: "Document not found for submission" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Append webhook event to history
    const events = Array.isArray(doc.webhook_events) ? doc.webhook_events : [];
    events.push({ ...event, received_at: new Date().toISOString() });

    // Map DocuSeal events to our status
    const statusMap: Record<string, { docStatus: string; signerStatus: string }> = {
      "form.viewed": { docStatus: "Viewed", signerStatus: "Viewed" },
      "form.started": { docStatus: "Viewed", signerStatus: "Viewed" },
      "form.completed": { docStatus: "Partially Signed", signerStatus: "Signed" },
      "submission.completed": { docStatus: "Completed", signerStatus: "Signed" },
      "submission.archived": { docStatus: "Voided", signerStatus: "Declined" },
    };

    const mapping = statusMap[eventType];

    if (mapping) {
      // Update document status
      const docUpdate: Record<string, unknown> = {
        docuseal_status: eventType,
        webhook_events: events,
      };

      if (eventType === "submission.completed") {
        docUpdate.status = "Completed";
        docUpdate.completed_date = new Date().toISOString();
        docUpdate.completed_document_url = event.data?.documents?.[0]?.url ?? null;
      } else if (eventType === "submission.archived") {
        docUpdate.status = "Voided";
        docUpdate.voided_date = new Date().toISOString();
      } else {
        // For partial events, check if any signers have signed
        const { data: signers } = await supabase.from("esign_signers").select("status").eq("document_id", doc.id);

        const hasSigned = signers?.some((s) => s.status === "Signed");
        docUpdate.status = hasSigned ? "Partially Signed" : mapping.docStatus;
      }

      await supabase.from("esign_documents").update(docUpdate).eq("id", doc.id);

      // Update signer status
      if (submitterId && mapping.signerStatus) {
        const signerUpdate: Record<string, unknown> = {
          status: mapping.signerStatus,
        };
        if (mapping.signerStatus === "Signed") {
          signerUpdate.signed_date = new Date().toISOString();
          signerUpdate.completed_at = new Date().toISOString();
        }

        await supabase.from("esign_signers").update(signerUpdate).eq("docuseal_signer_id", submitterId);
      }
    } else {
      // Unknown event — just store it
      await supabase.from("esign_documents").update({ webhook_events: events }).eq("id", doc.id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

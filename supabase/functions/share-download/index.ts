import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { token, documentId } = await req.json();

  if (!token || !documentId) {
    return new Response(JSON.stringify({ error: "Missing token or documentId" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Validate share token
  const { data: share } = await supabase
    .from("document_shares")
    .select("*, items:document_share_items(document_id)")
    .eq("share_token", token)
    .eq("status", "active")
    .single();

  if (!share || !share.allow_download) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check expiration
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return new Response(JSON.stringify({ error: "Share link has expired" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // SECURITY: Verify the requested document belongs to this share
  const shareDocIds = (share.items ?? []).map((i: { document_id: string }) => i.document_id);
  if (!shareDocIds.includes(documentId)) {
    return new Response(JSON.stringify({ error: "Document not in share" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get document
  const { data: doc } = await supabase.from("documents").select("*").eq("id", documentId).single();

  if (!doc) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Generate signed URL (60 minutes)
  const { data: signedUrl } = await supabase.storage.from(doc.storage_bucket).createSignedUrl(doc.storage_path, 3600);

  // Log download
  await supabase.from("document_share_access_log").insert({
    share_id: share.id,
    action: "file_downloaded",
    document_id: documentId,
    ip_address: req.headers.get("x-forwarded-for")?.split(",")[0],
    user_agent: req.headers.get("user-agent"),
  });

  // Increment download counter
  await supabase
    .from("document_shares")
    .update({ total_downloads: share.total_downloads + 1 })
    .eq("id", share.id);

  return new Response(JSON.stringify({ url: signedUrl?.signedUrl }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

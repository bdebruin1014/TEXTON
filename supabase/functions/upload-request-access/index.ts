import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response(JSON.stringify({ error: "Missing token" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: request } = await supabase
    .from("upload_requests")
    .select(
      `
      *,
      items:upload_request_items(
        id, name, description, is_required, sort_order, status,
        accepted_extensions, max_file_size, fulfilled_at
      )
    `,
    )
    .eq("request_token", token)
    .in("status", ["pending", "partial"])
    .single();

  if (!request) {
    return new Response(JSON.stringify({ error: "Request not found or expired" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (request.expires_at && new Date(request.expires_at) < new Date()) {
    await supabase.from("upload_requests").update({ status: "expired" }).eq("id", request.id);
    return new Response(JSON.stringify({ error: "This upload request has expired" }), {
      status: 410,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Log access
  await supabase.from("upload_request_access_log").insert({
    request_id: request.id,
    action: "page_viewed",
    ip_address: req.headers.get("x-forwarded-for")?.split(",")[0],
    user_agent: req.headers.get("user-agent"),
  });

  await supabase
    .from("upload_requests")
    .update({
      access_count: request.access_count + 1,
      last_accessed_at: new Date().toISOString(),
    })
    .eq("id", request.id);

  const items = (request.items ?? []).sort(
    (a: Record<string, number>, b: Record<string, number>) => a.sort_order - b.sort_order,
  );

  return new Response(
    JSON.stringify({
      request: {
        id: request.id,
        subject: request.subject,
        message: request.message,
        recipient_name: request.recipient_name,
        due_date: request.due_date,
        created_by_name: null,
        created_at: request.created_at,
        status: request.status,
      },
      items,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

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

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Look up share
  const { data: share, error } = await supabase
    .from("document_shares")
    .select(
      `
      *,
      items:document_share_items(
        *,
        document:documents(id, name, original_filename, file_extension, mime_type, file_size, updated_at)
      ),
      folder:document_folders(id, name)
    `,
    )
    .eq("share_token", token)
    .eq("status", "active")
    .single();

  if (error || !share) {
    return new Response(JSON.stringify({ error: "Share not found or expired" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check expiration
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    await supabase.from("document_shares").update({ status: "expired" }).eq("id", share.id);
    return new Response(JSON.stringify({ error: "This share link has expired" }), {
      status: 410,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check access count limit
  if (share.max_access_count && share.access_count >= share.max_access_count) {
    return new Response(JSON.stringify({ error: "Access limit reached" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get documents based on share type
  let documents = [];
  let folders: unknown[] = [];

  if (share.share_type === "selection") {
    documents = (share.items ?? []).map((item: Record<string, unknown>) => item.document).filter(Boolean);
  } else if (share.share_type === "folder") {
    let folderIds = [share.folder_id];

    if (share.include_subfolders) {
      // Get all descendant folders
      const { data: allFolders } = await supabase
        .from("document_folders")
        .select("id, parent_id")
        .eq("record_type", share.record_type)
        .eq("record_id", share.record_id);

      if (allFolders) {
        const descendants = new Set<string>([share.folder_id]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const f of allFolders) {
            if (f.parent_id && descendants.has(f.parent_id) && !descendants.has(f.id)) {
              descendants.add(f.id);
              changed = true;
            }
          }
        }
        folderIds = Array.from(descendants);
      }
    }

    const { data: docs } = await supabase
      .from("documents")
      .select("id, name, original_filename, file_extension, mime_type, file_size, updated_at, folder_id")
      .in("folder_id", folderIds)
      .eq("status", "active")
      .order("name");

    documents = docs ?? [];

    const { data: folderData } = await supabase
      .from("document_folders")
      .select("id, name, parent_id, sort_order")
      .in("id", folderIds)
      .order("sort_order");

    folders = folderData ?? [];
  }

  // Log access
  await supabase.from("document_share_access_log").insert({
    share_id: share.id,
    action: "page_viewed",
    ip_address: req.headers.get("x-forwarded-for")?.split(",")[0] ?? null,
    user_agent: req.headers.get("user-agent"),
    referrer: req.headers.get("referer"),
  });

  // Increment access count
  // Note: minor race condition on concurrent access - acceptable for analytics counter
  await supabase
    .from("document_shares")
    .update({
      access_count: share.access_count + 1,
      last_accessed_at: new Date().toISOString(),
    })
    .eq("id", share.id);

  return new Response(
    JSON.stringify({
      share: {
        id: share.id,
        share_type: share.share_type,
        recipient_name: share.recipient_name,
        message: share.message,
        allow_download: share.allow_download,
        created_by_name: null,
        created_at: share.created_at,
        expires_at: share.expires_at,
        has_password: !!share.password_hash,
        folder_name: share.folder?.name,
        folders,
      },
      documents,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

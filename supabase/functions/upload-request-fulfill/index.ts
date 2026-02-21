import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const formData = await req.formData();
  const token = formData.get("token") as string;
  const itemId = formData.get("item_id") as string;
  const file = formData.get("file") as File;

  if (!token || !itemId || !file) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Validate request token
  const { data: request } = await supabase
    .from("upload_requests")
    .select("*, items:upload_request_items(*)")
    .eq("request_token", token)
    .in("status", ["pending", "partial"])
    .single();

  if (!request) {
    return new Response(JSON.stringify({ error: "Invalid or expired request" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Find the specific item
  const item = (request.items ?? []).find((i: Record<string, string>) => i.id === itemId);
  if (!item) {
    return new Response(JSON.stringify({ error: "Item not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (item.status === "uploaded" || item.status === "accepted") {
    return new Response(JSON.stringify({ error: "Item already fulfilled" }), {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate file extension if constrained
  if (item.accepted_extensions?.length) {
    const ext = file.name.includes(".") ? "." + file.name.split(".").pop()?.toLowerCase() : "";
    if (!item.accepted_extensions.includes(ext)) {
      return new Response(
        JSON.stringify({
          error: `File type not accepted. Expected: ${item.accepted_extensions.join(", ")}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  // Validate file size
  if (item.max_file_size && file.size > item.max_file_size) {
    return new Response(
      JSON.stringify({
        error: `File too large. Maximum: ${(item.max_file_size / 1048576).toFixed(0)}MB`,
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Determine destination
  const destinationFolderId = item.destination_folder_id || request.destination_folder_id;
  const bucket =
    request.record_type === "job"
      ? "job-docs"
      : request.record_type === "disposition"
        ? "disposition-docs"
        : "project-docs";

  const storagePath = `${request.record_id}/uploads/${request.id}/${file.name}`;

  // Upload file
  const fileBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, fileBuffer, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    return new Response(JSON.stringify({ error: "Upload failed: " + uploadError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Create document record
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({
      record_type: request.record_type,
      record_id: request.record_id,
      folder_id: destinationFolderId,
      file_name: file.name,
      storage_path: storagePath,
      storage_bucket: bucket,
      file_type: file.type,
      file_size: file.size,
      source: "upload",
      tags: item.auto_tag ? [item.auto_tag] : [],
      description: `Uploaded by ${request.recipient_name} via upload request: ${request.subject}`,
    })
    .select()
    .single();

  if (docError) {
    return new Response(JSON.stringify({ error: "Failed to create document record" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Mark item as fulfilled
  await supabase
    .from("upload_request_items")
    .update({
      status: "uploaded",
      fulfilled_document_id: doc.id,
      fulfilled_at: new Date().toISOString(),
    })
    .eq("id", itemId);

  // Log activity
  await supabase.from("upload_request_access_log").insert({
    request_id: request.id,
    action: "file_uploaded",
    item_id: itemId,
    document_id: doc.id,
    ip_address: req.headers.get("x-forwarded-for")?.split(",")[0],
    user_agent: req.headers.get("user-agent"),
  });

  return new Response(
    JSON.stringify({
      success: true,
      document_id: doc.id,
      item_status: "uploaded",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

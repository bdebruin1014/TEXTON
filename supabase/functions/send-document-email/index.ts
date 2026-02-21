import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "notifications@tekton.app";
const APP_URL = Deno.env.get("APP_URL") || "https://tekton.app";

interface EmailPayload {
  template: "share_notification" | "upload_request" | "upload_complete" | "reminder";
  share_id?: string;
  request_id?: string;
  recipient_email: string;
  recipient_name?: string;
}

function buildShareEmail(share: Record<string, unknown>): { subject: string; html: string } {
  const subject = `Documents shared with you — ${share.subject || "Tekton"}`;
  const shareUrl = `${APP_URL}/share/${share.share_token}`;

  const html = `
    <div style="max-width:560px;margin:0 auto;font-family:system-ui,sans-serif;color:#1a1a1a">
      <div style="text-align:center;padding:32px 0 16px">
        <div style="display:inline-block;background:#1B3022;color:white;font-weight:bold;font-size:12px;padding:8px 12px;border-radius:8px">TEK</div>
      </div>
      <div style="background:white;border:1px solid #E2E8F0;border-radius:12px;padding:32px">
        <p>Documents have been shared with you.</p>
        ${share.message ? `<blockquote style="border-left:3px solid #E2E8F0;margin:16px 0;padding:8px 16px;color:#64748b;font-style:italic">"${share.message}"</blockquote>` : ""}
        <div style="text-align:center;margin:24px 0">
          <a href="${shareUrl}" style="display:inline-block;background:#1B3022;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">View Documents →</a>
        </div>
        ${share.expires_at ? `<p style="font-size:12px;color:#94a3b8;text-align:center">This link expires ${new Date(share.expires_at as string).toLocaleDateString()}</p>` : ""}
      </div>
      <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:16px">Powered by Tekton</p>
    </div>
  `;

  return { subject, html };
}

function buildUploadRequestEmail(
  request: Record<string, unknown>,
  items: Record<string, unknown>[],
): { subject: string; html: string } {
  const subject = `Documents requested — ${request.subject}`;
  const uploadUrl = `${APP_URL}/upload/${request.request_token}`;

  const itemsList = items
    .map(
      (i) =>
        `<li style="padding:4px 0">${i.is_required ? "☐" : "☐"} ${i.name}${i.is_required ? " <span style='color:#ef4444'>(required)</span>" : ""}</li>`,
    )
    .join("");

  const html = `
    <div style="max-width:560px;margin:0 auto;font-family:system-ui,sans-serif;color:#1a1a1a">
      <div style="text-align:center;padding:32px 0 16px">
        <div style="display:inline-block;background:#1B3022;color:white;font-weight:bold;font-size:12px;padding:8px 12px;border-radius:8px">TEK</div>
      </div>
      <div style="background:white;border:1px solid #E2E8F0;border-radius:12px;padding:32px">
        <h2 style="font-size:16px;margin:0 0 8px">${request.subject}</h2>
        ${request.message ? `<blockquote style="border-left:3px solid #E2E8F0;margin:16px 0;padding:8px 16px;color:#64748b;font-style:italic">"${request.message}"</blockquote>` : ""}
        <ul style="list-style:none;padding:0;margin:16px 0">${itemsList}</ul>
        ${request.due_date ? `<p style="font-size:13px;color:#64748b">Due: ${new Date(request.due_date as string).toLocaleDateString()}</p>` : ""}
        <div style="text-align:center;margin:24px 0">
          <a href="${uploadUrl}" style="display:inline-block;background:#1B3022;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">Upload Documents →</a>
        </div>
      </div>
      <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:16px">Powered by Tekton</p>
    </div>
  `;

  return { subject, html };
}

function buildReminderEmail(
  request: Record<string, unknown>,
  items: Record<string, unknown>[],
): { subject: string; html: string } {
  const subject = `Reminder: Documents still needed — ${request.subject}`;
  const uploadUrl = `${APP_URL}/upload/${request.request_token}`;
  const pending = items.filter((i) => i.status === "pending").length;

  const itemsList = items
    .map(
      (i) =>
        `<li style="padding:4px 0">${i.status === "uploaded" || i.status === "accepted" ? "✅" : "☐"} ${i.name}</li>`,
    )
    .join("");

  const html = `
    <div style="max-width:560px;margin:0 auto;font-family:system-ui,sans-serif;color:#1a1a1a">
      <div style="text-align:center;padding:32px 0 16px">
        <div style="display:inline-block;background:#1B3022;color:white;font-weight:bold;font-size:12px;padding:8px 12px;border-radius:8px">TEK</div>
      </div>
      <div style="background:white;border:1px solid #E2E8F0;border-radius:12px;padding:32px">
        <p>This is a reminder. ${pending} document(s) still needed for:</p>
        <h2 style="font-size:16px;margin:8px 0">${request.subject}</h2>
        <ul style="list-style:none;padding:0;margin:16px 0">${itemsList}</ul>
        <div style="text-align:center;margin:24px 0">
          <a href="${uploadUrl}" style="display:inline-block;background:#1B3022;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">Upload Documents →</a>
        </div>
      </div>
      <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:16px">Powered by Tekton</p>
    </div>
  `;

  return { subject, html };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const payload: EmailPayload = await req.json();

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let emailSubject = "";
  let emailHtml = "";

  if (payload.template === "share_notification" && payload.share_id) {
    const { data: share } = await supabase.from("document_shares").select("*").eq("id", payload.share_id).single();

    if (!share) {
      return new Response(JSON.stringify({ error: "Share not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = buildShareEmail(share);
    emailSubject = result.subject;
    emailHtml = result.html;
  } else if ((payload.template === "upload_request" || payload.template === "reminder") && payload.request_id) {
    const { data: request } = await supabase
      .from("upload_requests")
      .select("*, items:upload_request_items(*)")
      .eq("id", payload.request_id)
      .single();

    if (!request) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.template === "reminder") {
      const result = buildReminderEmail(request, request.items ?? []);
      emailSubject = result.subject;
      emailHtml = result.html;
    } else {
      const result = buildUploadRequestEmail(request, request.items ?? []);
      emailSubject = result.subject;
      emailHtml = result.html;
    }
  } else {
    return new Response(JSON.stringify({ error: "Invalid template or missing ID" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Send via Resend
  if (RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: payload.recipient_email,
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("Resend error:", errorBody);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else {
    // RESEND_API_KEY not set — email send skipped
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

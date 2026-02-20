const allowedOrigin = Deno.env.get("APP_URL") || "https://tekton.app";

export const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

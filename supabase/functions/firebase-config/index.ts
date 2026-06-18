// Returns the PUBLIC Firebase Web config (apiKey, authDomain, projectId, appId).
// These are not secrets — Firebase Web SDK exposes them in every client app.
// We keep them in server env so the user only configures them once.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = {
    apiKey: Deno.env.get("FIREBASE_API_KEY") ?? "",
    authDomain: Deno.env.get("FIREBASE_AUTH_DOMAIN") ?? "",
    projectId: Deno.env.get("FIREBASE_PROJECT_ID") ?? "",
    appId: Deno.env.get("FIREBASE_APP_ID") ?? "",
  };
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
  });
});

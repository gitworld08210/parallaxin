import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } },
  );
  const { data: u } = await userClient.auth.getUser();
  const user = u?.user;
  if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // soft-delete: mark for purge in 7 days
  const scheduled = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await admin.from("profiles").update({ deletion_scheduled_at: scheduled }).eq("user_id", user.id);
  // sign out everywhere
  await admin.auth.admin.signOut(user.id, "global" as any).catch(() => {});

  return new Response(JSON.stringify({ ok: true, scheduled_for: scheduled }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } },
  );
  const { data: u } = await supa.auth.getUser();
  const user = u?.user;
  if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const ua = req.headers.get("user-agent") || null;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || null;
  let city: string | null = null;
  if (ip) {
    try {
      const r = await fetch(`https://ipapi.co/${ip}/json/`);
      if (r.ok) { const j = await r.json(); city = j.city ? `${j.city}, ${j.country_name || ""}`.trim().replace(/,\s*$/, "") : null; }
    } catch { /* ignore */ }
  }

  await supa.from("login_events").insert({ user_id: user.id, ip, user_agent: ua, city });
  return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

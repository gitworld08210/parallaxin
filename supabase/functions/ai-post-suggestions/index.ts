import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

async function requireAuth(req: Request) {
  const a = req.headers.get("Authorization");
  if (!a?.startsWith("Bearer ")) return null;
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data, error } = await sb.auth.getClaims(a.replace("Bearer ", ""));
  if (error || !data?.claims) return null;
  return data.claims;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const claims = await requireAuth(req);
    if (!claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { content, media_type } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;

    // Pick a "best time" — IST-friendly heuristic, prime evening windows
    const now = new Date();
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;
    const target = new Date(now);
    target.setHours(isWeekend ? 11 : 19, isWeekend ? 30 : 30, 0, 0);
    if (target.getTime() <= now.getTime() + 30 * 60 * 1000) target.setDate(target.getDate() + 1);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You generate 6-10 highly relevant, on-trend hashtags for a social post. Output ONLY a JSON object: {\"hashtags\":[\"#tag1\",...],\"reasoning\":\"one short sentence\"}. Hashtags must start with #, be lowercase, no spaces, no duplicates." },
          { role: "user", content: `Post content: ${content || "(no caption)"}\nMedia: ${media_type || "none"}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (res.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!res.ok) return new Response(JSON.stringify({ error: await res.text() }), { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const data = await res.json();
    let parsed: any = {};
    try { parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}"); } catch { parsed = { hashtags: [] }; }
    const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 10).map((h: any) => String(h).startsWith("#") ? String(h) : "#" + String(h)) : [];

    return new Response(JSON.stringify({
      hashtags,
      best_time_iso: target.toISOString(),
      reasoning: parsed.reasoning ?? "Prime evening engagement window",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

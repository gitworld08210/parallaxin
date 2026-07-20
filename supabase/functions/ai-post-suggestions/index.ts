import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { generateGemini, GeminiError } from "../_shared/gemini.ts";

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
    const safeContent = typeof content === "string" ? content.slice(0, 2000) : "";
    const safeMediaType = typeof media_type === "string" ? media_type.slice(0, 50) : "none";

    const now = new Date();
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;
    const target = new Date(now);
    target.setHours(isWeekend ? 11 : 19, 30, 0, 0);
    if (target.getTime() <= now.getTime() + 30 * 60 * 1000) target.setDate(target.getDate() + 1);

    const raw = await generateGemini({
      model: "gemini-2.5-flash",
      system: "You generate 6-10 highly relevant, on-trend hashtags for a social post. Output ONLY a JSON object: {\"hashtags\":[\"#tag1\",...],\"reasoning\":\"one short sentence\"}. Hashtags must start with #, be lowercase, no spaces, no duplicates.",
      messages: [{ role: "user", parts: [{ text: `Post content: ${safeContent || "(no caption)"}\nMedia: ${safeMediaType}` }] }],
      json: true,
      temperature: 0.7,
      maxTokens: 400,
    });

    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { hashtags: [] }; }
    const hashtags = Array.isArray(parsed.hashtags)
      ? parsed.hashtags.slice(0, 10).map((h: any) => String(h).startsWith("#") ? String(h) : "#" + String(h))
      : [];

    return new Response(JSON.stringify({
      hashtags,
      best_time_iso: target.toISOString(),
      reasoning: parsed.reasoning ?? "Prime evening engagement window",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const status = e instanceof GeminiError ? e.status : 500;
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

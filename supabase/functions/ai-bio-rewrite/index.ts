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

    const body = await req.json().catch(() => ({}));
    const currentBio = typeof body?.bio === "string" ? body.bio.slice(0, 500) : "";
    const displayName = typeof body?.display_name === "string" ? body.display_name.slice(0, 60) : "";
    const niche = typeof body?.niche === "string" ? body.niche.slice(0, 100) : "";

    const raw = await generateGemini({
      model: "gemini-2.5-flash",
      system: `You rewrite social-media bios for creators on Aurelix. Return ONLY JSON: {"variants":[{"style":"professional","text":"..."},{"style":"playful","text":"..."},{"style":"aesthetic","text":"..."}]}. Each bio ≤ 150 chars. No hashtags. Max one emoji per bio. Avoid clichés like "coffee lover".`,
      messages: [{
        role: "user",
        parts: [{ text: `Name: ${displayName || "(unknown)"}\nNiche/hint: ${niche || "creator"}\nCurrent bio: ${currentBio || "(empty)"}\n\nRewrite in 3 distinct styles.` }],
      }],
      json: true,
      temperature: 0.95,
      maxTokens: 500,
    });

    let variants: Array<{ style: string; text: string }> = [];
    try {
      const p = JSON.parse(raw);
      variants = Array.isArray(p.variants) ? p.variants.slice(0, 3).map((v: any) => ({
        style: String(v.style ?? "").slice(0, 20),
        text: String(v.text ?? "").slice(0, 200),
      })) : [];
    } catch {}

    return new Response(JSON.stringify({ variants }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const status = e instanceof GeminiError ? e.status : 500;
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

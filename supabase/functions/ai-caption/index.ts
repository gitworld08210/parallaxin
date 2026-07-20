import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { generateGemini, GeminiError } from "../_shared/gemini.ts";

async function requireAuth(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data, error } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (error || !data?.claims) return null;
  return data.claims;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const claims = await requireAuth(req);
    if (!claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const rawHint = body?.hint;
    const hint = typeof rawHint === "string"
      ? rawHint.replace(/[\r\n\t]+/g, " ").slice(0, 500)
      : "creator post";

    const caption = await generateGemini({
      model: "gemini-2.5-flash",
      system: "You write short, evocative, premium social-media captions for Aurelix, a luxury creator app. 1-2 sentences, no hashtags unless asked, at most one tasteful emoji. Never start with 'Here is' or 'Caption:'.",
      messages: [{ role: "user", parts: [{ text: `Write a caption. Hint: ${hint}` }] }],
      temperature: 0.9,
      maxTokens: 200,
    });

    return new Response(JSON.stringify({ caption }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const status = e instanceof GeminiError ? e.status : 500;
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

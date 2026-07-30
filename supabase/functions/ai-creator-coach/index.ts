import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { generateGemini, GeminiError } from "../_shared/gemini.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token);
    if (cErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const uid = claims.claims.sub as string;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Pull last 10 posts + engagement
    const { data: posts } = await admin
      .from("posts")
      .select("id, content, is_reel, like_count, comment_count, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(10);

    const { data: prof } = await admin
      .from("profiles")
      .select("username, display_name, followers_count, following_count, posts_count")
      .eq("user_id", uid)
      .maybeSingle();

    const summary = (posts ?? []).map((p, i) => {
      const d = new Date(p.created_at);
      const day = d.toLocaleDateString(undefined, { weekday: "short" });
      const hour = d.getHours();
      return `${i + 1}. [${p.is_reel ? "Reel" : "Post"}] ${day} ${hour}:00 · ${p.like_count} likes · ${p.comment_count} comments · "${(p.content ?? "").slice(0, 100)}"`;
    }).join("\n");

    const system = `You are Aurelix Creator Coach — an expert social growth strategist.
Return STRICT JSON only, no prose, matching:
{
  "headline": "one punchy sentence about creator's current momentum",
  "tips": [{"title": "...", "detail": "one actionable sentence"}, ... exactly 3 items],
  "best_time": "e.g. Thu 7-9pm",
  "content_focus": "one short suggestion for what to post next"
}
Be specific to the data. Never invent numbers.`;

    const user = `Creator @${prof?.username ?? "unknown"} (${prof?.followers_count ?? 0} followers, ${prof?.posts_count ?? 0} posts).

Last posts:
${summary || "No posts yet."}`;

    const text = await generateGemini({
      task: "creator_coach",
      system,
      messages: [{ role: "user", parts: [{ text: user }] }],
      json: true,
      temperature: 0.6,
      maxTokens: 800,
    });

    let payload: any;
    try { payload = JSON.parse(text); }
    catch { payload = { headline: "Keep creating — momentum builds week over week.", tips: [], best_time: "", content_focus: "" }; }

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const status = e instanceof GeminiError ? e.status : 500;
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

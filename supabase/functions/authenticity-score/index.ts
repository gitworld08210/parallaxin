// Authenticity scoring for posts (P14)
// Uses Lovable AI Gateway (Gemini) to score originality, AI-likelihood,
// caption-media coherence, and safety. Stores 0-100 score + breakdown on posts.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYS = `You are an authenticity reviewer for a social media post.
Return ONLY compact JSON with this shape:
{"score":0-100,"originality":0-100,"ai_generated_likelihood":0-100,"caption_match":0-100,"safety":0-100,"summary":"one short sentence","flags":["..."]}.
- score = overall authenticity (higher = more authentic, original human content).
- ai_generated_likelihood: probability the media is AI-generated.
- caption_match: how well the caption fits the media (100 if no media).
- safety: 100 = safe, lower if NSFW/violent/harassment cues.
- flags: short tags like "ai_generated", "stock_photo", "reused", "low_quality", "unsafe", "spam".
No prose outside JSON.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const { post_id } = await req.json();
    if (!post_id || typeof post_id !== "string") return json({ error: "post_id required" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "missing LOVABLE_API_KEY" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: post, error } = await supabase
      .from("posts")
      .select("id, content, media_url, media_type, user_id")
      .eq("id", post_id)
      .maybeSingle();
    if (error || !post) return json({ error: "post not found" }, 404);
    if (post.user_id !== userId) return json({ error: "forbidden" }, 403);

    const userContent: any[] = [{
      type: "text",
      text: `Caption: ${post.content?.slice(0, 1000) || "(no caption)"}\nMedia type: ${post.media_type || "text"}`,
    }];
    if (post.media_type === "image" && post.media_url) {
      userContent.push({ type: "image_url", image_url: { url: post.media_url } });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        task: "authenticity_score",
        messages: [
          { role: "system", content: SYS },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("ai gateway", aiRes.status, t);
      if (aiRes.status === 429) return json({ error: "rate_limited" }, 429);
      if (aiRes.status === 402) return json({ error: "credits_exhausted" }, 402);
      return json({ error: "ai_failed" }, 500);
    }

    const aiJson = await aiRes.json();
    let parsed: any = {};
    try {
      parsed = JSON.parse(aiJson.choices?.[0]?.message?.content ?? "{}");
    } catch {
      parsed = { score: 50, summary: "Unable to parse score." };
    }

    const score = Math.max(0, Math.min(100, Math.round(parsed.score ?? 50)));
    const breakdown = {
      originality: parsed.originality ?? null,
      ai_generated_likelihood: parsed.ai_generated_likelihood ?? null,
      caption_match: parsed.caption_match ?? null,
      safety: parsed.safety ?? null,
      summary: parsed.summary ?? "",
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
    };

    await supabase.from("posts").update({
      authenticity_score: score,
      authenticity_breakdown: breakdown,
      authenticity_checked_at: new Date().toISOString(),
    }).eq("id", post_id);

    return json({ score, breakdown });
  } catch (e: any) {
    console.error(e);
    return json({ error: e?.message || "error" }, 500);
  }
});

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { streamGemini, geminiToOpenAiSSE, GeminiError, type GeminiMessage } from "../_shared/gemini.ts";

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
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages must be an array" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const MAX_MESSAGES = 40;
    const MAX_CONTENT_LEN = 4000;
    // Map OpenAI-style {role, content} → Gemini {role:"user"|"model", parts}
    const geminiMessages: GeminiMessage[] = messages
      .slice(-MAX_MESSAGES)
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
      .map((m: any) => ({
        role: m.role === "assistant" ? "model" as const : "user" as const,
        parts: [{ text: String(m.content ?? "").slice(0, MAX_CONTENT_LEN) }],
      }));

    const system = `You are Aurelix AI — a warm, sharp growth coach for creators on the Aurelix social network. Help with: writing captions, hashtag strategy, content ideas, profile/bio rewrites, audience growth tactics, and analyzing engagement patterns. Be concise, specific, and friendly. Use short paragraphs and bullet lists when helpful. Never invent stats you don't have.`;

    const upstream = await streamGemini({
      model: "gemini-2.5-pro",
      system,
      messages: geminiMessages,
      temperature: 0.85,
      maxTokens: 4096,
    });

    return new Response(geminiToOpenAiSSE(upstream), {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (e) {
    const status = e instanceof GeminiError ? e.status : 500;
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

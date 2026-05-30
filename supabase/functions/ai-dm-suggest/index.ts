import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const token = auth.replace("Bearer ", "");
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser(token);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { conversation_id } = await req.json();
    if (!conversation_id) return new Response(JSON.stringify({ error: "conversation_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // userClient enforces RLS — must be a participant
    const { data: msgs, error } = await userClient
      .from("messages")
      .select("content, sender_id, created_at")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: false })
      .limit(8);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const transcript = (msgs ?? []).reverse()
      .map((m: any) => `${m.sender_id === user.id ? "ME" : "THEM"}: ${m.content || "(media)"}`)
      .join("\n");
    if (!transcript) return new Response(JSON.stringify({ suggestions: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You suggest 3 short reply options (≤8 words each) for ME to send in this chat. Match ME's tone if visible. Output ONLY JSON: {\"suggestions\":[\"...\",\"...\",\"...\"]}. No emojis unless ME already uses them." },
          { role: "user", content: `Conversation:\n${transcript}\n\nSuggest 3 replies from ME.` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (res.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!res.ok) return new Response(JSON.stringify({ error: await res.text() }), { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const data = await res.json();
    let suggestions: string[] = [];
    try { suggestions = JSON.parse(data.choices?.[0]?.message?.content ?? "{}").suggestions ?? []; } catch {}
    return new Response(JSON.stringify({ suggestions: suggestions.slice(0, 3) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

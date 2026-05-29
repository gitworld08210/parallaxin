import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ flagged: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: 'You are a content moderator. Decide if the text contains hate, harassment, sexual content involving minors, explicit violence, or doxxing. Respond ONLY as JSON: {"flagged": boolean, "reason": string}. Reason should be short and user-friendly when flagged, empty otherwise.' },
          { role: "user", content: text.slice(0, 2000) },
        ],
      }),
    });
    if (!res.ok) {
      return new Response(JSON.stringify({ flagged: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "{}";
    let parsed: any = { flagged: false, reason: "" };
    try { parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch {}
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ flagged: false, error: String(e) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

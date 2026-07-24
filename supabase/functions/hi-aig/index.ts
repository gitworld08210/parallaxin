// Higher Intelligence AI Gateway (HI-AIG) — single entry-point for every AI call.
// Callers pass { task, messages | prompt, options? } and NEVER a model id.
// The router picks the model from `ai_task_routes` (primary → fallback) and logs the run.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "LOVABLE_API_KEY missing" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json();
    const {
      task,
      messages,
      prompt,
      source, // e.g. 'dm' — used for consent enforcement
      advertiser_id,
      options,
    } = body ?? {};

    if (!task || typeof task !== "string") return json({ error: "task required" }, 400);

    // Consent: DM-sourced input requires user_dm_ai_consent.opted_in
    if (source === "dm") {
      const { data: c } = await supabase
        .from("user_dm_ai_consent")
        .select("opted_in")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!c?.opted_in) return json({ error: "DM AI consent required" }, 403);
    }

    // Route lookup
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: route, error: routeErr } = await admin
      .from("ai_task_routes")
      .select("*")
      .eq("task_key", task)
      .maybeSingle();
    if (routeErr || !route) return json({ error: `Unknown task '${task}'` }, 400);

    if (route.primary_model?.startsWith("internal/")) {
      return json({ stub: true, task, note: "Reserved for Aurelix internal ML" }, 200);
    }

    const inputMessages = messages ?? (prompt ? [{ role: "user", content: prompt }] : []);
    if (inputMessages.length === 0) return json({ error: "messages or prompt required" }, 400);

    const tryModel = async (model: string) => {
      const started = Date.now();
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": LOVABLE_API_KEY,
        },
        body: JSON.stringify({
          model,
          messages: inputMessages,
          ...(options ?? {}),
        }),
      });
      const latency = Date.now() - started;
      if (!resp.ok) {
        const err = await resp.text().catch(() => String(resp.status));
        return { ok: false as const, status: resp.status, err, latency };
      }
      const data = await resp.json();
      return { ok: true as const, data, latency };
    };

    let attempt = await tryModel(route.primary_model);
    let modelUsed = route.primary_model;
    let fallbackUsed = false;

    // Retry on 429 / 5xx with fallback
    if (!attempt.ok && route.fallback_model && (attempt.status === 429 || attempt.status >= 500)) {
      attempt = await tryModel(route.fallback_model);
      modelUsed = route.fallback_model;
      fallbackUsed = true;
    }

    // Log
    await admin.from("ai_gateway_runs").insert({
      task_key: task,
      model_used: modelUsed,
      fallback_used: fallbackUsed,
      user_id: user.id,
      advertiser_id: advertiser_id ?? null,
      latency_ms: attempt.latency,
      status: attempt.ok ? "ok" : "error",
      error: attempt.ok ? null : String(attempt.err).slice(0, 500),
      source: source ?? null,
      input_tokens: attempt.ok ? attempt.data?.usage?.prompt_tokens ?? null : null,
      output_tokens: attempt.ok ? attempt.data?.usage?.completion_tokens ?? null : null,
    });

    if (!attempt.ok) {
      const status = attempt.status === 429 ? 429 : attempt.status === 402 ? 402 : 502;
      return json({ error: "Upstream AI error", detail: attempt.err, task, model: modelUsed }, status);
    }

    return json({
      task,
      model_used: modelUsed,
      fallback_used: fallbackUsed,
      latency_ms: attempt.latency,
      choices: attempt.data.choices,
      usage: attempt.data.usage,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

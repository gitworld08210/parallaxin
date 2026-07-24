// Webhook dispatcher — claims a batch from aap_events_outbox and POSTs
// signed payloads to every matching advertiser webhook. Sign with HMAC-SHA256
// over `{timestamp}.{body}` (Stripe-style), header `x-aap-signature: t=..,v1=..`.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: batch, error } = await supabase.rpc("aap_claim_outbox_batch", { p_limit: 50 });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });

  const events = (batch ?? []) as any[];
  const summary: any[] = [];

  for (const evt of events) {
    const { data: hooks } = await supabase.from("aap_webhooks")
      .select("id, url, secret, events, is_active")
      .eq("advertiser_id", evt.advertiser_id)
      .eq("is_active", true);

    const matching = (hooks ?? []).filter((h: any) =>
      !h.events?.length || h.events.includes(evt.event) || h.events.includes("*")
    );

    if (matching.length === 0) {
      await supabase.rpc("aap_mark_outbox_delivered", { p_id: evt.id });
      summary.push({ id: evt.id, event: evt.event, delivered: 0, skipped: true });
      continue;
    }

    let allOk = true;
    for (const h of matching) {
      const ts = Math.floor(Date.now() / 1000);
      const body = JSON.stringify({
        id: evt.id, event: evt.event, advertiser_id: evt.advertiser_id,
        created_at: evt.created_at, data: evt.payload,
      });
      const sig = h.secret ? await hmacSha256Hex(h.secret, `${ts}.${body}`) : "";
      const started = Date.now();
      let status = 0, respText = "";
      try {
        const res = await fetch(h.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-aap-event": evt.event,
            "x-aap-signature": `t=${ts},v1=${sig}`,
          },
          body,
        });
        status = res.status;
        respText = (await res.text()).slice(0, 2000);
      } catch (e) {
        status = 0;
        respText = String(e).slice(0, 500);
      }
      const ok = status >= 200 && status < 300;
      allOk = allOk && ok;

      await supabase.from("aap_webhook_deliveries").insert({
        webhook_id: h.id, event: evt.event, status, response: respText,
        attempt: evt.attempts, duration_ms: Date.now() - started, payload: JSON.parse(body),
      });
      await supabase.from("aap_webhooks").update(
        ok
          ? { last_success_at: new Date().toISOString(), failure_count: 0 }
          : { last_failure_at: new Date().toISOString(), failure_count: (h.failure_count ?? 0) + 1 },
      ).eq("id", h.id);
    }

    if (allOk) {
      await supabase.rpc("aap_mark_outbox_delivered", { p_id: evt.id });
    }
    summary.push({ id: evt.id, event: evt.event, delivered: matching.length, ok: allOk });
  }

  return new Response(JSON.stringify({ processed: events.length, summary }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});

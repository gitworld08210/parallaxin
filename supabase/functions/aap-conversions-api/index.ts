// Public server-to-server Conversions API for Aurelix Ads Platform.
// Client (advertiser server) POSTs pixel events; we authorise via pixel secret,
// dedup, attribute to last click/view, and write to ledger + events.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-pixel-id, x-pixel-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function j(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return j(405, { ok: false, error: "method_not_allowed" });

  let payload: any;
  try { payload = await req.json(); } catch { return j(400, { ok: false, error: "invalid_json" }); }

  const pixelId = req.headers.get("x-pixel-id") || payload.pixel_id;
  const secret  = req.headers.get("x-pixel-secret") || payload.secret;
  const eventCode = payload.event_code || payload.event_name;

  if (!pixelId || !secret || !eventCode) {
    return j(400, { ok: false, error: "missing_pixel_or_event" });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabase.rpc("aap_ingest_conversion", {
    p_pixel_id: pixelId,
    p_secret: secret,
    p_event_code: eventCode,
    p_external_event_id: payload.event_id ?? null,
    p_user_id: payload.user_id ?? null,
    p_value: payload.value ?? 0,
    p_currency: payload.currency ?? "INR",
    p_meta: payload.meta ?? {},
  });

  if (error) return j(500, { ok: false, error: error.message });
  const result = data as any;
  return j(result?.ok ? 200 : 401, result);
});

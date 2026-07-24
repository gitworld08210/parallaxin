import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const svc  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const asUser = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const admin  = createClient(url, svc);

    const { data: u } = await asUser.auth.getUser();
    if (!u.user) return json({ error: "unauthorized" }, 401);
    const uid = u.user.id;

    const { stream_id } = await req.json();
    if (!stream_id) return json({ error: "stream_id required" }, 400);

    const { data: stream, error: sErr } = await admin.from("live_streams")
      .select("id, host_id, access_type, ticket_price_coins, status").eq("id", stream_id).maybeSingle();
    if (sErr || !stream) return json({ error: "stream not found" }, 404);
    if (stream.host_id === uid) return json({ ok: true, reason: "host" });
    if (stream.access_type !== "ticket") return json({ error: "not a ticketed stream" }, 400);

    const { data: existing } = await admin.from("live_tickets")
      .select("id").eq("stream_id", stream_id).eq("user_id", uid).maybeSingle();
    if (existing) return json({ ok: true, reason: "already owned" });

    const price = stream.ticket_price_coins ?? 0;
    const env = "live";

    // Atomic debit via SECURITY DEFINER RPC (prevents double-spend races).
    if (price > 0) {
      const { error: spendErr } = await asUser.rpc("spend_coins_atomic", {
        _reason: "live_ticket",
        _amount: price,
        _reference_id: stream_id,
        _reference_type: "live_stream",
      });
      if (spendErr) {
        return json({ error: spendErr.message || "insufficient coins", required: price }, 402);
      }
    }

    // Credit host + issue ticket (admin, non-race-sensitive).
    const [c, t] = await Promise.all([
      admin.from("coin_transactions").insert({
        user_id: stream.host_id, amount: price, kind: "live_ticket_earn", environment: env,
      }),
      admin.from("live_tickets").insert({ stream_id, user_id: uid, price_coins: price }),
    ]);
    if (c.error || t.error) return json({ error: c.error?.message || t.error?.message }, 500);
    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

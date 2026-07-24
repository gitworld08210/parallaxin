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

    const { stream_id, gift_id, qty = 1 } = await req.json();
    if (!stream_id || !gift_id) return json({ error: "stream_id + gift_id required" }, 400);
    const q = Math.max(1, Math.min(99, Number(qty) || 1));

    const [{ data: stream }, { data: gift }] = await Promise.all([
      admin.from("live_streams").select("id, host_id, allow_gifts, total_tips_coins").eq("id", stream_id).maybeSingle(),
      admin.from("live_gifts_catalog").select("id, cost_coins, is_active").eq("id", gift_id).maybeSingle(),
    ]);
    if (!stream) return json({ error: "stream not found" }, 404);
    if (!gift || !gift.is_active) return json({ error: "gift not available" }, 400);
    if (stream.allow_gifts === false) return json({ error: "gifts disabled" }, 400);
    if (stream.host_id === uid) return json({ error: "cannot gift your own stream" }, 400);

    const total = gift.cost_coins * q;
    const env = "live";

    // Atomic debit via SECURITY DEFINER RPC (prevents double-spend races).
    if (total > 0) {
      const { error: spendErr } = await asUser.rpc("spend_coins_atomic", {
        _reason: "live_gift",
        _amount: total,
        _reference_id: stream_id,
        _reference_type: "live_stream",
      });
      if (spendErr) {
        return json({ error: spendErr.message || "insufficient coins", required: total }, 402);
      }
    }

    const [c, l, b] = await Promise.all([
      admin.from("coin_transactions").insert({
        user_id: stream.host_id, amount: total, kind: "live_gift_earn", environment: env,
      }),
      admin.from("live_gifts").insert({
        stream_id, sender_id: uid, host_id: stream.host_id, gift_id, qty: q, coins_total: total,
      }),
      admin.from("live_streams").update({
        total_tips_coins: (stream.total_tips_coins ?? 0) + total,
      }).eq("id", stream_id),
    ]);
    const err = c.error?.message || l.error?.message || b.error?.message;
    if (err) return json({ error: err }, 500);
    return json({ ok: true, coins_total: total });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

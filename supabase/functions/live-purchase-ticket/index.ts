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

    // Check balance = sum(coin_transactions.amount)
    const { data: txns } = await admin.from("coin_transactions").select("amount").eq("user_id", uid);
    const bal = (txns ?? []).reduce((a: number, r: any) => a + Number(r.amount || 0), 0);
    if (bal < price) return json({ error: "insufficient coins", balance: bal, required: price }, 402);

    // Debit buyer, credit host, insert ticket
    const env = "live";
    const debit = admin.from("coin_transactions").insert({
      user_id: uid, amount: -price, kind: "live_ticket", environment: env,
    });
    const credit = admin.from("coin_transactions").insert({
      user_id: stream.host_id, amount: price, kind: "live_ticket_earn", environment: env,
    });
    const ticket = admin.from("live_tickets").insert({
      stream_id, user_id: uid, price_coins: price,
    });
    const [d, c, t] = await Promise.all([debit, credit, ticket]);
    if (d.error || c.error || t.error) return json({ error: d.error?.message || c.error?.message || t.error?.message }, 500);
    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, verifyWebhook, COIN_PACK_AMOUNTS, SUB_TIER } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

function resolvePriceLookup(item: any): string | undefined {
  return item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || item?.price?.id;
}

async function applyTierForUser(userId: string, env: StripeEnv) {
  // Determine highest active tier for this user
  const { data: subs } = await getSupabase()
    .from("subscriptions")
    .select("status, price_id, current_period_end, cancel_at_period_end")
    .eq("user_id", userId)
    .eq("environment", env);

  let tier = "free";
  const now = Date.now();
  for (const s of (subs ?? []) as any[]) {
    const periodEnd = s.current_period_end ? new Date(s.current_period_end).getTime() : null;
    const active =
      (["active", "trialing", "past_due"].includes(s.status) && (!periodEnd || periodEnd > now)) ||
      (s.status === "canceled" && periodEnd && periodEnd > now);
    if (!active) continue;
    const t = SUB_TIER[s.price_id];
    if (t === "pro") tier = "pro";
    else if (t === "premium" && tier !== "pro") tier = "premium";
  }
  await getSupabase().from("profiles").update({ tier, updated_at: new Date().toISOString() }).eq("user_id", userId);
}

async function upsertSub(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) { console.error("No userId in subscription metadata"); return; }

  const item = subscription.items?.data?.[0];
  const priceId = resolvePriceLookup(item);
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId,
      price_id: priceId,
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
  await applyTierForUser(userId, env);
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
  const userId = subscription.metadata?.userId;
  if (userId) await applyTierForUser(userId, env);
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  if (session.mode !== "payment") return; // subscriptions handled via customer.subscription.*
  const userId = session.metadata?.userId;
  const priceId = session.metadata?.priceId;
  if (!userId || !priceId) { console.log("checkout.session.completed missing metadata", { userId, priceId }); return; }

  const coins = COIN_PACK_AMOUNTS[priceId];
  if (!coins) { console.log("Unknown one-time priceId for coins:", priceId); return; }

  const { error } = await getSupabase().rpc("credit_coins", {
    _user_id: userId,
    _amount: coins,
    _session_id: session.id,
    _price_id: priceId,
    _environment: env,
  });
  if (error) console.error("credit_coins failed:", error);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("Webhook invalid env:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }
  const env: StripeEnv = rawEnv;
  try {
    const event = await verifyWebhook(req, env);
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await upsertSub(event.data.object, env); break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object, env); break;
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object, env); break;
      default:
        console.log("Unhandled event:", event.type);
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});

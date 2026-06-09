import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const PLATFORM_FEE_BPS = 1500; // 15%

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Unauthorized");

    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supaUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const body = await req.json();
    const { recipientId, postId, amountCents, message, returnUrl, environment, currency } = body as {
      recipientId: string; postId?: string | null; amountCents: number;
      message?: string; returnUrl: string; environment: StripeEnv; currency?: string;
    };

    if (!recipientId || !/^[0-9a-f-]{36}$/.test(recipientId)) throw new Error("Invalid recipient");
    if (recipientId === user.id) throw new Error("Cannot tip yourself");
    if (!Number.isInteger(amountCents) || amountCents < 4900 || amountCents > 10_000_000) throw new Error("Invalid amount");
    if (environment !== 'sandbox' && environment !== 'live') throw new Error("Invalid environment");
    const curr = (currency || 'inr').toLowerCase();

    const admin = createClient(supaUrl, serviceKey);
    const fee = Math.floor(amountCents * PLATFORM_FEE_BPS / 10_000);
    const net = amountCents - fee;

    const { data: tipRow, error: tipErr } = await admin.from("tips").insert({
      sender_id: user.id,
      recipient_id: recipientId,
      post_id: postId ?? null,
      amount_cents: amountCents,
      platform_fee_cents: fee,
      net_cents: net,
      currency: curr,
      environment,
      message: message?.slice(0, 280) ?? null,
      status: 'pending',
    }).select("id").single();
    if (tipErr || !tipRow) throw new Error(tipErr?.message || "Failed to create tip");

    const stripe = createStripeClient(environment);
    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency: curr,
          product_data: { name: "Send Aura (Tip)" },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      customer_email: user.email ?? undefined,
      payment_intent_data: { description: "Aurelix Tip" },
      metadata: {
        purpose: "tip",
        tip_id: tipRow.id,
        userId: user.id,
        recipient_id: recipientId,
      },
    });

    await admin.from("tips").update({ stripe_session_id: session.id }).eq("id", tipRow.id);

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (e) {
    console.error("create-tip-checkout error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });
  }
});

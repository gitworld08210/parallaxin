// Creates a Razorpay order for a coin package.
//
// This replaces the trust model of the manual flow. Instead of a payer typing a
// UPI reference that nobody can verify, Razorpay confirms the payment and tells
// us over a signed webhook.
//
// The client sends only which package it wants. The amount is looked up from the
// server price list, so a tampered client cannot pay ₹1 for 5000 coins. The
// top-up document is created here, server-side, in `awaiting_payment` — security
// rules let no client reach that state or alter the amount.
//
// Required secrets:
//   FIREBASE_SERVICE_ACCOUNT_JSON  service account with Firestore access
//   RAZORPAY_KEY_ID                also returned to the client to open checkout
//   RAZORPAY_KEY_SECRET            server only, never returned

import {
  corsHeaders,
  createWrite,
  Firestore,
  fsTimestamp,
  getAccessToken,
  jsonResponse,
  loadServiceAccount,
  mergeWrite,
  resolveProjectId,
  verifyFirebaseIdToken,
} from "../_shared/google.ts";
import { findPackage } from "../_shared/credit.ts";

const RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders";

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

async function createRazorpayOrder(
  keyId: string,
  keySecret: string,
  input: { amountPaise: number; receipt: string; notes: Record<string, string> },
): Promise<RazorpayOrder> {
  const res = await fetch(RAZORPAY_ORDERS_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes,
      // Capture automatically so a successful payment cannot sit authorised but
      // uncaptured, which would leave the payer charged and uncredited.
      payment_capture: 1,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.id) {
    throw new Error(`Razorpay order creation failed: ${JSON.stringify(body)}`);
  }
  return body as RazorpayOrder;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) {
      console.error("[razorpay-create-order] Razorpay credentials are not configured");
      return jsonResponse({ error: "Payments are not configured" }, 503);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return jsonResponse({ error: "Request body must be valid JSON" }, 400);
    }

    const coins = Number((rawBody as Record<string, unknown>)?.coins);
    if (!Number.isInteger(coins)) {
      return jsonResponse({ error: "coins must be an integer" }, 400);
    }

    // The amount is never taken from the request.
    const pack = findPackage(coins);
    if (!pack) {
      return jsonResponse({ error: "Unknown coin package" }, 422);
    }

    const authorization = req.headers.get("Authorization") ?? "";
    const idToken = authorization.toLowerCase().startsWith("bearer ")
      ? authorization.slice(7).trim()
      : "";
    if (!idToken) return jsonResponse({ error: "Missing bearer token" }, 401);

    const serviceAccount = loadServiceAccount();
    const projectId = resolveProjectId(serviceAccount);

    let payer;
    try {
      payer = await verifyFirebaseIdToken(idToken, projectId);
    } catch (error) {
      console.warn("[razorpay-create-order] token rejected:", String(error));
      return jsonResponse({ error: "Invalid or expired session" }, 401);
    }

    const accessToken = await getAccessToken(serviceAccount, [
      "https://www.googleapis.com/auth/datastore",
    ]);
    const db = new Firestore(projectId, accessToken);

    const topupId = crypto.randomUUID().replace(/-/g, "");

    // Write the top-up before creating the order. If this ordering were
    // reversed and the write failed, a live Razorpay order would exist with no
    // top-up behind it, and a payment against it could never be attributed —
    // the payer would be charged with no record to credit. A stale
    // `awaiting_payment` document is the cheaper failure.
    await db.commitWrites([
      createWrite(db.docName("coin_topups", topupId), {
        user_id: payer.uid,
        coins: pack.coins,
        amount_inr: pack.amountInr,
        status: "awaiting_payment",
        provider: "razorpay",
        created_at: fsTimestamp(),
      }),
    ]);

    const order = await createRazorpayOrder(keyId, keySecret, {
      amountPaise: pack.amountInr * 100,
      receipt: topupId,
      notes: { topup_id: topupId, user_id: payer.uid, coins: String(pack.coins) },
    });

    // The order id is the trustworthy link back to this top-up: it is assigned
    // by Razorpay and echoed on the payment entity, unlike `notes`, which the
    // browser can set. The webhook resolves through this pointer.
    await db.commitWrites([
      mergeWrite(db.docName("coin_topups", topupId), {
        provider_order_id: order.id,
      }, { mustExist: true }),

      createWrite(db.docName("razorpay_orders", order.id), {
        order_id: order.id,
        topup_id: topupId,
        user_id: payer.uid,
        coins: pack.coins,
        amount_inr: pack.amountInr,
        created_at: fsTimestamp(),
      }),
    ]);

    return jsonResponse({
      ok: true,
      topup_id: topupId,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      coins: pack.coins,
      key_id: keyId,
    });
  } catch (error) {
    console.error("[razorpay-create-order] unexpected failure:", error);
    return jsonResponse({ error: "Could not start payment. Please retry." }, 500);
  }
});

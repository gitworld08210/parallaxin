// Razorpay payment webhook — the point where payment authenticity is
// established.
//
// This is the only place in the system that can assert money actually arrived.
// It trusts nothing about the request except the HMAC signature: the body is
// verified against RAZORPAY_WEBHOOK_SECRET before a single field is read.
//
// It also trusts nothing about *which* top-up a payment belongs to beyond the
// order id, which Razorpay assigns. `notes` travels through Checkout and can be
// set by the browser, so using it for attribution would let a payer point a ₹49
// payment at a ₹1,499 top-up. Attribution goes through the `razorpay_orders`
// pointer written at order creation, and the amount is re-checked against the
// stored top-up inside the credit transaction.
//
// Webhook semantics matter as much as the crypto here. Razorpay retries on any
// non-2xx, so:
//   - a bad signature returns 401 and is never retried into success;
//   - an already-credited payment returns 200, because the work is done;
//   - anything charged-but-not-credited returns 200 and records a
//     payment_exceptions document, because retrying cannot fix it but a human
//     must see it;
//   - only genuinely transient faults return 5xx to invite a retry.
//
// Required secrets:
//   FIREBASE_SERVICE_ACCOUNT_JSON  service account with Firestore access
//   RAZORPAY_WEBHOOK_SECRET        the secret configured on the Razorpay webhook

import {
  corsHeaders,
  Firestore,
  fsTimestamp,
  getAccessToken,
  hmacSha256Hex,
  jsonResponse,
  loadServiceAccount,
  mergeWrite,
  PermanentFailure,
  resolveProjectId,
  timingSafeEqual,
  TransactionContention,
} from "../_shared/google.ts";
import { creditTopup, recordTopupEvent } from "../_shared/credit.ts";

const MAX_ATTEMPTS = 3;
// Firestore rejects ids matching `__.*__`, and an invalid id would otherwise
// become a permanent failure discovered only at commit time.
const ID_PATTERN = /^(?!__.*__$)[A-Za-z0-9_-]{1,128}$/;
const REFUND_EVENTS = ["refund.created", "payment.refunded"];
// Chargebacks reverse money exactly as refunds do, so they cannot be ignored.
const DISPUTE_EVENTS = [
  "payment.dispute.created",
  "payment.dispute.lost",
  "payment.dispute.closed",
];

interface PaymentEntity {
  id: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  method?: string;
  notes?: Record<string, unknown>;
  error_description?: string;
  acquirer_data?: Record<string, unknown>;
}

function extractPayment(event: Record<string, unknown>): PaymentEntity | null {
  const payload = event.payload as Record<string, unknown> | undefined;
  const payment = payload?.payment as Record<string, unknown> | undefined;
  const entity = payment?.entity as PaymentEntity | undefined;
  return entity?.id ? entity : null;
}

/**
 * The bank UTR of a UPI payment, if this is one.
 *
 * Claiming this alongside the Razorpay payment id is what stops a payer being
 * credited through Razorpay and then again through manual review by quoting the
 * same bank UTR.
 *
 * Restricted to UPI and to the 12-digit shape the manual path accepts, because
 * `payment_receipts` is a single flat key space. A card RRN or a netbanking
 * transaction id lives in its own namespace and can recycle, so claiming those
 * here could collide with an unrelated UTR and make a legitimate manual top-up
 * permanently unapprovable.
 */
function upiBankReference(payment: PaymentEntity): string | null {
  if (payment.method !== "upi") return null;

  const acquirer = payment.acquirer_data ?? {};
  const candidate = acquirer.rrn ?? acquirer.upi_transaction_id;
  return typeof candidate === "string" && /^[0-9]{12}$/.test(candidate)
    ? candidate
    : null;
}

/**
 * Records a payment that could not be credited.
 *
 * These are the cases where a payer has been charged and holds no coins, so a
 * log line is not enough — finance needs something queryable to reconcile
 * against. Keyed by payment id so redeliveries overwrite rather than pile up.
 */
async function recordException(
  db: Firestore,
  payment: PaymentEntity,
  event: string,
  reason: string,
  topupId?: string,
): Promise<void> {
  try {
    await db.commitWrites([
      mergeWrite(db.docName("payment_exceptions", payment.id), {
        provider: "razorpay",
        provider_payment_id: payment.id,
        provider_order_id: payment.order_id ?? null,
        topup_id: topupId ?? null,
        event,
        reason,
        amount: payment.amount ?? null,
        currency: payment.currency ?? null,
        resolved: false,
        created_at: fsTimestamp(),
      }),
    ]);
  } catch (error) {
    // Never let bookkeeping turn an acknowledged webhook into a retry storm.
    console.error("[razorpay-webhook] failed to record exception:", error);
  }
}

/**
 * Resolves which top-up a payment belongs to.
 *
 * Only the server-written order pointer is consulted. `payment.notes` is not
 * used at all: it travels through Checkout, so the browser can set it, and any
 * code path that acts on it is a misattribution waiting to happen.
 */
async function resolveTopup(
  db: Firestore,
  payment: PaymentEntity,
): Promise<{ topupId: string; userId: string } | null> {
  const orderId = String(payment.order_id ?? "").trim();
  if (!ID_PATTERN.test(orderId)) return null;

  const name = db.docName("razorpay_orders", orderId);
  const pointer = (await db.batchGet([name])).get(name);
  if (!pointer) return null;

  const topupId = String(pointer.topup_id ?? "").trim();
  if (!ID_PATTERN.test(topupId)) return null;

  return { topupId, userId: String(pointer.user_id ?? "") };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Hoisted so the failure handler can still record an exception for a payment
  // that could not be processed.
  let context: { db: Firestore; payment: PaymentEntity; event: string } | null = null;

  try {
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not configured");
      // 500 so Razorpay retries once the secret is in place, rather than
      // discarding a real payment notification.
      return jsonResponse({ error: "Webhook not configured" }, 500);
    }

    // Read the raw body: the signature covers the exact bytes sent, so it must
    // be verified before parsing.
    const rawBody = await req.text();
    const providedSignature = req.headers.get("x-razorpay-signature") ?? "";
    if (!providedSignature) {
      return jsonResponse({ error: "Missing signature" }, 401);
    }

    const expectedSignature = await hmacSha256Hex(webhookSecret, rawBody);
    if (!timingSafeEqual(providedSignature.trim().toLowerCase(), expectedSignature)) {
      console.warn("[razorpay-webhook] rejected a request with an invalid signature");
      return jsonResponse({ error: "Invalid signature" }, 401);
    }

    let event: Record<string, unknown>;
    try {
      event = JSON.parse(rawBody);
    } catch {
      // Signed but unparseable: retrying will not help.
      return jsonResponse({ error: "Body is not valid JSON" }, 400);
    }

    const eventType = String(event.event ?? "");
    const payment = extractPayment(event);

    // Acknowledge events we do not act on, so Razorpay stops resending them.
    if (!payment) {
      return jsonResponse({ ok: true, ignored: eventType, reason: "no payment entity" });
    }

    const serviceAccount = loadServiceAccount();
    const projectId = resolveProjectId(serviceAccount);
    const accessToken = await getAccessToken(serviceAccount, [
      "https://www.googleapis.com/auth/datastore",
    ]);
    const db = new Firestore(projectId, accessToken);
    context = { db, payment, event: eventType };

    // Coins are spendable, so money reversed by a refund or a chargeback cannot
    // be clawed back automatically without risking a negative balance. Record it
    // for manual handling rather than silently keeping the coins.
    if (REFUND_EVENTS.includes(eventType) || DISPUTE_EVENTS.includes(eventType)) {
      const kind = DISPUTE_EVENTS.includes(eventType) ? "disputed" : "refunded";
      await recordException(
        db,
        payment,
        eventType,
        `Payment ${kind} — coins need manual reversal`,
      );
      return jsonResponse({ ok: true, event: eventType, recorded: true });
    }

    if (eventType !== "payment.captured" && eventType !== "payment.failed") {
      return jsonResponse({ ok: true, ignored: eventType });
    }

    const resolved = await resolveTopup(db, payment);
    if (!resolved) {
      // A captured payment we cannot attribute means someone paid and cannot be
      // credited. Retrying will not help; a human has to.
      if (eventType === "payment.captured") {
        console.error(
          `[razorpay-webhook] captured payment ${payment.id} could not be attributed`,
        );
        await recordException(db, payment, eventType, "Payment could not be attributed to a top-up");
      }
      return jsonResponse({ ok: true, ignored: eventType, reason: "unmatched payment" });
    }
    const { topupId, userId } = resolved;

    if (eventType === "payment.failed") {
      // Deliberately NOT terminal. Razorpay orders stay open and payers retry
      // on the same order after a decline, so closing the top-up here would mean
      // refusing the eventual successful capture and charging someone without
      // crediting them. An expiry sweep can close stale ones later.
      const recorded = await recordTopupEvent(db, {
        topupId,
        expectedStatus: "awaiting_payment",
        expectedUserId: userId || undefined,
        fields: {
          last_failed_at: fsTimestamp(),
          last_failed_payment_id: payment.id,
          failure_reason: payment.error_description ?? null,
        },
      });
      if (!recorded.ok) {
        console.warn(
          `[razorpay-webhook] did not record failure for ${topupId}: ${recorded.reason}`,
        );
      }
      return jsonResponse({ ok: true, event: eventType });
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const bankRef = upiBankReference(payment);

        const outcome = await creditTopup(db, {
          topupId,
          expectedStatus: "awaiting_payment",
          // Both paths terminate in `approved` so existing wallet history does
          // not have to learn a second vocabulary for "successfully paid".
          terminalStatus: "approved",
          reference: { kind: "provider", provider: "razorpay", id: payment.id },
          secondaryReferences: bankRef ? [bankRef] : [],
          actorId: "razorpay-webhook",
          source: "topup_razorpay",
          // The payment must match the top-up it claims to pay for. Without
          // this, a cheap payment carrying an expensive top-up's id would be
          // credited in full.
          validate: (topup) => {
            const expectedOrder = String(topup.provider_order_id ?? "");
            const actualOrder = String(payment.order_id ?? "");
            if (expectedOrder && expectedOrder !== actualOrder) {
              return "Payment order does not match this top-up";
            }
            if (Number(payment.amount) !== Number(topup.amount_inr) * 100) {
              return "Paid amount does not match the top-up amount";
            }
            if ((payment.currency ?? "INR") !== "INR") {
              return "Payment currency is not INR";
            }
            if (payment.status && payment.status !== "captured") {
              return `Payment is not captured (${payment.status})`;
            }
            return null;
          },
          topupFields: {
            approved_at: fsTimestamp(),
            provider_payment_id: payment.id,
            provider_order_id: payment.order_id ?? null,
            provider_method: payment.method ?? null,
            ...(bankRef ? { bank_reference: bankRef } : {}),
          },
        });

        switch (outcome.kind) {
          case "credited":
            console.log(
              `[razorpay-webhook] credited ${outcome.coins} coins for topup ${topupId}`,
            );
            return jsonResponse({ ok: true, credited: outcome.coins });

          case "already_credited":
            // This top-up already has its ledger entry: a plain redelivery.
            return jsonResponse({ ok: true, deduplicated: true });

          case "duplicate_payment":
            // Only one shape here is harmless: this exact payment id already
            // claimed this exact top-up, i.e. a redelivery. Anything else means
            // a *different* payment was just refused — the payer has been
            // charged and holds no coins, so it must not be silently swallowed.
            if (!outcome.isAlias && outcome.sameTopup) {
              return jsonResponse({ ok: true, deduplicated: true });
            }
            console.error(
              `[razorpay-webhook] refused payment ${payment.id}: reference ${outcome.matchedReference} already claimed by topup ${outcome.existingTopupId}`,
            );
            await recordException(
              db,
              payment,
              eventType,
              outcome.isAlias
                ? `Bank reference ${outcome.matchedReference} was already credited to top-up ${outcome.existingTopupId}`
                : `Payment reference already credited to top-up ${outcome.existingTopupId}`,
              topupId,
            );
            return jsonResponse({ ok: true, conflict: outcome.matchedReference });

          case "wrong_status":
            console.warn(
              `[razorpay-webhook] payment ${payment.id} for topup ${topupId} in unexpected state ${outcome.status}`,
            );
            await recordException(
              db,
              payment,
              eventType,
              `Top-up was ${outcome.status}, not awaiting payment`,
              topupId,
            );
            return jsonResponse({ ok: true, state: outcome.status });

          case "not_found":
            console.error(
              `[razorpay-webhook] captured payment ${payment.id} references unknown topup ${topupId}`,
            );
            await recordException(db, payment, eventType, "Referenced top-up does not exist", topupId);
            return jsonResponse({ ok: true, reason: "unknown topup" });

          case "invalid":
            // The payment disagrees with the top-up. Never credit on a
            // mismatch — this is the anti-tampering path.
            console.error(
              `[razorpay-webhook] refusing to credit topup ${topupId}: ${outcome.reason}`,
            );
            await recordException(db, payment, eventType, outcome.reason, topupId);
            return jsonResponse({ ok: true, reason: outcome.reason });

          default:
            // `closed` is unreachable from creditTopup, but falling through to
            // a retry and a spurious 503 would be worse than acknowledging.
            console.error(
              `[razorpay-webhook] unexpected outcome for topup ${topupId}:`,
              outcome,
            );
            await recordException(db, payment, eventType, "Unexpected credit outcome", topupId);
            return jsonResponse({ ok: true, reason: "unexpected outcome" });
        }
      } catch (error) {
        if (error instanceof TransactionContention && attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 50 * attempt));
          continue;
        }
        throw error;
      }
    }

    // Contention did not clear. Return 5xx so Razorpay redelivers; the
    // idempotency guards make that safe.
    return jsonResponse({ error: "Could not apply payment, please redeliver" }, 503);
  } catch (error) {
    // Only invite a redelivery when one could actually succeed. Returning 503
    // for a deterministic fault burns Razorpay's retry budget on an operation
    // that will fail identically every time, and leaves no record behind.
    if (error instanceof PermanentFailure) {
      console.error("[razorpay-webhook] permanent failure:", error);
      if (context) {
        await recordException(
          context.db,
          context.payment,
          context.event,
          `Permanent failure while processing: ${error.message}`,
        );
      }
      return jsonResponse({ ok: true, reason: "permanent failure recorded" });
    }
    console.error("[razorpay-webhook] transient failure:", error);
    return jsonResponse({ error: "Temporary failure" }, 503);
  }
});

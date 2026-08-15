// Privileged coin top-up review.
//
// Coin crediting used to run in the browser, which meant the only thing
// standing between a signed-in user and an arbitrary balance was client-side
// UI gating. This endpoint moves the decision behind a verified identity and a
// server-side authority check, and makes crediting idempotent so a replay or a
// second reviewer cannot double-credit.
//
// Scope boundary: this proves *who* approved a top-up and that each approval is
// applied exactly once. It does NOT prove the money arrived. A UPI UTR typed by
// the payer cannot be verified against a static VPA without a payment provider
// or bank reconciliation, so a human reviewer is still the authenticity check.
//
// Required secrets:
//   FIREBASE_SERVICE_ACCOUNT_JSON  service account with Firestore access
//   FIREBASE_PROJECT_ID            optional if present in the service account

import {
  createWrite,
  Firestore,
  fsTimestamp,
  getAccessToken,
  jsonResponse,
  loadServiceAccount,
  mergeWrite,
  resolveProjectId,
  TransactionContention,
  verifyFirebaseIdToken,
  corsHeaders,
} from "../_shared/google.ts";

// Source of truth for pricing. The client's package list is display-only; a
// tampered client cannot invent a coins/amount pair that is not listed here.
const COIN_PACKAGES: ReadonlyArray<{ coins: number; amountInr: number }> = [
  { coins: 100, amountInr: 49 },
  { coins: 500, amountInr: 199 },
  { coins: 1500, amountInr: 499 },
  { coins: 5000, amountInr: 1499 },
];

const FINANCE_ROLES = ["COO", "CEO", "Finance Head"];
const MAX_ATTEMPTS = 3;
const MAX_NOTE_LENGTH = 2000;

interface ReviewRequest {
  topup_id: string;
  decision: "approved" | "rejected";
  note?: string;
}

function parseBody(raw: unknown): ReviewRequest | string {
  if (!raw || typeof raw !== "object") return "Request body must be a JSON object";

  const { topup_id: rawTopupId, decision, note } = raw as Record<string, unknown>;

  if (typeof rawTopupId !== "string" || !rawTopupId.trim()) {
    return "topup_id is required";
  }
  const topupId = rawTopupId.trim();

  // Allow only Firestore-safe id characters. This keeps a caller from
  // addressing a document outside coin_topups via path segments, and rejects
  // reserved (`__name__`) or over-length ids here rather than letting Firestore
  // fail the request as an opaque server error.
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(topupId) || /^__.*__$/.test(topupId)) {
    return "topup_id is malformed";
  }

  if (decision !== "approved" && decision !== "rejected") {
    return "decision must be 'approved' or 'rejected'";
  }

  let reviewNote: string | undefined;
  if (note !== undefined) {
    if (typeof note !== "string") return "note must be a string";
    // Bounded so an oversized note cannot push the document past Firestore's
    // 1MB limit and surface as a server error.
    if (note.length > MAX_NOTE_LENGTH) {
      return `note must be ${MAX_NOTE_LENGTH} characters or fewer`;
    }
    reviewNote = note.trim() || undefined;
  }

  return { topup_id: topupId, decision, note: reviewNote };
}

/**
 * Reviewer notes are kept out of `coin_topups` because the payer can read their
 * own top-up. A note is where a reviewer records a fraud suspicion, so it goes
 * to a collection only finance can read.
 */
function reviewNoteWrite(
  db: Firestore,
  topupId: string,
  decision: string,
  reviewerUid: string,
  note: string,
) {
  return mergeWrite(db.docName("topup_review_notes", topupId), {
    topup_id: topupId,
    decision,
    note,
    reviewer_id: reviewerUid,
    created_at: fsTimestamp(),
  });
}

/**
 * Resolves finance authority from server-trusted sources only.
 *
 * Custom claims are preferred because they cannot be written by the client at
 * all. The profile fallback is acceptable only because security rules now deny
 * client writes to these fields.
 */
async function hasFinanceAuthority(
  db: Firestore,
  uid: string,
  claims: Record<string, unknown>,
): Promise<boolean> {
  if (claims.admin === true || claims.finance === true) return true;

  const name = db.docName("profiles", uid);
  const profiles = await db.batchGet([name]);
  const profile = profiles.get(name);
  if (!profile) return false;

  if (profile.is_admin === true || profile.is_founder === true) return true;
  return typeof profile.role === "string" && FINANCE_ROLES.includes(profile.role);
}

async function approve(
  db: Firestore,
  topupId: string,
  reviewerUid: string,
  note?: string,
): Promise<Response> {
  const transaction = await db.beginTransaction();
  try {
    const topupName = db.docName("coin_topups", topupId);
    const topup = (await db.batchGet([topupName], transaction)).get(topupName);

    if (!topup) {
      await db.rollback(transaction);
      return jsonResponse({ error: "Top-up request not found" }, 404);
    }
    if (topup.status !== "submitted") {
      await db.rollback(transaction);
      return jsonResponse(
        { error: "This top-up has already been processed", status: topup.status },
        409,
      );
    }

    const utr = String(topup.utr ?? "").trim();
    if (!/^[0-9]{12}$/.test(utr)) {
      await db.rollback(transaction);
      return jsonResponse({ error: "Top-up payment reference is invalid" }, 422);
    }

    const coins = Number(topup.coins);
    const amountInr = Number(topup.amount_inr);
    const validPackage = COIN_PACKAGES.some(
      (p) => p.coins === coins && p.amountInr === amountInr,
    );
    if (!validPackage) {
      await db.rollback(transaction);
      return jsonResponse(
        { error: "Top-up package does not match any offered package" },
        422,
      );
    }

    const userId = String(topup.user_id ?? "");
    if (!userId) {
      await db.rollback(transaction);
      return jsonResponse({ error: "Top-up has no associated user" }, 422);
    }

    // The ledger entry is keyed by top-up id and the receipt by payment
    // reference. Together they make crediting idempotent per request *and*
    // per payment, so a user cannot reuse one UTR across two requests.
    const walletName = db.docName("wallets", userId);
    const ledgerName = db.docName("ledger", topupId);
    const receiptName = db.docName("payment_receipts", utr);

    const existing = await db.batchGet(
      [walletName, ledgerName, receiptName],
      transaction,
    );

    if (existing.get(ledgerName)) {
      await db.rollback(transaction);
      return jsonResponse({ error: "This top-up has already been credited" }, 409);
    }
    const receipt = existing.get(receiptName);
    if (receipt) {
      await db.rollback(transaction);
      return jsonResponse(
        {
          error: "This payment reference has already been credited",
          existing_topup_id: receipt.topup_id ?? null,
        },
        409,
      );
    }

    const wallet = existing.get(walletName);
    const currentTotal = Number(wallet?.total ?? 0);
    const newTotal = currentTotal + coins;
    const now = fsTimestamp();

    await db.commit(transaction, [
      mergeWrite(topupName, {
        status: "approved",
        approved_at: now,
        reviewer_id: reviewerUid,
      }, { mustExist: true }),

      mergeWrite(walletName, {
        user_id: userId,
        total: newTotal,
        updated_at: now,
        last_transaction_id: topupId,
      }),

      createWrite(ledgerName, {
        user_id: userId,
        type: "credit",
        amount: coins,
        source: "topup",
        reference_id: topupId,
        reviewer_id: reviewerUid,
        label: "Coin Purchase Approved",
        balance_before: currentTotal,
        balance_after: newTotal,
        created_at: now,
      }),

      createWrite(receiptName, {
        utr,
        topup_id: topupId,
        user_id: userId,
        coins,
        amount_inr: amountInr,
        reviewer_id: reviewerUid,
        created_at: now,
      }),

      ...(note ? [reviewNoteWrite(db, topupId, "approved", reviewerUid, note)] : []),
    ]);

    return jsonResponse({ ok: true, decision: "approved", coins, balance: newTotal });
  } catch (error) {
    await db.rollback(transaction);
    throw error;
  }
}

async function reject(
  db: Firestore,
  topupId: string,
  reviewerUid: string,
  note?: string,
): Promise<Response> {
  const transaction = await db.beginTransaction();
  try {
    const topupName = db.docName("coin_topups", topupId);
    const topup = (await db.batchGet([topupName], transaction)).get(topupName);

    if (!topup) {
      await db.rollback(transaction);
      return jsonResponse({ error: "Top-up request not found" }, 404);
    }
    if (topup.status !== "submitted") {
      await db.rollback(transaction);
      return jsonResponse(
        { error: "This top-up has already been processed", status: topup.status },
        409,
      );
    }

    await db.commit(transaction, [
      mergeWrite(topupName, {
        status: "rejected",
        reviewed_at: fsTimestamp(),
        reviewer_id: reviewerUid,
      }, { mustExist: true }),

      ...(note ? [reviewNoteWrite(db, topupId, "rejected", reviewerUid, note)] : []),
    ]);

    return jsonResponse({ ok: true, decision: "rejected" });
  } catch (error) {
    await db.rollback(transaction);
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return jsonResponse({ error: "Request body must be valid JSON" }, 400);
    }

    const parsed = parseBody(rawBody);
    if (typeof parsed === "string") {
      return jsonResponse({ error: parsed }, 400);
    }

    const authorization = req.headers.get("Authorization") ?? "";
    const idToken = authorization.toLowerCase().startsWith("bearer ")
      ? authorization.slice(7).trim()
      : "";
    if (!idToken) {
      return jsonResponse({ error: "Missing bearer token" }, 401);
    }

    const serviceAccount = loadServiceAccount();
    const projectId = resolveProjectId(serviceAccount);

    let reviewer;
    try {
      reviewer = await verifyFirebaseIdToken(idToken, projectId);
    } catch (error) {
      // Do not leak which specific claim check failed.
      console.warn("[finance-review-topup] token rejected:", String(error));
      return jsonResponse({ error: "Invalid or expired session" }, 401);
    }

    const accessToken = await getAccessToken(serviceAccount, [
      "https://www.googleapis.com/auth/datastore",
    ]);
    const db = new Firestore(projectId, accessToken);

    if (!(await hasFinanceAuthority(db, reviewer.uid, reviewer.claims))) {
      console.warn(
        `[finance-review-topup] denied for ${reviewer.uid} on ${parsed.topup_id}`,
      );
      return jsonResponse({ error: "You are not authorized to review top-ups" }, 403);
    }

    try {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          return parsed.decision === "approved"
            ? await approve(db, parsed.topup_id, reviewer.uid, parsed.note)
            : await reject(db, parsed.topup_id, reviewer.uid, parsed.note);
        } catch (error) {
          if (error instanceof TransactionContention && attempt < MAX_ATTEMPTS) {
            // Another reviewer touched the same documents. Retrying is safe:
            // the retry re-reads the top-up and reports the terminal status
            // rather than crediting again.
            await new Promise((r) => setTimeout(r, 50 * attempt));
            continue;
          }
          throw error;
        }
      }
    } catch (error) {
      // Sustained contention is a conflict, not a server fault. Reporting it as
      // 500 would tell the reviewer to retry while hiding why it failed.
      if (error instanceof TransactionContention) {
        return jsonResponse(
          { error: "Another reviewer is updating this top-up. Try again." },
          409,
        );
      }
      throw error;
    }

    return jsonResponse({ error: "Review did not complete" }, 500);
  } catch (error) {
    console.error("[finance-review-topup] unexpected failure:", error);
    return jsonResponse({ error: "Review failed. Please retry." }, 500);
  }
});

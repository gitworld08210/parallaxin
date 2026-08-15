// Manual UPI top-up review.
//
// Coin crediting used to run in the browser, which meant the only thing
// standing between a signed-in user and an arbitrary balance was client-side UI
// gating. This endpoint moves the decision behind a verified identity and a
// server-side authority check, and credits through the shared atomic path so a
// replay or a second reviewer cannot double-credit.
//
// Scope boundary: this proves *who* approved a top-up and that each approval is
// applied exactly once. It does NOT prove the money arrived — a UPI reference
// typed by the payer cannot be checked against a static VPA. The Razorpay flow
// in `razorpay-webhook` is the verified alternative; this path remains for
// manual reconciliation.
//
// Required secrets:
//   FIREBASE_SERVICE_ACCOUNT_JSON  service account with Firestore access
//   FIREBASE_PROJECT_ID            optional if present in the service account

import {
  corsHeaders,
  Firestore,
  fsTimestamp,
  getAccessToken,
  jsonResponse,
  loadServiceAccount,
  mergeWrite,
  resolveProjectId,
  TransactionContention,
  verifyFirebaseIdToken,
} from "../_shared/google.ts";
import { closeTopupWithoutCredit, creditTopup } from "../_shared/credit.ts";

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
function reviewNoteWrites(
  topupId: string,
  decision: string,
  reviewerUid: string,
  note?: string,
) {
  if (!note) return () => [];
  return (db: Firestore) => [
    mergeWrite(db.docName("topup_review_notes", topupId), {
      topup_id: topupId,
      decision,
      note,
      reviewer_id: reviewerUid,
      created_at: fsTimestamp(),
    }),
  ];
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
  const profile = (await db.batchGet([name])).get(name);
  if (!profile) return false;

  if (profile.is_admin === true || profile.is_founder === true) return true;
  return typeof profile.role === "string" && FINANCE_ROLES.includes(profile.role);
}

async function review(
  db: Firestore,
  request: ReviewRequest,
  reviewerUid: string,
): Promise<Response> {
  const { topup_id: topupId, decision, note } = request;
  const extraWrites = reviewNoteWrites(topupId, decision, reviewerUid, note);

  const outcome = decision === "approved"
    ? await creditTopup(db, {
      topupId,
      expectedStatus: "submitted",
      terminalStatus: "approved",
      reference: { kind: "upi_utr" },
      actorId: reviewerUid,
      source: "topup",
      topupFields: { approved_at: fsTimestamp(), reviewer_id: reviewerUid },
      extraWrites,
    })
    : await closeTopupWithoutCredit(db, {
      topupId,
      expectedStatus: "submitted",
      terminalStatus: "rejected",
      fields: { reviewed_at: fsTimestamp(), reviewer_id: reviewerUid },
      extraWrites,
    });

  switch (outcome.kind) {
    case "credited":
      return jsonResponse({
        ok: true,
        decision,
        coins: outcome.coins,
        balance: outcome.balance,
      });
    case "closed":
      return jsonResponse({ ok: true, decision });
    case "not_found":
      return jsonResponse({ error: "Top-up request not found" }, 404);
    case "wrong_status":
      return jsonResponse(
        { error: "This top-up has already been processed", status: outcome.status },
        409,
      );
    case "already_credited":
      return jsonResponse({ error: "This top-up has already been credited" }, 409);
    case "duplicate_payment":
      return jsonResponse({
        error: "This payment reference has already been credited",
        existing_topup_id: outcome.existingTopupId,
      }, 409);
    case "invalid":
      return jsonResponse({ error: outcome.reason }, 422);
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
          return await review(db, parsed, reviewer.uid);
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

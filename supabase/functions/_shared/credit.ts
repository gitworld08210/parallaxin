// The single atomic coin-crediting operation.
//
// Both the manual UPI review path and the Razorpay webhook credit through this
// function. Money must have exactly one implementation: two paths that each
// compute a balance and write a ledger entry will drift, and a bug in the less
// exercised one is the kind that is found by a user, not by us.
//
// Every credit writes four documents in one Firestore transaction:
//   coin_topups/{id}        the request reaches a terminal state
//   wallets/{uid}           the canonical balance
//   ledger/{topup_id}       one credit per request  (exists:false)
//   payment_receipts/{ref}  one credit per payment  (exists:false)
//
// The two preconditioned creates are what make this idempotent. A replayed
// webhook, a double click, or two reviewers acting at once all converge on
// "already credited" rather than crediting twice.

import {
  createWrite,
  Firestore,
  fsTimestamp,
  mergeWrite,
  type FirestoreWrite,
} from "./google.ts";

/**
 * Server-side price list. This is the source of truth: the client package list
 * is display-only, so a tampered client cannot invent a coins/amount pair.
 */
export const COIN_PACKAGES: ReadonlyArray<{ coins: number; amountInr: number }> = [
  { coins: 100, amountInr: 49 },
  { coins: 500, amountInr: 199 },
  { coins: 1500, amountInr: 499 },
  { coins: 5000, amountInr: 1499 },
];

export function findPackage(coins: number) {
  return COIN_PACKAGES.find((p) => p.coins === coins);
}

export function isValidPackage(coins: number, amountInr: number): boolean {
  return COIN_PACKAGES.some((p) => p.coins === coins && p.amountInr === amountInr);
}

/**
 * How the payment is identified, which becomes the `payment_receipts` key.
 *
 * `upi_utr` is read from the top-up document because the payer supplied it.
 * `provider` is supplied by the caller because it comes from a trusted webhook.
 */
export type PaymentReference =
  | { kind: "upi_utr" }
  | { kind: "provider"; provider: string; id: string };

export interface CreditOptions {
  topupId: string;
  /** The status the top-up must currently be in for this credit to be valid. */
  expectedStatus: string;
  /** The terminal status to write. */
  terminalStatus: string;
  reference: PaymentReference;
  /** Reviewer uid, or a provider identifier for automated credits. */
  actorId: string;
  /** Ledger `source`, e.g. "topup" or "topup_razorpay". */
  source: string;
  /**
   * Additional payment references to claim, beyond the primary one.
   *
   * The two payment paths key receipts differently — a Razorpay payment id
   * versus a bank UTR — so the same underlying bank payment could otherwise be
   * claimed once per path. Claiming the bank reference here as well makes the
   * second attempt collide instead of crediting again.
   */
  secondaryReferences?: string[];
  /**
   * Checks against the stored top-up, evaluated inside the transaction.
   *
   * The caller cannot see the top-up document, so this is the only place a
   * webhook can assert that the payment which arrived is the one this top-up is
   * for. Returning a string refuses the credit.
   */
  validate?: (topup: Record<string, unknown>) => string | null;
  /** Extra fields merged onto the top-up document. */
  topupFields?: Record<string, unknown>;
  /** Additional writes to commit in the same transaction. */
  extraWrites?: (db: Firestore) => FirestoreWrite[];
}

export type CreditOutcome =
  | { kind: "credited"; coins: number; balance: number; userId: string }
  /** Reached a terminal state without a credit, e.g. rejected or failed. */
  | { kind: "closed"; userId: string }
  | { kind: "already_credited" }
  /**
   * A reference this payment would claim is already claimed.
   *
   * `isAlias` distinguishes the two very different situations this covers. A
   * collision on the primary reference for the same top-up is a harmless
   * redelivery. A collision on an alias, or on a different top-up, means this is
   * a *distinct* payment that has just been refused — someone was charged and
   * has no coins, which needs a human.
   */
  | {
    kind: "duplicate_payment";
    existingTopupId: string | null;
    matchedReference: string;
    isAlias: boolean;
    sameTopup: boolean;
  }
  | { kind: "not_found" }
  | { kind: "wrong_status"; status: string }
  | { kind: "invalid"; reason: string };

export async function creditTopup(
  db: Firestore,
  options: CreditOptions,
): Promise<CreditOutcome> {
  const {
    topupId,
    expectedStatus,
    terminalStatus,
    reference,
    actorId,
    source,
    secondaryReferences = [],
    validate,
    topupFields = {},
    extraWrites,
  } = options;

  const transaction = await db.beginTransaction();
  try {
    const topupName = db.docName("coin_topups", topupId);
    const topup = (await db.batchGet([topupName], transaction)).get(topupName);

    if (!topup) {
      await db.rollback(transaction);
      return { kind: "not_found" };
    }
    if (topup.status !== expectedStatus) {
      await db.rollback(transaction);
      return { kind: "wrong_status", status: String(topup.status ?? "unknown") };
    }

    // Bind the payment to this top-up before anything is credited.
    const mismatch = validate?.(topup);
    if (mismatch) {
      await db.rollback(transaction);
      return { kind: "invalid", reason: mismatch };
    }

    // Resolve the payment reference that will key the receipt.
    let paymentRef: string;
    if (reference.kind === "upi_utr") {
      paymentRef = String(topup.utr ?? "").trim();
      if (!/^[0-9]{12}$/.test(paymentRef)) {
        await db.rollback(transaction);
        return { kind: "invalid", reason: "Payment reference is invalid" };
      }
    } else {
      paymentRef = reference.id.trim();
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(paymentRef)) {
        await db.rollback(transaction);
        return { kind: "invalid", reason: "Provider payment id is invalid" };
      }
    }

    const coins = Number(topup.coins);
    const amountInr = Number(topup.amount_inr);
    if (!isValidPackage(coins, amountInr)) {
      await db.rollback(transaction);
      return {
        kind: "invalid",
        reason: "Top-up does not match any offered package",
      };
    }

    const userId = String(topup.user_id ?? "");
    if (!userId) {
      await db.rollback(transaction);
      return { kind: "invalid", reason: "Top-up has no associated user" };
    }

    const walletName = db.docName("wallets", userId);
    const ledgerName = db.docName("ledger", topupId);
    const receiptName = db.docName("payment_receipts", paymentRef);

    // Claim every reference this payment is known by, so the payment cannot be
    // credited again through another path under a different identifier.
    const secondaryNames = secondaryReferences
      .map((ref) => ref.trim())
      .filter((ref) => /^[A-Za-z0-9_-]{1,128}$/.test(ref) && ref !== paymentRef)
      .map((ref) => db.docName("payment_receipts", ref));

    const existing = await db.batchGet(
      [walletName, ledgerName, receiptName, ...secondaryNames],
      transaction,
    );

    if (existing.get(ledgerName)) {
      await db.rollback(transaction);
      return { kind: "already_credited" };
    }

    for (const name of [receiptName, ...secondaryNames]) {
      const receipt = existing.get(name);
      if (receipt) {
        await db.rollback(transaction);
        const existingTopupId = (receipt.topup_id as string) ?? null;
        return {
          kind: "duplicate_payment",
          existingTopupId,
          matchedReference: name.split("/").pop() ?? name,
          isAlias: name !== receiptName,
          sameTopup: existingTopupId === topupId,
        };
      }
    }

    const wallet = existing.get(walletName);
    const currentTotal = Number(wallet?.total ?? 0);
    const newTotal = currentTotal + coins;
    const now = fsTimestamp();

    await db.commit(transaction, [
      mergeWrite(topupName, {
        status: terminalStatus,
        credited_at: now,
        ...topupFields,
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
        source,
        reference_id: topupId,
        payment_reference: paymentRef,
        actor_id: actorId,
        label: "Coin Purchase",
        balance_before: currentTotal,
        balance_after: newTotal,
        created_at: now,
      }),

      createWrite(receiptName, {
        reference: paymentRef,
        reference_kind: reference.kind === "upi_utr" ? "upi_utr" : reference.provider,
        topup_id: topupId,
        user_id: userId,
        coins,
        amount_inr: amountInr,
        actor_id: actorId,
        created_at: now,
      }),

      ...secondaryNames.map((name) =>
        createWrite(name, {
          reference: name.split("/").pop(),
          reference_kind: "alias",
          primary_reference: paymentRef,
          topup_id: topupId,
          user_id: userId,
          coins,
          amount_inr: amountInr,
          actor_id: actorId,
          created_at: now,
        })
      ),

      ...(extraWrites ? extraWrites(db) : []),
    ]);

    return { kind: "credited", coins, balance: newTotal, userId };
  } catch (error) {
    await db.rollback(transaction);
    throw error;
  }
}

export type EventRecordResult =
  | { ok: true }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "wrong_status"; status: string }
  | { ok: false; reason: "wrong_owner" };

/**
 * Merges fields onto a top-up without changing its status.
 *
 * Guarded by both status and owner because the top-up document is the
 * reconciliation record. Stamping a failure onto an already-approved top-up, or
 * onto one belonging to someone else, would mislead exactly the people who read
 * these documents to resolve payment problems.
 */
export async function recordTopupEvent(
  db: Firestore,
  options: {
    topupId: string;
    expectedStatus: string;
    expectedUserId?: string;
    fields: Record<string, unknown>;
  },
): Promise<EventRecordResult> {
  const { topupId, expectedStatus, expectedUserId, fields } = options;

  const transaction = await db.beginTransaction();
  try {
    const topupName = db.docName("coin_topups", topupId);
    const topup = (await db.batchGet([topupName], transaction)).get(topupName);

    if (!topup) {
      await db.rollback(transaction);
      return { ok: false, reason: "not_found" };
    }
    if (topup.status !== expectedStatus) {
      await db.rollback(transaction);
      return { ok: false, reason: "wrong_status", status: String(topup.status ?? "unknown") };
    }
    if (expectedUserId && String(topup.user_id ?? "") !== expectedUserId) {
      await db.rollback(transaction);
      return { ok: false, reason: "wrong_owner" };
    }

    await db.commit(transaction, [
      mergeWrite(topupName, fields, { mustExist: true }),
    ]);
    return { ok: true };
  } catch (error) {
    await db.rollback(transaction);
    throw error;
  }
}

/** Marks a top-up terminal without crediting. */
export async function closeTopupWithoutCredit(
  db: Firestore,
  options: {
    topupId: string;
    expectedStatus: string;
    terminalStatus: string;
    fields?: Record<string, unknown>;
    extraWrites?: (db: Firestore) => FirestoreWrite[];
  },
): Promise<CreditOutcome> {
  const { topupId, expectedStatus, terminalStatus, fields = {}, extraWrites } = options;

  const transaction = await db.beginTransaction();
  try {
    const topupName = db.docName("coin_topups", topupId);
    const topup = (await db.batchGet([topupName], transaction)).get(topupName);

    if (!topup) {
      await db.rollback(transaction);
      return { kind: "not_found" };
    }
    if (topup.status !== expectedStatus) {
      await db.rollback(transaction);
      return { kind: "wrong_status", status: String(topup.status ?? "unknown") };
    }

    await db.commit(transaction, [
      mergeWrite(topupName, {
        status: terminalStatus,
        ...fields,
      }, { mustExist: true }),
      ...(extraWrites ? extraWrites(db) : []),
    ]);

    return { kind: "closed", userId: String(topup.user_id ?? "") };
  } catch (error) {
    await db.rollback(transaction);
    throw error;
  }
}

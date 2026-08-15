# Coin top-up backend

Two ways to buy coins, sharing one crediting implementation.

| Path | Payment proven by | Functions |
| --- | --- | --- |
| Razorpay (preferred) | Razorpay's signed webhook | `razorpay-create-order`, `razorpay-webhook` |
| Manual UPI (legacy) | A human reviewer reading a bank statement | `finance-review-topup` |

Both credit through `creditTopup` in `_shared/credit.ts`. Money has exactly one
implementation on purpose — two paths that each compute a balance will drift,
and the bug will be in whichever one is exercised less.

## Razorpay flow

```
client ──► razorpay-create-order ──► Razorpay Orders API
                    │                        │
             coin_topups/{id}                │  user pays
             awaiting_payment                ▼
                                      razorpay-webhook
                                             │  HMAC verified
                                             ▼
                        wallets · ledger · payment_receipts
```

The client sends only which package it wants. The amount is read from
`COIN_PACKAGES` in `_shared/credit.ts`, so a tampered client cannot pay ₹1 for
5000 coins.

## Idempotency

Every credit creates two documents with an `exists: false` precondition inside
the same transaction:

- `ledger/{topup_id}` — one credit per request.
- `payment_receipts/{reference}` — one credit per payment, where the reference is
  the Razorpay payment id or the UPI UTR. This is what stops one payment being
  credited against two top-ups.

Razorpay retries any non-2xx, so a redelivered webhook is expected and returns
200 without crediting again.

## Secrets

| Secret | Used by | Notes |
| --- | --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | all | Grants rule-bypassing Firestore writes. Never expose to a client. |
| `FIREBASE_PROJECT_ID` | all | Only if absent from the service account JSON. |
| `RAZORPAY_KEY_ID` | create-order | Also returned to the client to open checkout. |
| `RAZORPAY_KEY_SECRET` | create-order | Server only. |
| `RAZORPAY_WEBHOOK_SECRET` | webhook | Must match the secret set on the Razorpay webhook. |

```bash
supabase secrets set \
  FIREBASE_SERVICE_ACCOUNT_JSON="$(cat service-account.json)" \
  RAZORPAY_KEY_ID=rzp_live_xxx \
  RAZORPAY_KEY_SECRET=xxx \
  RAZORPAY_WEBHOOK_SECRET=xxx

supabase functions deploy razorpay-create-order
supabase functions deploy razorpay-webhook
supabase functions deploy finance-review-topup
```

In the Razorpay dashboard, point the webhook at
`https://<project>.supabase.co/functions/v1/razorpay-webhook` and subscribe to
`payment.captured` and `payment.failed`.

`verify_jwt = false` is set for all three in `config.toml`. This is required, not
a shortcut: the Supabase gateway can validate neither a Firebase ID token nor a
Razorpay signature. Each function verifies its own caller before doing any work.

## Top-up states

```
Razorpay:  awaiting_payment ──► approved
Manual:    pending ──► submitted ──► approved
                                 └─► rejected
```

Both paths end in `approved` so wallet history does not need a second word for
"successfully paid".

`payment.failed` is deliberately **not** terminal. Razorpay orders stay open and
payers retry on the same order after a decline, so closing the top-up would mean
refusing the eventual successful capture and charging someone without crediting
them. Failures are recorded on the top-up and a sweep can expire stale ones.

Terminal states are never re-credited: crediting requires the exact expected
status inside the transaction.

## Attribution and amount binding

`notes` travels through Checkout and can be set by the browser, so it is not
trusted for attribution. The webhook resolves the top-up through
`razorpay_orders/{order_id}`, written at order creation, and then — inside the
credit transaction — checks that the payment's order id, amount, currency and
captured status match the stored top-up. Without that binding, paying ₹49 while
pointing at a ₹1,499 top-up would credit 5,000 coins.

## When a payment cannot be credited

A charged payment that cannot be credited writes `payment_exceptions/{payment_id}`
(finance-readable) and returns 200, because retrying cannot fix it but someone
must see it. This covers unattributable payments, amount mismatches, top-ups in
an unexpected state, and refunds — coins are spendable, so a refund is not
auto-reversed.

## Deploying safely

1. Set secrets and deploy all three functions.
2. Deploy `firestore.rules`. Clients cannot write `wallets`, `ledger`, or
   `payment_receipts` at all, so the functions must be live first.
3. **Provision finance staff via the Firebase console or Admin SDK.** `is_admin`,
   `is_founder`, and `role` are no longer client-writable, and a `finance` or
   `admin` custom claim is preferred over the profile fallback.
4. Test with Razorpay test keys before switching to live keys.
5. Reconcile historical balances. The previous rules permitted client writes to
   balances, so existing `wallets/{uid}.total` values cannot be assumed to match
   the ledger.

## Known limitation

`finance-review-topup` proves who approved a top-up and that it applies once. It
cannot prove the money arrived, because a UPI reference typed by the payer is not
verifiable against a static VPA. Prefer the Razorpay path; keep the manual one
only for reconciliation.

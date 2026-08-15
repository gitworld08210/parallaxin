# finance-review-topup

Approves or rejects coin top-ups. Runs under a Firebase service account so that
crediting is not reachable from the browser.

## Why it exists

Approval previously ran in the client, so authorization depended on UI gating
and the balance was computed from data the browser supplied. This function
verifies the reviewer's Firebase ID token, checks finance authority server-side,
and applies the credit exactly once.

## Request

```
POST /functions/v1/finance-review-topup
Authorization: Bearer <firebase-id-token>

{ "topup_id": "abc123", "decision": "approved", "note": "optional" }
```

Responses: `200` on success, `401` unauthenticated, `403` not finance staff,
`404` unknown top-up, `409` already processed or duplicate UTR, `422` invalid
package or payment reference.

## Required secrets

| Secret | Purpose |
| --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Service account JSON with Firestore access. Grants rule-bypassing writes — never expose to the client. |
| `FIREBASE_PROJECT_ID` | Only needed if the service account JSON omits `project_id`. |

```bash
supabase secrets set FIREBASE_SERVICE_ACCOUNT_JSON="$(cat service-account.json)"
supabase functions deploy finance-review-topup
```

## Authorization

Authority is taken from server-trusted sources only, in this order:

1. `admin` or `finance` Firebase custom claim.
2. `profiles/{uid}` with `is_admin`, `is_founder`, or `role` in
   `COO`, `CEO`, `Finance Head`.

The profile fallback is only sound because `firestore.rules` denies client
writes to those fields. **Provision the first admin via the Firebase console or
Admin SDK** — it can no longer be self-assigned from the app.

## Reviewer notes

An optional `note` is stored in `topup_review_notes/{topup_id}`, not on the
top-up itself, because a payer can read their own `coin_topups` document and a
note may record a fraud suspicion. Notes are capped at 2000 characters.

## Idempotency

Two documents guard against double-crediting, both created with an
`exists: false` precondition inside one transaction:

- `ledger/{topup_id}` — one credit per request.
- `payment_receipts/{utr}` — one credit per payment reference, so the same UTR
  cannot be reused across two requests.

## Known limitation

This does not verify that money arrived. A UPI UTR entered by the payer cannot
be checked against a static VPA without a payment provider or bank
reconciliation, so a human reviewer remains the authenticity check. Pricing is
validated against the `COIN_PACKAGES` table in `index.ts`, which is the source
of truth; the client list is display-only.

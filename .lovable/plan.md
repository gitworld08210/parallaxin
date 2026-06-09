
## Switch from Stripe → Paytm Business

Lovable has no built-in Paytm connector, so this is a custom integration using your Paytm Business merchant credentials. Paytm supports UPI, cards, netbanking, wallets — all rupee-native, India-first, no MOR fees.

### What you'll need from Paytm Business dashboard
1. **MID** (Merchant ID)
2. **Merchant Key** (server-side signing key — secret)
3. **Website name** (e.g. `DEFAULT` for staging, your registered site for prod)
4. Staging vs Production toggle

I'll add these as secrets: `PAYTM_MID`, `PAYTM_MERCHANT_KEY`, `PAYTM_WEBSITE`, `PAYTM_ENV` (`staging` | `production`).

### Scope of changes

**Remove (Stripe):**
- `src/lib/stripe.ts`, `src/components/StripeEmbeddedCheckout.tsx`, `src/components/PaymentTestModeBanner.tsx`, `src/hooks/useStripeCheckout.tsx`
- `supabase/functions/create-checkout`, `create-portal-session`, `create-tip-checkout`, `payments-webhook`, `_shared/stripe.ts`
- `@stripe/*` packages, `VITE_PAYMENTS_CLIENT_TOKEN`
- Stripe blocks from `supabase/config.toml`

**Add (Paytm):**
- `supabase/functions/paytm-initiate-txn` — auth user, insert pending `tips` row, call Paytm `initiateTransaction` API with checksum, return `txnToken` + `orderId` + `mid`
- `supabase/functions/paytm-callback` — public webhook, verify checksum, mark `tips.status='paid'`, run `credit_creator`, create notification (idempotent on `orderId`)
- `supabase/functions/_shared/paytm.ts` — checksum generate/verify (AES-128-CBC + SHA256, per Paytm spec)
- `src/lib/paytm.ts` — loads Paytm JS Checkout (`https://securegw{-stage}.paytm.in/merchantpgpui/checkoutjs/merchants/{MID}.js`), opens drop-in
- `src/components/PaytmCheckout.tsx` — replaces embedded Stripe checkout
- `src/pages/CheckoutReturn.tsx` — re-point to Paytm order status

**Update:**
- `src/components/social/TipSheet.tsx` — call `paytm-initiate-txn` then open Paytm drop-in
- Currency forced to `INR`, min ₹49 (already), platform fee 15% kept
- `tips` table: rename Stripe-specific columns or just repurpose `stripe_session_id` → store Paytm `orderId` (one migration to add `paytm_order_id text unique` + drop unused; or keep column, just store orderId there — I'll add a clean column)

**DB migration:** add `paytm_order_id text unique` to `tips`; index on it. Same for any future `coin_transactions` / `subscriptions` migrations if you ever add those back. Subscriptions are out of scope for now (Paytm subscriptions need a separate "Subscription Payments" approval from Paytm — flag for later).

### Webhook URL you'll paste into Paytm dashboard
```
https://xmztbdaupkvezhhokmwx.supabase.co/functions/v1/paytm-callback
```

### Out of scope
- Recurring subscriptions (Paytm requires separate merchant approval)
- Payouts to creators (Paytm Payouts API needs separate KYC; keep current manual `payout_requests` flow)
- Coin packs (no UI currently wired; skip until needed)

### Confirm to proceed
Reply "go" and I'll:
1. Request the 4 Paytm secrets
2. Delete Stripe code + functions
3. Run the `tips` migration
4. Build Paytm integration + redeploy functions

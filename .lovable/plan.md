## Enable Stripe payments on Aurelix

### Step 1 — Enable Stripe (built-in)

Call `enable_stripe_payments`. You'll get a short form (email, name, business) → a **test environment** is provisioned instantly. No Stripe account or API key needed to start.

### Step 2 — Choose tax handling

Pick one (per checkout, but we'll set a default):

1. **Stripe handles taxes fully** (+3.5% per txn) — recommended for digital-only products if your country is supported.
2. **Stripe calculates + collects, you file** (+0.5%) — middle ground.
3. **No tax automation** — you handle taxes yourself.

### Step 3 — Define products

Tell me what you want to sell. Sensible defaults for a creator-social app:

- **Aurelix Premium** — ₹499/month subscription (ad-free, larger uploads, premium badge)
- **Aurelix Pro** — ₹999/month (Premium + analytics, scheduled posts, custom themes)
- **Creator Tip** — pay-what-you-want one-time (optional)

I'll create them with `batch_create_product` once you confirm.

### Step 4 — Build the checkout flow

- New page `/premium` (pricing cards for Premium / Pro)
- "Upgrade" button → edge function `create-checkout` → returns Stripe Checkout URL → redirect
- Success page `/premium/success` validates the session
- Webhook edge function `stripe-webhook` updates a new `subscriptions` table (user_id, tier, status, current_period_end)
- New table `subscriptions` with RLS (user reads own, service role writes)
- Hook `useSubscription()` to gate features in UI (e.g. show Premium badge, unlock features)
- "Manage subscription" button → Stripe Customer Portal

### Step 5 — Optional: Tips on profiles

"Tip creator" button on Profile → one-time checkout → records in a `tips` table for the creator's wallet.

### Out of scope for this round

- Going live (requires you claim your Stripe account later)
- Payouts to creators (Stripe Connect — separate, bigger effort)
- Shopify / physical goods

### What I need from you to start

1. Confirm: **enable Stripe now**
2. Tax option: **1 / 2 / 3**
3. Products: **use the defaults above** or list your own (name, price, monthly/yearly/one-time)
4. Include creator tips? **yes / no**
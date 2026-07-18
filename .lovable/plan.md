# Aurelix — User + Creator Audit + Flow 1 Plan

## Part A — Audit summary (what's broken across 4 areas)

### 1. Aurelix Coins economy

**Works:** `creator_balance`, `tips`, `payout_requests`, `dm_unlocks`, `post_unlocks`, `live_gifts`, KYC-gated payouts (`CreatorEarnings.tsx`), live gift/ticket edge functions.  

Note:- Make currency is rupees not dollers  
**Broken:**

- `Wallet.tsx` headline "coins/XP/trust" are **fake formulas** from `posts_count * 100 + followers_count * 10` — completely ignores real `profiles.coin_balance` and `coin_transactions`.
- "Earn" / "Redeem" buttons have no `onClick`.
- `Monetization.tsx` is 100% hardcoded `$. 0.00` placeholder — Withdraw permanently disabled, duplicates (and contradicts) `CreatorEarnings`.
- Two parallel ledgers (`coin_balance` vs `creator_balance`) never reconciled; LiveViewer tells users "top up in Wallet" but Wallet has no top-up.
- No transaction history UI anywhere (nothing lists rows from `coin_transactions` / `tips` / `unlocks` / `payout_requests` for the user).
- No payout status list for creators.

### 2. XP / Levels / Aura / Achievements

**Reality: no XP system exists.** No `xp` column, no XP triggers, no achievement-unlock table.

- `AuraLevel.tsx` — hardcoded `pct=0`, "0/1000 XP", all benefits permanently locked.
- `Achievements.tsx` — hardcoded static array, all `Lock` + `opacity-70`, progress fixed `0/24`.
- Wallet.tsx invents a different "Level" from post/follower counts. Two contradictory surfaces, both cosmetic.

### 3. Creator Hub

**Works:** route + gate, quick-access grid, `CreatorEarnings` (only real surface).
**Broken/Gaps:**

- CreatorHub KPIs (Earnings/Views/Reach/Engagement) all hardcoded `0` / `$0`.
- **No Subscribe button anywhere on `Profile.tsx**` — `subscriptions` table + `has_active_subscription()` RPC exist and are already read by LiveViewer, but funnel has no entry point.
- No subscribers list, no exclusive-content manager (posts.is_paid + price_cents columns exist but no creator UI to set them).
- No live scheduling, no real analytics, no payout history.

### 4. Support

**Works:** `Support.tsx` intake, `sup_tickets` auto-routing to departments, SLA trigger, admin queue.
**Broken/Gaps:**

- **User cannot open a past ticket** — chevron on rows is not clickable, no `/support/:id` route, `sup_messages` two-way reply UI missing (backend RLS supports it).
- No CSAT feedback UI despite `sup_feedback` table.
- 5 of 9 status enum values are unstyled.
- **No creator-priority channel** — "creator" is just a category tag; no separate queue, no SLA boost, no verified-creator badge on tickets.

### Recommendation

Ship in this order:

1. **Wallet + Coins reconciliation + Subscribe on Profile** ← this plan
2. Creator Hub redesign (subscribers list, exclusive-content manager, live schedule)
3. Support: ticket detail + reply + creator-priority queue
4. Real XP/achievements backend last (biggest net-new build, zero live dependents)

---

## Part B — Flow 1 plan (this round)

Goal: make Wallet the honest single source of truth for coins and money, and give fans a real way to subscribe to creators from the profile page. Keep Aurelix dark violet theme.

### Scope (in)

1. **Wallet redesign** using real data
  - Replace fake `xp/auraCoins/trustScore` math with real values:
    - Coin balance → `profiles.coin_balance`
    - Creator earnings section (only if `useIsCreator()`) → existing `CreatorEarnings` (available/pending/lifetime)
  - New **Transactions** tab: unified feed from `coin_transactions`, `tips` (as payer AND recipient), `post_unlocks`, `dm_unlocks`, `live_gifts` (sent + received), `payout_requests`. Grouped by day, filter chips (All / Spent / Earned / Payouts).
  - New **Buy Coins** sheet (top-up): preset packs (100 / 500 / 1,500 / 5,000 coins), invokes a new `create-coin-topup` edge function that returns a UPI intent (matching the manual-UTR pattern already used by `TipSheet`) and calls `verify_coin_topup_with_utr` RPC — mirrors existing tip flow, no new payment provider needed. Removes the dead "top up in Wallet" pointer from LiveViewer.
  - "Earn coins" section: honest list of ways to earn (currently: receive tips, sell exclusive posts, live gifts, subscriptions). No fake XP formula.
  - Fix "Redeem" → routes to Store; "Earn" → scrolls to earn section.
  - Kill duplicate `Monetization.tsx` KPI cards; page becomes a thin redirect to Wallet (creator view) so we have one truth.
2. **Payout history** (creator side)
  - New card under `CreatorEarnings`: last 10 `payout_requests` with status badge (pending/approved/paid/rejected) + amount + timestamp + rejection reason if any.
3. **Subscribe / paywall on Profile**
  - On `Profile.tsx`, when viewing a creator who has enabled subscriptions:
    - Add primary **Subscribe** button next to Follow (only for non-owner, non-subscribed viewers).
    - Show tier + monthly price (₹/coins) + perks preview (exclusive posts count, subscriber-only lives, DM priority).
    - If already subscribed: show "Subscribed ✓" pill with "Manage" opening a sheet (renew status, cancel, next billing date).
  - New **SubscribeSheet** — plan summary, price, "Subscribe with coins" primary CTA (deducts from `profiles.coin_balance` via new `subscribe_creator` RPC, inserts into `subscriptions`, credits `creator_balance`). Fallback: "Pay with UPI" using the same manual-UTR flow.
  - Creator side: minimal **Subscription settings** row inside Creator Hub → toggle "Enable subscriptions", set monthly price, edit 3 perks bullets. Stored in new `creator_subscription_settings` table.
  - Exclusive posts already have `is_paid`/`price_cents`; PostCard gets a subscriber-only variant: if post is marked `subscribers_only` and viewer is not subscribed, show blurred preview + "Subscribe to unlock" CTA.
4. **Small consistency fixes surfaced during audit**
  - Remove the two contradictory "Level" surfaces from Wallet (defer real XP to a later flow — replace with a single "Aurelix Tier" derived from `profiles.tier` only, honest and static until XP ships).
  - LiveViewer "not enough coins" toast → deep-links to new Buy Coins sheet.

### Scope (out — deferred)

- Real XP engine, achievements unlocks, streaks, seasonal pools.
- Creator Hub full redesign (subscribers list, analytics, live schedule) — next flow.
- Support ticket detail + creator priority — later flow.
- Auto-settled card/UPI payments via Stripe/Razorpay webhooks (staying on the existing manual-UTR reconciliation model this round).

### Technical notes

- **New tables** (migration): `creator_subscription_settings (creator_id, enabled, monthly_price_coins, monthly_price_inr_cents, perks jsonb, updated_at)`. Grants + RLS: public read for enabled creators, owner-only write. Enforce standard 4-step grant + RLS pattern.
- **New RPCs**: `subscribe_creator(creator_id, months)` (atomic: debit coin_balance, insert/extend subscription row, credit creator_balance minus platform fee from `app_config`), `cancel_subscription(subscription_id)`, `verify_coin_topup_with_utr(txn_id, utr)`.
- **New edge function**: `create-coin-topup` — returns UPI intent + creates pending `coin_transactions` row.
- **Client hooks**: `useWalletLedger` (unified transactions query), `useCreatorSubscription(creatorId)`, `useMySubscriptions`, `useCoinTopup`.
- **Files changed** (approx): `src/pages/Wallet.tsx`, `src/pages/Monetization.tsx`, `src/pages/Profile.tsx`, `src/components/wallet/CreatorEarnings.tsx`, `src/components/social/PostCard.tsx`, `src/pages/LiveViewer.tsx`. New: `src/components/wallet/BuyCoinsSheet.tsx`, `src/components/wallet/TransactionsList.tsx`, `src/components/wallet/PayoutHistory.tsx`, `src/components/creator/SubscribeSheet.tsx`, `src/components/creator/SubscribeButton.tsx`, `src/pages/admin-os/…` (subscription settings row inside CreatorHub — reuse existing shell).
- Design stays on existing Aurelix tokens (dark bg, violet primary, GlassCard, AuraAvatar). No new colors.

### Acceptance

- Wallet shows real coin balance and a real transactions feed for a test user with tips/unlocks/gifts.
- Buy Coins flow completes end-to-end via UTR verification and updates `profiles.coin_balance`.
- On a creator's profile with subscriptions enabled, a fan can subscribe with coins, appears in `subscriptions`, gains access to subscriber-only lives and paid posts, sees "Subscribed" pill.
- Monetization page no longer shows fake `$0.00`.
- LiveViewer "top up" links to the working Buy Coins sheet.
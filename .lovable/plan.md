# Next Features Plan

Two phases. Phase 1 closes the open UI work. Phase 2 is the big creator-monetization push you picked.

## Phase 1 — Finish the leftover UI (from `.lovable/plan.md`)

Backend tables already exist; this is wiring only.

1. **Story stickers**
   - `StoryCompose`: "Stickers" sheet → Poll (Q + 2–4 options) and Q&A (prompt). Draggable chip on canvas, position normalized 0–1. Insert into `story_stickers` after story insert.
   - `StoryViewer`: render stickers at saved positions. Poll = tap option → upsert `story_sticker_responses`, live % bars via realtime. Q&A = text input → insert response. Author sees an "Insights" tab listing all responders.

2. **Collaborative posts**
   - `PostCard`: stacked avatars + "@author with @user1 and @user2" header from `post_collaborators` (status=accepted).
   - Profile grid: include posts where I'm an accepted collaborator.
   - Inline accept/decline in `Notifications` for `collab_invite` rows.

3. **Notifications renderer**
   - Handle `collab_invite` and `collab_accepted` types.
   - Migration: `ALTER PUBLICATION supabase_realtime ADD TABLE public.story_sticker_responses;`

## Phase 2 — Creator monetization

Goal: give creators 3 distinct ways to earn, plus a clean wallet/payout UX. All payments via the existing Stripe Embedded Checkout setup. Platform takes a configurable cut (default 15%).

### 2A. Creator Tips ("Send Aura")
- Any viewer can tip a creator from a profile or post (pay-what-you-want, min ₹49).
- New table `tips` (sender_id, recipient_id, post_id?, amount_cents, currency, platform_fee_cents, net_cents, stripe_session_id, status, environment).
- New edge function `create-tip-checkout` using `price_data` (donation pattern). On webhook `checkout.session.completed`, insert `tips` row + credit recipient's `creator_balance`.
- UI: "Send tip" button on `PostCard` and `Profile`. Tip sheet with preset amounts (₹49 / ₹199 / ₹499 / custom). Toast + notification (`tip_received`) to recipient.

### 2B. Paid DMs (DM unlock fee)
- Creator sets a "DM price" in `EditProfile` (₹0 = free, default). Stored on `profiles.dm_price_cents`.
- When a non-follower tries to open a new conversation with that creator, show a paywall: "Unlock DM for ₹X".
- One-time checkout → on success, insert row into new `dm_unlocks` table (sender_id, recipient_id, paid_at). `Conversation` and `Messages` check this table before allowing send.

### 2C. Paywalled posts ("Premium content")
- Compose toggle: "Make this post paid" → sets `posts.price_cents`, `posts.is_paid=true`.
- `PostCard` for paid posts: blurred media + "Unlock for ₹X" CTA unless viewer is author or has unlocked.
- New table `post_unlocks` (user_id, post_id, paid_at, amount_cents). Checkout flow mirrors tips.
- Feed/explore: still show the post; gate just the media + full caption.

### 2D. Creator Wallet & Payouts
- `creator_balance` table: user_id, available_cents, pending_cents, lifetime_earned_cents, currency, environment.
- Extend `Wallet.tsx`: show real earnings, breakdown by source (tips / DM unlocks / paid posts), recent transactions, "Withdraw" CTA.
- `payout_requests` table: user_id, amount_cents, status (pending/paid/rejected), method (upi/bank), payout_detail (jsonb), created_at, processed_at.
- Withdraw flow: minimum ₹500, collects UPI ID / bank, deducts from `available_cents` to `pending_cents`. Admin processes manually for v1 (no Stripe Connect yet — keeps scope tight).
- Admin page `PayoutsAdmin` to mark requests paid/rejected.

### 2E. Notifications + Analytics
- New notification types: `tip_received`, `dm_unlocked`, `post_purchased`, `payout_paid`.
- Extend `Analytics`: earnings line chart, top earning posts, tip leaderboard among your followers.

## Technical details

- All money in integer cents; store `currency` and `environment` on every payment row.
- Webhook handler (`payments-webhook`) extended with a `metadata.purpose` switch: `tip` | `dm_unlock` | `post_unlock`. Each branch writes its domain table and increments `creator_balance.available_cents` by `net_cents` atomically (RPC).
- Platform fee = `floor(amount * 0.15)`; configurable via `app_config` table.
- RLS: tips/unlocks readable by sender + recipient + admin. `creator_balance` readable by owner only. `payout_requests` insert/select by owner, update by admin (`has_role`).
- Reuse existing `useStripeCheckout` hook; add `purpose` and `recipientId` to checkout body.
- Reuse `PaymentTestModeBanner` on all new checkout screens.
- No new third-party deps.

## Build order

1. Phase 1 wiring (small, low risk).
2. Schema migration: `tips`, `dm_unlocks`, `post_unlocks`, `creator_balance`, `payout_requests`, `app_config`, plus `profiles.dm_price_cents` and `posts.price_cents` / `is_paid`.
3. Webhook extension + balance RPC.
4. Stripe products: register tip / DM / post-unlock as dynamic `price_data` (no fixed products needed).
5. Tips → DM paywall → Paywalled posts (parallel-able UI).
6. Wallet UI + payout request flow.
7. Admin payouts screen.
8. Notifications + analytics polish.

## Out of scope (call out for later)

- Stripe Connect / automatic payouts (manual admin payouts for v1).
- Subscriptions to individual creators (separate from existing platform Premium/Pro).
- Live streaming, gifts during streams, NFT-style collectibles.

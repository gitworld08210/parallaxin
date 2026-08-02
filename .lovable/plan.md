# Aurelix Wallet OS — Build Plan

The current `/wallet` page is a simple coin balance + transaction list. Wallet OS turns it into the financial identity layer: a premium wallet card, passport, bucketed balances, double-entry ledger, QR, security, and a Finance/Founder admin console.

We reuse what already exists — auth, RBAC/RLS, audit logs, notifications, AI Gateway, `coin_transactions`, `tips`, `live_gifts`, `payout_requests`, `coin_topup_requests`, `profiles_private.coin_balance`. No duplicate services.

## Phase 1 — Wallet core (foundation)

Database:

- `wallets` — internal `id` (never exposed), public `wallet_id` (AUX-XXXX-XXXX-XXXX), `handle` (@adit.wallet), this is user id  (active/pending/restricted/suspended/frozen/closed), version, created_at, security score, trust score.
- `wallet_balances` — one row per wallet with separate buckets: purchased, reward, gift, ads, bonus, locked, pending, withdrawable. Never mixed.
- `wallet_ledger` — append-only double-entry rows: txn_id, wallet, direction, bucket, amount, fee, balance_after, source (gift/ads/marketplace/subscription/purchase/withdrawal/reward/refund), status, metadata.
- `wallet_status_history`, `wallet_notes` (internal), `wallet_risk_alerts`.
- Server-side RPCs only for movement: `wallet_credit`, `wallet_debit`, `wallet_transfer` — atomic, no negative balances, all writes append to ledger and audit log. Clients can never write balances directly (RLS: select-own only).
- Backfill: create a wallet for every existing profile, seed buckets from `profiles_private.coin_balance`, import history from existing coin/tip/gift/payout tables.

## Phase 2 — Wallet home (premium UI)

- Deep black / graphite / glass design tokens with electric blue accent, added to the design system (dark stays dark; light mode uses existing liquid glass).
- 3D flip Wallet Card: front (brand, verified badge, wallet ID, handle, Aura balance, ₹ equivalent) → tap → back (permanent QR, created date, status, security status, version).
- Balance strip: Available / Pending / Locked / Reward / Withdrawable.
- Quick Actions grid with premium motion: Buy Aura, Gift Aura, Withdraw, Scan QR, Request Coins, History, Rewards, More.
- Bottom wallet nav: Home · Analytics · Transactions · Profile.

## Phase 3 — Passport, Coin Breakdown, Analytics

- Wallet Passport screen: wallet age, creator since, verification, creator level, premium, trust score, total earned/spent/withdrawn, gifts in/out, ads / marketplace / subscription earnings, lifetime activity.
- Coin Breakdown screen: each bucket listed separately with totals.
- Analytics: daily/weekly/monthly/yearly/lifetime charts (income, expense, net) + a source donut (creator revenue, gifts, ads, subscriptions, others), served by a reporting RPC, not client aggregation.

## Phase 4 — Transactions, Gift, Withdraw, QR

- Transaction timeline: txn ID, type, amount, fee, status, date/time, balance after; filters (all/purchase/gift/reward/withdrawal/marketplace/subscription/refund), search, date range, CSV export.
- Gift flow: search creator → wallet preview → amount + fee breakdown → gift animation → success with txn ID.
- Withdrawal flow: request → status timeline (Submitted → Finance Review → Verification → Approved → Transferred) with estimated time, reference number, assigned finance officer, receipt download.
- QR: one permanent QR per wallet, share/download, scan handler for receive / gift / pay / request / tips.
- Premium empty states for every list.

## Phase 5 — Security & Notifications

- Wallet Shield screen: security score, biometric/passkey/2FA toggles (wired to existing security screens), trusted devices, recent logins, emergency freeze, recovery options.
- Wallet notification center fed by the existing notification system: coins credited/debited, gift received, withdrawal approved, finance review, security alerts, rewards, marketplace purchases.

## Phase 6 — Admin Wallet OS (Finance / Founder / Support)

- `/admin-os/wallet` search by wallet ID, handle, username, email, phone, creator ID.
- Wallet profile: summary, balances, transactions, withdrawals, rewards, gifts, marketplace, ads earnings, trust score, risk level, devices, audit logs, KYC status, fraud flags, support history.
- Actions gated to Finance Department (Support gets read-only): freeze, unfreeze, manual credit, manual debit, reverse transaction, approve/reject withdrawal, adjust balance, internal notes. Every action requires a reason and writes an immutable audit log. No financial approval bypasses Finance.
- Treasury dashboard for Founder Office: minted, burned, circulation, treasury balance, company revenue, pending liability, creator liability, financial health.

## Phase 7 — AI Risk Engine

- Edge function on the existing AI Gateway scoring wallets for gift farming, bot activity, multi-account, rapid withdrawals, suspicious transfers, reward abuse.
- Output is advisory only: Normal / Medium / High / Critical alerts into `wallet_risk_alerts` for manual Finance review. Never auto-blocks.

## Technical notes

- Money movement is server-side only (Postgres functions + edge functions); the client never sends balances.
- Ledger is append-only; corrections are reversing entries, never updates.
- Internal wallet UUID stays server-side; only `wallet_id`/handle are ever rendered.
- Existing `/wallet` code stays reachable until Phase 4 lands, then routes are cut over.

## Suggested order

I'll start with Phase 1 + 2 in this turn (schema, RPCs, backfill, and the new wallet home with card flip and quick actions), then continue phase by phase.
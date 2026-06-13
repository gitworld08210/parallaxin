# Creator Mode Opt-In

Right now every account sees Creator Hub, Monetization, Analytics, Compose, Reels Compose, Tips, Payouts, etc. We'll split accounts into **Users** (consumers) and **Creators** (uploaders/earners). A user must explicitly upgrade to a creator before they can publish content or earn.

## Concept

- All accounts start as **User**: can browse, like, comment, follow, save, DM, tip others, buy coins.
- A user becomes a **Creator** by tapping **"Become a Creator"** in the profile side menu, reading the Creator Agreement, and accepting the **85% creator / 15% platform** revenue split + payout/KYC terms.
- Creators get: Compose, Reel Compose, Story Compose, Creator Hub, Analytics, Monetization, Wallet → Earnings tab, Payout requests, Tip-receive, Authenticity score, Ownership certificates.
- Users who try to access creator-only screens see a friendly upsell card → "Become a Creator".

## Data changes (1 migration)

`profiles` table — add:
- `is_creator boolean not null default false`
- `creator_since timestamptz`
- `creator_terms_version text` (e.g. `'2026-06-13'`)
- `creator_terms_accepted_at timestamptz`

`app_config` — add row `creator_revenue_split = {"creator": 85, "platform": 15}` and `creator_terms_version = "2026-06-13"` so the split & version are server-controlled.

RPC `become_creator(_terms_version text)` (SECURITY DEFINER): flips `is_creator=true`, stamps `creator_since`, records accepted version + timestamp for the calling `auth.uid()`.

RLS update on `posts`: `INSERT` policy requires `is_creator = true` on the author's profile (in addition to current auth check). Same for `tips` recipient must be creator. Compose UI already blocks, but DB enforces it too.

## Frontend changes

**New files**
- `src/hooks/useIsCreator.ts` — reads `profiles.is_creator` for the current user, exposes `{ isCreator, loading, refresh }`.
- `src/components/creator/BecomeCreatorSheet.tsx` — bottom sheet with:
  - What you unlock (compose, monetization, tips, payouts)
  - **Revenue split**: 85% you / 15% platform, rendered from `app_config`
  - Scrollable Creator Agreement (payout eligibility, KYC, content ownership, takedown, tax responsibility, no refunds on tips, age 18+ for monetization)
  - Required checkbox: "I agree to the Creator Agreement and 85/15 revenue split"
  - Confirm button → calls `become_creator` RPC → toast + refresh.
- `src/components/creator/CreatorGate.tsx` — wrapper used by creator-only routes. If `!isCreator`, render an upsell card with a CTA that opens `BecomeCreatorSheet`. Otherwise render `children`.
- `src/pages/CreatorTerms.tsx` (`/creator/terms`) — full legal page version of the agreement, linked from the sheet and from Settings.

**Edited files**
- `src/components/layout/SideMenu.tsx` — add "Become a Creator" entry (only when `!isCreator`); show a small "Creator" chip next to the user when they are one.
- `src/components/layout/AppShell.tsx` — bottom-nav Compose (+) button: if not creator, intercept and open `BecomeCreatorSheet` instead of navigating to `/compose`.
- `src/App.tsx` — wrap creator-only routes with `<CreatorGate>`: `/compose`, `/reel/compose`, `/story/compose`, `/drafts`, `/creator-hub`, `/analytics`, `/monetization`, `/post/:id/insights`.
- `src/pages/Wallet.tsx` — only show the **Earnings / Payouts** section for creators; users see "Become a creator to earn" card. Coins/spending stays for everyone.
- `src/pages/Profile.tsx` — on own profile, show a subtle "Become a Creator" button above Edit Profile when `!isCreator`; hide creator-only tabs/CTAs otherwise.
- `src/components/social/TipSheet.tsx` — already targets a recipient; no change to UX, but the DB policy will reject tips to non-creators (defensive only; tip buttons already only appear on posts which require creator).
- `src/pages/Settings.tsx` — add "Creator Agreement" link → `/creator/terms`, plus current accepted version display for creators.

## Revenue split — single source of truth

Read split from `app_config.creator_revenue_split` in:
- `BecomeCreatorSheet` display
- `CreatorTerms` page
- Edge function that computes `net_cents` for tips/unlocks (already centralized — verify it uses 85/15; if hardcoded elsewhere, update to read from `app_config`).

## Out of scope (call out, don't build)

- Downgrading creator → user (needs payout reconciliation flow).
- Editing the Creator Agreement copy after launch (versioning column is in place; re-acceptance flow can be added later).
- Razorpay wiring (still deferred per earlier decision).

## Acceptance checks

- Brand-new account: side menu shows "Become a Creator"; tapping (+) opens the sheet; `/compose` redirected to upsell; Wallet hides Earnings.
- After accepting: `profiles.is_creator=true`, `creator_terms_accepted_at` set; Compose opens; Creator Hub/Analytics/Monetization render; Earnings tab visible.
- DB-level: attempting to insert a `posts` row for a non-creator user fails RLS.

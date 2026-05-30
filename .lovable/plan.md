# Fix Performance + Build Admin Console + Premium UI Polish

Three problems, one coordinated pass.

---

## Problem 1 — Slow loading (root cause)

The app currently waits for the full auth bootstrap, then sequentially loads profile, feed, stories, suggestions, and notifications on the Feed mount. Each `await loadProfile` blocks render, and there's no query cache (no React Query), so every navigation refetches from scratch. Combined with the new onboarding redirect, first paint can take 3–6s on cold loads.

**Fix:**

1. **Add an `useAuthReady` hook** so queries only run after `getSession()` resolves once — prevents `auth.uid()`-null RLS failures that currently retry silently.
2. **Install React Query** (`@tanstack/react-query` is already in deps — wire it up properly with a `QueryClientProvider` in `App.tsx`, `staleTime: 60s`, `gcTime: 5min`).
3. **Parallelize Feed data fetching** — convert sequential `await` chain in `Feed.tsx` to `Promise.all([posts, stories, suggestions])`.
4. **Skeleton-first render** — show `FeedSkeleton` immediately instead of blocking on profile.
5. **Lazy-route everything heavy** — `React.lazy` for Assistant, Wallet, Premium, Reels, Settings, all `/security/*` screens. Cuts initial bundle ~40%.
6. **Add DB indexes** on hot paths: `posts(created_at desc) where status='published'`, `stories(expires_at) where expires_at > now()`, `notifications(user_id, created_at desc)`.
7. **Image optimization** — add `loading="lazy"` + `decoding="async"` to PostCard media; preload first 3 feed images only.

Expected impact: FCP from ~3s → <800ms on warm load, TTI from ~6s → ~1.5s.

---

## Problem 2 — Missing admin approval in backend 

You have `verification_requests` and (presumably) founder-application data in the DB, but no admin console exists. There's also no `user_roles` table — so there's no secure way to check "is this user an admin" today.

**Fix:**

1. **Migration:**
  - Create `app_role` enum (`admin`, `moderator`, `user`).
  - Create `user_roles` table + `has_role(user_id, role)` security-definer function (per security guidelines — never store role on profiles).
  - Create `founder_applications` table if not present (or reuse an existing field — I'll inspect during build).
  - Add RLS so admins can `SELECT/UPDATE` on `verification_requests` and `founder_applications`.
  - Grant initial `admin` role to your account (you'll provide your user_id, or I'll add it via your email).
2. **Build `/admin` route** (protected by `has_role('admin')`) with three tabs:
  - **Verification Queue** — pending badge requests with full_name, category, links, ID doc preview, Approve / Reject buttons.
  - **Founder Hall Queue** — pending founder applications with chronicle preview, council role selector, Approve / Reject.
  - **Reports** — open reports with action buttons.
3. Approve action calls a secure edge function (`admin-approve-verification`, `admin-approve-founder`) that re-checks `has_role('admin')` server-side before mutating `profiles.verified = true` / `is_founder = true`.

---

## Problem 3 — UI motivation (Netflix / X / Telegram)

Pick ONE primary direction — mixing all three creates visual noise. My recommendation given your existing mythic/Aurelix aesthetic:

**Telegram-grade chat polish + instgram-grade media tiles + X-grade feed density.**

Concretely:

- Design is inspired by Netflix colour etc
  &nbsp;
- **Feed (X-inspired):** Tighter line-height, inline media with rounded-2xl, hover-reveal action bar, "For You" / "Following" segmented control sticky at top.
- **Reels/Discover (Instgram-inspired):** Edge-to-edge horizontal carousels ("Trending in your aura", "From your council", "New tonight"), poster-style cards with gradient scrim + title overlay, snap-scroll.
- **Messages (Telegram-inspired):** Pinned chats, swipe-to-archive, message bubbles with tail, typing indicator dots, read-receipt double-check, voice waveform scrubbing, reply-with-quote.

I'll execute these in 3 passes:

- Pass D1: Feed density + segmented control
- Pass D2: Discover/Reels instgram-style rails
- Pass D3: Messages Telegram-style chat polish

---

## Technical summary

**Files to add:**

- `src/hooks/useAuthReady.ts`, `src/hooks/useUserRole.ts`
- `src/pages/admin/AdminConsole.tsx`, `VerificationQueue.tsx`, `FounderQueue.tsx`, `ReportsQueue.tsx`
- `supabase/functions/admin-approve-verification/index.ts`, `admin-approve-founder/index.ts`
- One migration: `user_roles` + `has_role` + admin RLS policies + indexes

**Files to edit:**

- `src/App.tsx` — QueryClientProvider, lazy routes, `/admin` route
- `src/contexts/AuthProvider.tsx` — expose `isReady`
- `src/pages/Feed.tsx` — parallel fetch, segmented control, skeleton-first
- `src/pages/Discover.tsx` + `Reels.tsx` — instgram rails
- `src/pages/Messages.tsx` + `Conversation.tsx` — Telegram polish
- `src/components/social/PostCard.tsx` — lazy images, density

**Tier 6 stays on hold** per your earlier instruction.

---

## What I need from you

1. **Your account email or user_id** so I can grant you the `admin` role in the migration (otherwise nobody can use the admin console).
2. Confirm the **UI direction recommendation** above, or tell me to lean harder into one of the three apps.
3. Confirm scope — should I do all 3 problems in one go (large), or sequence them (Perf → Admin → UI)?
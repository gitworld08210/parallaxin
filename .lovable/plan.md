#   Balanced Upgrade — Feed/Reels + Creator Studio

**Vibe:** Midnight Indigo (`#0a0a1a` → `#141432` → `#1e1e5a` → `#4f46e5` accent). Deep dark, premium, Instagram-meets-Linear feel.

---

## Part 1 — Design tokens refresh

- `src/index.css` + `tailwind.config.ts`: shift dark theme surfaces to Midnight Indigo scale, `--primary` → indigo `#4f46e5`, add `--surface-1/2/3` for layered cards, subtle indigo glow shadow token.
- Bottom-nav gradient (Create button) → indigo→violet instead of pink.
- Keep existing semantic token names — only values change, so no component rewrites.

## Part 2 — Feed & Reels polish (user side)

**Feed (`Feed.tsx`, `PostCard.tsx`, `StoriesRail.tsx`)**

- Real skeleton shimmer (replace spinner) via `FeedSkeleton`.
- Double-tap heart: bigger burst + haptic (`navigator.vibrate(15)`).
- Sticky, blur top bar with logo + inbox + notification bell (currently scattered).
- Post card: rounded-2xl, indigo ring on unseen, tighter meta row, animated like counter (count-up).
- Story ring: gradient upgraded to indigo→violet→fuchsia; seen state = muted ring.
- Pull-to-refresh (touch drag on top).

**Reels (`Reels.tsx`)**

- Preload next 2 videos (hidden `<video preload="auto">`) — smoother swipe.
- Right-rail actions: icons enlarged to 44pt, count below, tap ripple.
- Progress bar on top (thin indigo), auto-hide UI after 2s idle, tap to toggle.
- "For You / Following" pill switcher at top.
- Caption expand/collapse, mention/hashtag chips clickable.

## Part 3 — Creator Studio hub (creator side)

New route `/creator/studio` (replaces scattered CreatorHub bits) — one dashboard.

**Layout:** sticky header + tab strip (Overview · Content · Audience · Earnings · AI Coach).

- **Overview:** hero stats cards (followers, views 7d, earnings 30d, engagement %). Sparkline charts (Recharts). "Top post this week" preview.
- **Content:** grid of user's posts/reels with per-item mini-metrics; tap → existing `PostInsights`.
- **Audience:** follower growth line chart, top locations, active hours heatmap.
- **Earnings:** coin balance, subscriber count, live gift total, payout button → existing wallet flow.
- **AI Coach (Gemini):** "Analyze my last 10 posts" → Gemini returns 3 actionable tips + best posting time. Reuses `ai-creator-insights` pattern (new small edge fn `ai-creator-coach`).

**Entry points:** `Profile.tsx` (if `isCreator`) shows "Creator Studio" button; side menu link; CreatorHub redirects here.

## Part 4 — Small gap fixes

- `Discover.tsx` empty state polish (only if time).
- Loading toasts standardized (indigo accent).
- Bottom-nav Create button color = indigo gradient (matches new theme).

---

## Technical notes

- **Files to create:** `src/pages/CreatorStudio.tsx`, `src/hooks/useCreatorStats.ts`, `supabase/functions/ai-creator-coach/index.ts`, `src/components/creator/StudioTabs.tsx`, `src/components/feed/PullToRefresh.tsx`.
- **Files to edit:** `src/index.css`, `tailwind.config.ts`, `src/components/layout/AppShell.tsx`, `src/pages/Feed.tsx`, `src/pages/Reels.tsx`, `src/components/social/PostCard.tsx`, `src/components/social/StoriesRail.tsx`, `src/pages/Profile.tsx`, `src/App.tsx` (new route).
- **Backend:** 1 new edge fn (`ai-creator-coach`) using shared `gemini.ts` helper. No new tables — reads existing posts/reels/analytics.
- **Charts:** Recharts (already installed).
- **UI/UX skill:** apply pre-delivery checklist (44pt touch targets, safe-area, dark-mode contrast ≥4.5:1, reduced-motion respected).
- **Rollout:** tokens → Feed polish → Reels polish → Creator Studio → verify on 375px preview.

Approve karo to build mode me shift ho ke sab implement karta hun.

&nbsp;

 Ek aur baat use lovable gemini because my gemini is not working 
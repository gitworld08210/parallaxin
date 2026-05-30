## UI Polish Pass — Tier "Refinement"

Three sequential sub-passes. Each is independently shippable. Tier 6 (monetization) stays on hold until all three are done.

---

### Pass A — Core Surface Refinement (Feed, Profile, PostCard, Assistant)

**Goal:** Make the three highest-traffic screens feel Awwwards-grade.

1. **PostCard.tsx**
   - Tighten vertical rhythm (header 56px, action row 44px, consistent 12px gutters).
   - Replace current like/comment/share icons with a unified stroke set (1.75px, rounded).
   - Add subtle press-state scale (0.96) + haptic-style opacity dip on tap.
   - Double-tap to like with a centered heart burst (spring, 280ms, no lingering overlay).
   - Caption: 2-line clamp with "more" inline, not as a separate button.
   - Aura ring around avatar: only render when user actually has an aura set (currently always-on looks noisy).

2. **Feed.tsx**
   - Sticky top bar collapse on scroll-down, expand on scroll-up (IG behavior).
   - Stories rail: 64px avatars, 8px gap, true-circle gradient ring only for unseen.
   - Pull-to-refresh with a custom aurum-tinted spinner.
   - Skeleton loaders that match real PostCard dimensions (no layout shift on load).

3. **Profile.tsx**
   - Header: condensed hero (avatar 88px, name + handle inline, stats row directly under).
   - Tab strip (Posts / Reels / Tagged / Chronicle) with animated underline, not background fills.
   - 3-col grid with 2px gutters (IG-exact).
   - Founder badge: move to a single corner chip, not duplicated in three places.

4. **Assistant.tsx**
   - Upgrade model to `openai/gpt-5.5-pro` in `ai-assistant` edge function (already there — verify and unify other AI functions to use 5.5-pro for user-facing reasoning, keep `gemini-3-flash-preview` for moderation/captions where speed matters).
   - Message bubbles: assistant left-aligned with subtle border instead of filled card; user right-aligned with primary tint.
   - Streaming cursor blink while tokens arrive.
   - Quick-action chips above input ("Rewrite my bio", "Caption ideas", "Hashtag strategy").

**Files touched:** `src/components/social/PostCard.tsx`, `src/pages/Feed.tsx`, `src/pages/Profile.tsx`, `src/pages/Assistant.tsx`, `supabase/functions/ai-assistant/index.ts`, plus 1–2 new shared components (`DoubleTapHeart`, `CollapsibleTopBar`).

---

### Pass B — Empty States, Loading, Onboarding

**Goal:** No blank screens. No janky loads. First-run feels mythic.

1. **Empty state component library** (`src/components/empty/EmptyState.tsx`)
   - Single reusable component: icon/illustration + title + subtitle + optional CTA.
   - Variants for: empty feed, no notifications, no messages, no followers, no saved, no search results, blocked list empty, no login activity.

2. **Skeleton loaders** for: Feed, Profile, Conversation, Notifications, Discover, Reels, Wallet, Settings sub-screens.

3. **Onboarding flow** (`src/pages/Onboarding.tsx`, 4 steps)
   - Step 1: "Choose your signature aura" (reuse SignatureAuraPicker).
   - Step 2: "Pick 5 interests" (chip grid, drives Discover ranking).
   - Step 3: "Follow 3 founders" (curated Hall of Founders preview).
   - Step 4: "Enable notifications" (browser push prompt).
   - Triggered once after signup; skippable but stored in `profiles.onboarded_at`.

**Files touched:** ~10 new files, 1 migration (`profiles.onboarded_at`, `profiles.interests`).

---

### Pass C — Motion & Typography System

**Goal:** Establish the design language so future tiers inherit it for free.

1. **Typography scale** in `index.css`
   - Add display font (Fraunces or Instrument Serif) for hero moments — h1, founder names, Chronicle headers.
   - Body stays Inter, but introduce explicit scale: `text-display`, `text-title`, `text-body`, `text-caption`, `text-micro` as utility classes.

2. **Motion primitives** (`src/lib/motion.ts`)
   - Centralized framer-motion variants: `fadeUp`, `scaleIn`, `slideInRight`, `staggerChildren`.
   - Standard easings (`easeOutExpo`, `easeInOutQuart`) and durations (fast 180ms, base 280ms, slow 480ms).
   - Reduced-motion respect via `useReducedMotion`.

3. **Page transitions**
   - Subtle fade+lift between routes (12px y, 220ms).
   - Bottom-sheet routes (Compose, Comment, Share) slide up with spring.

4. **Micro-interactions audit**
   - Every primary button: press scale + hover lift.
   - Every tab switch: animated underline.
   - Every modal/sheet: backdrop blur fade-in.

**Files touched:** `src/index.css`, `tailwind.config.ts`, new `src/lib/motion.ts`, `src/App.tsx` (route wrapper), and light touches across most pages.

---

### Technical Details

- **Model strategy:** `openai/gpt-5.5-pro` for Assistant + future AI Tier 7 features (reasoning, ghostwriting). Keep `google/gemini-3-flash-preview` for moderation, alt-text, caption suggestions (speed > nuance). Keep `gemini-3.5-flash` as a fallback if 5.5-pro hits 429s.
- **No new tables** in Pass A or C. One migration in Pass B (onboarding fields).
- **No breaking API changes.** All existing routes/components remain functional during refactor.
- **Bundle impact:** ~+8kb for framer-motion variants and display font subset.

### Order of execution
Pass A first (biggest visible win) → Pass B → Pass C.
I'll deliver Pass A in one go, then check in before B.

# Aurelix Profile Suite — Scaffold with Zero Values

Goal: build all screens from your reference mock as **visual shells with 0 / empty values**. No fake data like "$12,450" or "52.3K". Once shells look right, we wire real data in a follow-up.

I'm coding this with code with **openai (**gpt5.5)— that's the model running this Lovable session.

## Phase 1 — Side Menu polish

Update `SideMenu.tsx`:

- Aurelix wordmark + logo mark at top
- Rows: Home, Explore, Reels, Messages, Notifications, Bookmarks, Communities, Creator Hub, Monetization, Verification Center (NEW pill), Aura Wallet, Saved, Settings, Help & Support, Dark Mode toggle
- Counter pills show `0` (not 8/12)
- AURELIX PREMIUM CTA card at bottom
- All new rows route to real pages (built in later phases) — no more "coming soon" toasts

## Phase 2 — New routes (all zero-state shells)

Each new page: header with back arrow, neon-themed layout matching mock, **all numbers = 0, all lists empty with subtle empty-state copy**.

1. `/creator-hub` — Welcome card ("Welcome back, {name}"), Total Earnings `$0.00` + flat sparkline, 3 KPI tiles (Profile Views / Content Reach / Engagement all `0`), Quick Access grid (Analytics, Monetization, Achievements, Verification, Aura Level, Creator Tools)
2. `/analytics` — Tabs (Overview/Content/Audience/Earnings), Views `0`, empty recharts line, 4 KPI tiles at `0`, "No content yet" empty state for Top Performing Content
3. `/achievements` — Locked badge list (Top Creator, Viral Creator, Trendsetter, Hall of Founders, Early Adopter, Community Builder), Progress `0 / 24`
4. `/aura-level` — Circular ring at 0%, Level `0`, `0 / 1,000 XP`, Aura Benefits list (all locked)
5. `/monetization` — Total Balance `$0.00`, Earnings Overview `$0.00` + flat chart, Revenue Sources rows all `$0`, Withdraw Earnings CTA (disabled)
6. `/verification-center` — Hero shield, "Get Verified on Aurelix", Request Verification CTA (links to existing `/verification`), status checklist (Not Verified / Eligible / Benefits)

## Phase 3 — Polish existing screens to match mock

- `Profile.tsx` — AURELIX wordmark header style, neon avatar ring, stat row uses real DB values (already wired)
- `Notifications.tsx` — tab pills (All/Mentions/Comments/Likes), shows real data (already wired)
- `Settings.tsx` — row layout matching mock
- `EditProfile.tsx` — layout matching mock (already largely there)

## Technical notes

- All shells use existing semantic tokens from `index.css` (no new colors)
- Charts use `recharts` with empty/zero data arrays
- Badges/icons: lucide-react + simple SVG, no new deps
- New routes registered in `App.tsx`
- Zero backend changes — pure frontend scaffolding
- After you approve the look, we discuss per-screen: what data source, what calculations, what becomes interactive

Reply **"go"** to start, or tell me which phase to do first.
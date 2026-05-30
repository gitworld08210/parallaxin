## Goal

You skipped the questions, so I'll start with the most visible bug from your session and do a targeted sweep of the user-facing app. The session replay shows you opened `/founders` and got a 404 — that route doesn't exist. From there I'll audit the other obvious failure points.

## What I'll fix

### 1. `/founders` 404 (confirmed bug)

`src/App.tsx` defines `/hall-of-founders`, `/founder-council`, and `/founders/:username` — but **not** `/founders`. Anyone typing `/founders` (or following an old link) lands on NotFound.

Fix: add a redirect `/founders` → `/hall-of-founders` inside the `ProtectedRoute` group in `src/App.tsx`.

### 2. Audit and fix dead links in the main app

I'll grep every `<Link to=...>`, `navigate(...)`, and `href="/..."` in `src/` and cross-check against the routes registered in `App.tsx`. Anything pointing at a non-existent route gets either:
- pointed at the correct route, or
- a new route + redirect added.

Likely suspects to check (based on file layout): `/founders`, `/founders/:username` from menus, profile links, notifications.

### 3. Sanity-check the four common breakage areas

Quick pass with browser + console + DB to confirm these still work end-to-end. Fix anything broken I find; otherwise leave alone.

- **Feed** — `/` loads, posts render, like/comment/save buttons work.
- **Compose** — `/compose` publishes a post; image upload to `post-media` bucket succeeds.
- **Profile** — `/profile/:username` opens, edit profile saves, verification request submits.
- **Messages / notifications** — `/messages` opens a conversation, `/notifications` lists recent items.

For each one I find broken, I'll add the specific fix to this plan before touching code (or just fix if it's a one-liner like a wrong path).

## Out of scope for this pass

- New features (audit log, ban users, analytics, etc.)
- Visual polish / redesign
- Admin panel changes (already working per last session)

## Files likely to change

- `src/App.tsx` — add `/founders` redirect, any other missing routes found in the audit.
- `src/components/layout/SideMenu.tsx` and other nav components — fix any wrong `to=` paths.
- Specific page files only if the audit surfaces a real runtime bug.

## What I need from you after approval

Once you hit Implement, I'll do the audit and fix what's broken. If you actually have a *specific* page or action that's frustrating you (posting fails, profile won't save, etc.), drop one line about it and I'll prioritize that first instead of guessing.

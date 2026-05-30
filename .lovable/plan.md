## What's already done

Admin panel is gone. Approvals now happen by toggling booleans directly in the backend tables:

- `verification_requests.approved` → trigger flips `profiles.verified` + sends notification
- `founder_seats.is_active` + `user_id` → trigger inducts/revokes founder + sends notification
- Hall of Founders is a read-only 50-seat archive with perks list

## What still needs work (3 tracks)

### Track 1 — Fix the slow loading (highest priority)

The app feels slow because:

1. **Every route is bundled into the initial JS** — first paint waits for the whole app.
2. `**AuthProvider` blocks the UI** until session + profile both resolve, then `ProtectedRoute` shows a spinner on top of that.
3. `**Feed.tsx` fetches posts → then authors → then likes** in sequence instead of in parallel.
4. **No caching** — leaving Feed and coming back refetches everything.
5. **Notifications, Messages, Profile** all do the same waterfall pattern.

Fix plan:

- Add `React.lazy` + `Suspense` to every route in `App.tsx` so Feed loads first, the rest stream in.
- Split `AuthProvider`: render children as soon as session resolves; profile loads in background. Pages that need profile use a tiny `useProfile()` hook with its own skeleton.
- Install `@tanstack/react-query` (already a Lovable default) and wrap Feed/Notifications/Messages/Profile fetches with it — 60s stale time, instant back-nav.
- Rewrite Feed query to a single Supabase call with embedded `profiles!posts_user_id_fkey(...)` + `likes(user_id)` so it's one round trip instead of three.
- Add `<link rel="preconnect">` to the Supabase URL in `index.html`.
- Memoize `PostCard` and skeleton-first render so the feed shows shimmer immediately.

Expected result: first interactive in ~1s instead of 4–6s, instant tab switches.

### Track 2 — UI polish (Instgram/Netflix / twitter (X)/ Telegram )

Pick one cue per surface so the app feels cinematic without becoming a clone:

- **Feed (X ):** sticky translucent top bar with blur, single-column dense list, swipe-down to refresh with a haptic-style spring. Inline media in rounded 16px tiles, no card chrome.
- **Reels (Instagram cue):** edge-to-edge vertical player, auto-dimmed gradient overlay top + bottom, large title + subtitle bottom-left, right-rail icons fade after 2s of inactivity. "Continue watching" rail on Discover.
- **Messages (Telegram cue):** chat list with avatar + 2-line preview + right-aligned time, unread pill in primary color, swipe-left reveals mute/archive. Conversation bubbles with tail, time inside bubble bottom-right, "typing…" animated dots.
- **Discover (Netflix cue):** horizontal rails of categories — "Trending", "Founders you should follow", "Verified creators", "From your interests" — each rail snap-scrolling.
- **Profile (X cue):** large header image with gradient fade into avatar, tabs (Posts / Replies / Media / Likes) sticky under the bio.
- **Global:** unify spacing scale, replace any generic shadows with the design-system `--shadow-elegant`, ensure Hall of Founders aura frame matches the new accent.

No new pages — just visual rework of existing screens.

### Track 3 — Loose ends from the admin-by-boolean migration

- **Notifications copy** — wire the four new types (`verification_approved/revoked`, `founder_inducted/revoked`) to friendly strings + icons. For `founder_revoked`, show the admin-supplied `revoke_reason` from `founder_seats` if present (AI can also generate a kind one-liner from the reason).
- **Verification request page** — add a small "Status: under review / approved / changes needed" banner so users know where they stand.
- **Seat #1** — reserve for you (admin) and pre-fill it so the Hall isn't empty on day one. Confirm if you want this.
- **Edge case:** if admin assigns a `user_id` to a seat that's already on another seat, block it at the DB level (unique constraint on `user_id` where `is_active = true`).

## Order I'd ship in

1. **Track 1 perf pass** — biggest user-felt win, unblocks everything else.
2. **Track 3 loose ends** — small, closes the admin loop cleanly.
3. **Track 2 UI polish** — surface by surface, Feed → Reels → Messages → Discover → Profile.

## Questions before I start

1. Confirm I should proceed with **Track 1 first** (perf) then Track 3, then Track 2?
2. For Track 2, want me to do **all five surfaces** or pick the top 2 (Feed + Reels) to start?
3. Seat #1 reserved for you as admin — yes or leave all 50 open?
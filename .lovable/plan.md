# Aurelix Polish — Messaging Fix, DM Search, Badges, Premium UI, AI

## 1. Fix "Message" button on Profile
Symptoms: tapping Message on another user's profile does nothing / no DM appears.

Root cause: the handler navigates to `/messages/:id` but on first-tap the second `conversation_participants` insert can race with RLS (`is_conversation_member` returns false for the *other* user before the row exists), and there's no error toast or loading state — failures are silent.

Fix:
- Wrap the flow in a single RPC `start_dm(other_user_id uuid)` (SECURITY DEFINER) that atomically: finds existing 1:1 conversation between the two users, else creates conversation + both participants, returns the conversation id. Eliminates RLS race + 3 round-trips.
- Add loading state on the button + toast on error.
- Confirm `/messages/:id` route is registered (it is — `Conversation.tsx`); verify navigation actually mounts.

## 2. DM search
Add a sticky search bar at the top of `Messages.tsx`:
- Search existing conversations by other participant's `username` / `display_name` (client-side filter).
- Below results: "Start new chat" section — when query is non-empty, query `profiles` by username/display_name (ilike, limit 8) and on tap call `start_dm` then navigate.
- "+" icon top-right opens the same searcher as a sheet (matches mockup screen 13).

## 3. Verification badges — per category
Today there is a single `profiles.verified` boolean. Replace with a category so each badge has its own icon + color (already partially scaffolded in `VerificationBadge.tsx`).

Migration:
- `ALTER TABLE profiles ADD COLUMN verification_kind text` (nullable; values: `verified | creator | gov | brand | founder`).
- `verification_requests.category` already exists → use it as the source of truth on approval.
- Keep `verified` boolean as derived (`verification_kind is not null`) for backwards compat.

UI:
- `VerificationBadge` already maps the 5 kinds. Wire it everywhere a badge is rendered (Profile header, PostCard, CommentSheet, Messages list, Notifications, Followers/Following) using `profile.verification_kind`.
- Distinct visuals per kind:
  - `verified` — blue check (BadgeCheck)
  - `creator` — magenta sparkles
  - `gov` — gold landmark
  - `brand` — amber star
  - `founder` — purple crown
- Verification form (`/verification`) lets the user pick a category; admin still approves manually via SQL (per your earlier choice). Plan doc will be updated with one-line approval SQL setting both `verified=true` and `verification_kind='<category>'`.

## 4. OTP / email verification — DROPPED
Lovable Cloud's default flow is link-based email confirmation, not OTP. Implementing custom OTP requires SMTP + an edge function + rate limiting and would partially duplicate the built-in flow. Per your instruction ("if not working, drop it") — we will **not** add OTP. Keep current email/password + Google sign-in.

## 5. Premium UI redesign (matches Aurelix mockups)
Apply the dark cosmic Aurelix system from your reference image across the app. Keep functionality identical.

Design tokens (index.css):
- Background: deep space `hsl(240 30% 4%)` with subtle radial nebula gradients.
- Primary gradient: violet→magenta→cyan (`#8b5cf6 → #d946ef → #06b6d4`).
- Accent ring/glow for avatars (conic gradient like mockup screen 11).
- Display font: `Space Grotesk` / `Sora`; body: `Inter`.
- Glass: lower opacity, sharper 1px borders, tighter radius (16px not 24px).

Screens touched (visual only, no logic changes):
- **Splash / Auth** — center Aurelix wordmark + ring animation, gradient CTA, "or continue with Google" only (no Apple/IG since unsupported in Cloud).
- **Feed top bar** — left hamburger, center "AURELIX" letterspaced, right notif bell with dot.
- **Stories rail** — circular avatars with conic-gradient ring, "Your Story" first.
- **PostCard** — tighter padding, action row icons match mockup (heart/comment/share/bookmark), caption truncates with "View all N comments" link.
- **Profile** — large circular avatar with neon halo ring, 3-stat row (Posts/Followers/Following) as plain numbers (not glass tiles — cleaner like mockup screen 6), gradient Edit Profile / Follow button, Posts/Reels tabs with underline indicator.
- **Reels** — full-bleed black, right-rail action stack (like/comment/share/save/sound), bottom-left user + caption + audio chip.
- **Messages** — search field at top, Primary / Requests pill tabs, conversation rows with avatar + name + last message + time.
- **Notifications** — grouped Today / This Week, follow rows get a "Follow back" pill.
- **Compose** — Post / Reel toggle pills, cover preview, caption counter, gradient Share.
- **Bottom tab bar** — already close; tighten to match mockup (Home / Search / Plus / Activity / Profile) — note Discover/DMs move: Search replaces Discover icon; DMs move to top-right of Feed (matches Instagram/Aurelix mockup). Keep Reels accessible from Feed top swipe + plus menu.

## 6. AI features (using openai/gpt-5.5-pro via Lovable AI Gateway)
Per the mockup's "AI Assistant" + "AI Enhance" affordances:
- **AI caption** (already exists) — keep, surface as "AI Enhance" button on Compose.
- **AI Assistant page** (`/assistant`) — chat surface using `streamText` + `useChat`, system prompt scoped to "help users grow/create on Aurelix" (suggest captions, hashtag ideas, content critique on uploaded image).
- **Smart Search** on Discover — natural language → SQL-safe filters (e.g. "cyberpunk reels this week") via structured output.
- **Auto-moderation** (already exists) — extend to scan story uploads too.

## 7. Additional features I recommend
- **Story reactions** (tap to send 🔥/❤️ reply) — small `story_reactions` table.
- **Post share-to-DM** — share button opens a DM picker sheet, sends the post link as a message.
- **Block / Mute** — `blocks` table; hide posts + prevent DMs from blocked users.
- **Push-style in-app toaster** on new DMs while not on the conversation route (uses existing realtime).
- **Profile share QR / link** on settings sheet.

I will skip these unless you confirm — call them out below if you want any added now.

## Technical notes
- New migration: add `verification_kind` to profiles, create `start_dm` RPC, optional `story_reactions` / `blocks` if approved.
- All UI changes go through `index.css` + `tailwind.config.ts` tokens; no hardcoded colors in components.
- `Messages.tsx` gets a search input + new-chat sheet; `Profile.tsx` Message handler swapped to RPC call with loading state.
- `VerificationBadge` already supports 5 kinds — just wire `verification_kind` through `AuthProvider` profile type and every render site.

## Files
```
supabase/migrations/<new>.sql      ← verification_kind + start_dm RPC
src/pages/Profile.tsx              ← RPC call, loading state, badge kind
src/pages/Messages.tsx             ← search + new-chat sheet
src/pages/Verification.tsx         ← category picker → category column
src/pages/Assistant.tsx (new)      ← AI chat (gpt-5.5-pro)
src/pages/Discover.tsx             ← AI smart search
src/components/social/PostCard.tsx ← badge kind, layout polish
src/components/social/StoriesRail.tsx ← conic ring polish
src/components/layout/AppShell.tsx ← tab bar refinement
src/components/vibe/TopBar.tsx     ← AURELIX wordmark style
src/index.css + tailwind.config.ts ← Aurelix token system
src/contexts/AuthProvider.tsx      ← include verification_kind
```

## Confirm before I build
1. Add the recommended extras (story reactions, share-to-DM, block/mute, in-app DM toaster)? **yes / no / pick which**
2. Move bottom tabs to Home/Search/+/Activity/Profile (Instagram-style) or keep current Feed/Reels/Discover/DMs/Profile? **A / B**
3. AI Assistant page — build the full chat surface now, or just the "AI Enhance" caption button in Compose? **full / button-only**

---

## Admin: manually approve a verification request

Run this SQL in the Lovable Cloud SQL editor. Replace `<request_id>` and `<kind>` (`verified | creator | gov | brand | founder`):

```sql
WITH r AS (
  UPDATE public.verification_requests
  SET status = 'approved', reviewed_at = now()
  WHERE id = '<request_id>'
  RETURNING user_id, category
)
UPDATE public.profiles p
SET verified = true,
    verification_kind = COALESCE('<kind>', r.category, 'verified')
FROM r
WHERE p.user_id = r.user_id;
```

To reject: `UPDATE public.verification_requests SET status='rejected', reviewed_at=now() WHERE id='<request_id>';`

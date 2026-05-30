## Inspection findings

I audited every feature against the live DB schema, RLS, triggers and storage. Below are the real problems — most pages look fine visually but a few core wiring issues silently break almost every feature.

### 1. CRITICAL — Profile embeds are broken everywhere
All foreign keys on `posts.user_id`, `comments.user_id`, `notifications.actor_id`, `conversation_participants.user_id`, etc. point to **`auth.users`**, not `public.profiles`. But the code uses PostgREST embeds like:

```ts
.select("..., profile:profiles!posts_user_id_fkey(username, display_name, avatar_url, verified)")
```

PostgREST can't resolve that — `posts_user_id_fkey` doesn't reference `profiles`. So `profile` comes back `null` in:
- `Feed.tsx` — every card shows "unknown"
- `Profile.tsx` — own posts list
- `CommentSheet.tsx` — comments show no author
- `Notifications.tsx` — actor name missing
- `Messages.tsx` / `Conversation.tsx` — other participant unknown

**Fix:** Add proper FK from each user-referencing column to `profiles.user_id` (or hint the embed via `profiles!user_id`), then update the select strings to use the named relationship. Cleanest: add a unique constraint on `profiles.user_id` (already unique de-facto) and FK references from `posts`, `comments`, `notifications`, `conversation_participants`, `messages.sender_id`, `follows.{follower_id,following_id}` to `profiles(user_id)`. Then PostgREST resolves `profile:profiles(...)` automatically.

### 2. CRITICAL — Signup does not create a profile row
The function `public.handle_new_user()` exists but has **no trigger** attached on `auth.users`. New signups (email or Google) never get a `profiles` row, which is exactly what the session replay shows: **"Profile not found"** on `/profile`.

**Fix:** Create the trigger:
```sql
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
```
Also backfill: insert a profile for any existing `auth.users` without one.

### 3. Email OTP code may not appear in the email
`Auth.tsx` uses `verifyOtp({ type: "signup", token: otp })`, but Supabase's default "Confirm signup" template only renders `{{ .ConfirmationURL }}`. Users get a magic link, not a 6-digit code, and the OTP screen will time out.

**Fix:** Update the signup email template to include `{{ .Token }}` (and keep the link as fallback). I'll set this via the auth config tool.

### 4. PostCard share link is wrong
`PostCard.tsx` copies `/profile/${username}`, but the route is `/u/:username`. Shared links 404 to the not-found page. **Fix:** use `/u/${handle}`.

### 5. Minor issues
- `Notifications.tsx`: when `n.actor` is null, `to="#"` navigates to `/`. Use a `<div>` instead.
- `Premium.tsx` CTAs are non-functional; leaving as design placeholders unless you want them wired.
- `Verification.tsx` submit only toasts; no row is written (no verification_requests table). Leaving as-is unless you want a real request flow.
- `Wallet.tsx` numbers are derived client-side (XP/Coins/Trust) — by design for now.

## What I'll change

1. Migration:
   - Add FKs from `posts.user_id`, `comments.user_id`, `notifications.actor_id`, `conversation_participants.user_id`, `messages.sender_id`, `follows.follower_id`, `follows.following_id` to `public.profiles(user_id)` (add unique constraint on `profiles.user_id` first if missing).
   - Create `on_auth_user_created` trigger on `auth.users` → `handle_new_user()`.
   - Backfill missing `profiles` rows for existing users.
2. Update embed selects in Feed, Profile, CommentSheet, Notifications, Messages, Conversation to use the new relationship name (`profile:profiles!<new_fk>(...)` or simply `profiles(...)`).
3. Configure auth email template to expose `{{ .Token }}` so the OTP code actually arrives.
4. Fix `PostCard` share URL → `/u/${handle}`.
5. Replace `Link to="#"` with non-link wrapper in `Notifications.tsx` when actor missing.

No UI/visual changes; this is purely fixing broken plumbing.
# Instagram-Parity Upgrade + Reels Fix

Audit of what's missing today: there's no Reels surface, no Stories, no Saves/Bookmarks, no hashtag/explore-by-tag, no post detail view, no tag-people, and the verified-badge flow has no submission/admin path. Compose accepts video but there's no dedicated "Create Reel" entry point, no vertical full-screen player, no Reels feed, and no Reels tab on the profile. We'll close those gaps with a premium minimal UI and keep the existing aesthetic (glass cards, gradient accents, Cinzel/SF stack).

## 1. Reels (priority)

```text
Tab bar:  Feed · Reels · Discover · DMs · Profile
                ▲ new
```

- **`/reels` page** — full-bleed vertical pager (snap-y, one video per viewport, mute toggle, autoplay-on-visible via IntersectionObserver, double-tap-to-like, side rail with like/comment/share/avatar). TikTok/Reels-style.
- **`/compose/reel` page** — dedicated reel uploader: video-only picker, 9:16 preview, trim hint, caption, AI caption button, posts with `media_type='video'` + new `is_reel=true`.
- **FAB** on Reels page → `/compose/reel`. Plus icon on Feed FAB opens a sheet: *Post* or *Reel*.
- **Profile** gets a Reels sub-tab (grid of vertical thumbs) alongside Posts and Tagged.
- DB: add `is_reel boolean default false` to `posts`; backfill existing video posts as reels.

## 2. Stories (lightweight)

- `stories` table (user_id, media_url, media_type, expires_at = now()+24h).
- Horizontal avatar rail at top of Feed; tap → fullscreen story viewer with progress bars, tap-to-advance, swipe-down to close.
- "Your story" first slot opens compose-story sheet (image/video, auto-expires).

## 3. Saves / Bookmarks

- `saves` table (user_id, post_id, created_at).
- Bookmark button in PostCard becomes functional.
- Profile → "Saved" tab (private, RLS scoped to owner).

## 4. Hashtags & Post detail

- Parse `#tag` and `@mention` in post content → linkified.
- `/tag/:tag` page lists posts containing it.
- `/p/:postId` post-detail route (used by share, notifications, comment deep-links). Replaces the broken `/u/:username` share for posts.
- Fix `notifications` deep-links to route to `/p/:postId`.

## 5. Verified-badge request flow (manual approval)

- `verification_requests` table: id, user_id, full_name, category, id_doc_url, links text[], status (`pending|approved|rejected`), created_at, reviewed_at.
- `/verification` page becomes a real form (upload to new `verification-docs` private bucket, RLS: owner can insert/select own).
- On submit: insert row, show "Under review" state, disable resubmit while pending.
- **Approval is manual** — you flip `profiles.verified=true` (and update `verification_requests.status`) directly in the backend table editor. No admin UI built. I'll document this in `.lovable/plan.md`.
- Badge already renders via `profiles.verified` — no UI change needed once flag flips.

## 6. AI moderation/caption upgrade

- Swap `ai-caption` and `ai-moderate` edge functions to `openai/gpt-5.5-pro` via Lovable AI Gateway (AI SDK, `generateText` + structured `Output.object` for moderation: `{flagged, reason, severity}`).
- Add image moderation: when a post has media, pass the URL to gpt-5.5-pro (multimodal) for NSFW/violence check.
- Surface 429/402 gateway errors as toasts.

## 7. UI polish (premium minimal)

- Tighten spacing, reduce gradient noise on cards, switch to mono-weight glass + single accent gradient.
- New iconography pass on bottom nav; add subtle haptic-style spring on tab change (already present, refine timings).
- Reels player uses pure black backdrop, edge-to-edge, captions overlaid with soft gradient mask.
- Story rings use conic-gradient ring around avatar.

---

## Technical changes

**Migration**
- `ALTER TABLE posts ADD COLUMN is_reel boolean NOT NULL DEFAULT false;` + backfill `WHERE media_type='video'`.
- `CREATE TABLE stories`, `saves`, `verification_requests` with GRANTs + RLS.
- New private storage bucket `verification-docs` (owner-only policy via `storage.foldername(name)[1] = auth.uid()::text`).

**Routes added**
- `/reels`, `/compose/reel`, `/compose/story`, `/p/:postId`, `/tag/:tag`.

**Files touched**
- `AppShell.tsx` — add Reels tab (5 → 5, replace Activity with Reels; move bell into Feed TopBar — already there).
- `Feed.tsx` — Stories rail, hashtag linkify.
- `Profile.tsx` — Posts/Reels/Tagged/Saved tab strip.
- `PostCard.tsx` — bookmark wired, share → `/p/:id`, double-tap like.
- New: `pages/Reels.tsx`, `pages/ReelCompose.tsx`, `pages/StoryCompose.tsx`, `pages/PostDetail.tsx`, `pages/Tag.tsx`, `components/social/ReelPlayer.tsx`, `components/social/StoriesRail.tsx`, `components/social/StoryViewer.tsx`.
- Edge functions: rewrite `ai-caption/index.ts`, `ai-moderate/index.ts` using AI SDK + gpt-5.5-pro.

**Manual approval doc** appended to `.lovable/plan.md` with the exact SQL to approve a verification (one UPDATE).

After build: I'll spot-check Reels playback, story expiry, save toggle, and a verification submission in the preview before handing back.

# Tier 2 + Tier 3 implementation plan

Tier 1 already shipped (story reactions, share-to-DM, realtime toasts, block/mute, AI assistant). Now building Tier 2 and Tier 3 from the original roadmap.

## Tier 2 — Creator tools

### 1. Drafts & Scheduled posts
- Migration: add `posts.status` (`draft|scheduled|published`, default `published`) and `posts.scheduled_for timestamptz`.
- Update `posts_select_all` policy → only show `published`; add `posts_select_own_drafts` so owners see their own drafts/scheduled.
- Composer (`CreatePost`/wherever post creation lives): add "Save draft" + "Schedule" options (datetime picker).
- New page `/drafts` listing user's drafts + scheduled posts with edit/publish-now/delete.
- Edge function `publish-scheduled` + `pg_cron` job every minute → flips `scheduled` rows whose `scheduled_for <= now()` to `published`.

### 2. Post insights
- Migration: `post_views` table (`post_id`, `viewer_id nullable`, `created_at`). Index on `post_id`.
- PostCard: fire one insert per post per session via IntersectionObserver.
- New `/post/:id/insights` (owner-only): reach (distinct viewers), impressions (rows), like rate, save rate, comment rate. Simple stat cards + sparkline.
- Add "View insights" entry to PostCard owner menu.

### 3. Collections (saved folders)
- Migration: `collections` (id, user_id, name, cover_url) + `collection_items` (collection_id, post_id, created_at). RLS owner-only.
- Saves UI in Profile → "Saved" tab becomes folder grid + "All saves" default.
- Bookmark long-press / "Save to collection…" sheet to pick or create folder.

### 4. Close Friends
- Migration: `close_friends` (owner_id, friend_id). RLS owner-only.
- Profile → "Edit close friends" screen (toggle following list).
- Story composer: audience toggle `public | close_friends`. Add `stories.audience` column; update `stories_select_all` to hide close-friends stories from non-members.

## Tier 3 — Discovery & social graph

### 5. Explore grid 2.0
- Rework `/discover` (or create it) into a masonry/3-col mosaic of recent + high-engagement public posts, excluding blocks/mutes.
- Personalized "For You" rail at top: edge function `rank-explore` calls `google/gemini-2.5-flash` with the user's recent likes/views to score 30 candidate posts.
- Cache result for 15 min per user in a `explore_cache` table.

### 6. Suggested users
- Edge function `suggest-users`: scores candidates by (mutual follows × 3 + shared-hashtag affinity × 1), excludes already-followed/blocked/muted/self.
- New `SuggestedUsers` rail on Feed (after first 3 posts) and on Profile empty states. Horizontal card list with Follow button.

### 7. Activity status / last seen
- Migration: `profiles.last_seen_at timestamptz`, `profiles.show_activity boolean default true`.
- Heartbeat: tick `last_seen_at = now()` from `AppShell` every 60s while tab visible.
- Green dot in Messages list + Conversation header when `now() - last_seen_at < 2min` AND `show_activity = true`.
- Settings toggle to disable activity broadcasting.

## Files to touch

- New migrations: `posts.status`/`scheduled_for`, `post_views`, `collections`, `collection_items`, `close_friends`, `stories.audience`, `profiles.last_seen_at`, `profiles.show_activity`, `explore_cache`.
- New edge functions: `publish-scheduled` (+ cron), `rank-explore`, `suggest-users`.
- New pages: `src/pages/Drafts.tsx`, `src/pages/PostInsights.tsx`, `src/pages/CloseFriends.tsx`. Reworked `src/pages/Discover.tsx`.
- New components: `SaveToCollectionSheet.tsx`, `SuggestedUsersRail.tsx`, `ScheduleSheet.tsx`, `ActivityDot.tsx`.
- Updates: `PostCard.tsx` (insights menu, view tracker, save-to-collection), `StoryViewer.tsx`/composer (audience), `Profile.tsx` (collections tab, close friends entry), `Feed.tsx` (suggested users rail), `Messages.tsx`/`Conversation.tsx` (activity dot), `AppShell.tsx` (heartbeat).

## Out of scope (saved for Tier 4-5)

- Read receipts, typing, voice notes, 2FA, reports, alt-text AI, story highlights generator.

## Order of execution

1. All migrations in one batch.
2. Edge functions + cron.
3. Tier 2 UI (drafts → insights → collections → close friends).
4. Tier 3 UI (explore → suggested users → activity).
5. QA on mobile viewport (420×765).

# Aurelix — Next Feature Wave

Building on what's already shipped (Reels, Stories, Verification kinds, DMs with search, AI moderation). Below is a prioritized plan of new features grouped by impact. Pick any subset and I'll build.

## Tier 1 — Engagement essentials

1. **Story reactions & replies**
  - `story_reactions` table (emoji), reply → auto-creates DM with story thumbnail quote.
  - Tap-and-hold emoji bar on `StoryViewer`.
2. **Share-to-DM**
  - "Send" button on PostCard/Reel → bottom sheet of recent DMs + search → sends message with post preview card.
  - New `messages.shared_post_id` column rendered as embedded card in `Conversation`.
3. **In-app realtime toaster**
  - Global subscription on `messages` + `notifications` → shadcn `sonner` toast with avatar, tap to open.
4. **Block & Mute**
  - `blocks` (hard hide both ways) + `mutes` (hide from feed only) tables.
  - Filter applied in Feed/Reels/Discover/Comments queries.
  - Profile menu: Block / Mute / Report.

## Tier 2 — Creator tools

5. **Drafts & Scheduled posts**
  - `posts.status` (`draft|scheduled|published`) + `scheduled_for`.
  - Cron edge function (`pg_cron` → `publish-scheduled`) flips status hourly.
6. **Post insights** (for verified/creator)
  - Reach, impressions, profile visits, save rate. Lightweight `post_views` table + aggregated view.
7. **Collections** (saved organization)
  - `collections` + `collection_items`. Profile → Saved → folder grid.
8. **Close Friends list**
  - `close_friends` table. Story compose toggle → audience filter.

## Tier 3 — Discovery & social graph

9. **Explore grid 2.0**
  - AI-ranked mosaic (trending posts/reels) using `openai/gpt-5.5-pro` to cluster hashtags.
  - Personalized "For You" reel feed based on watch dwell-time (`reel_views`).
10. **Suggested users**
  - Mutual-follow + hashtag-affinity scoring. Card carousel on Feed + Discover.
11. **Activity status / Last seen**
  - `profiles.last_seen_at` updated via presence channel; green dot on avatars; per-user privacy toggle.

## Tier 4 — Polish & safety

12. **Read receipts + typing indicators** in DMs (presence channel).
13. **Voice notes** in DMs (audio upload to `chat-media` bucket, waveform UI).
14. **Two-factor auth** (TOTP via Supabase MFA).
15. **Report content** flow → `reports` table → AI triage with `ai-moderate`.
16. **Accessibility**: alt text on uploads (AI-suggested), reduced-motion variants for Reels.

## Tier 5 — AI differentiators (uses `openai/gpt-5.5-pro`)

17. **AI Assistant page** (`/assistant`) — growth coach: rewrite bio, suggest hashtags, analyze last 10 posts.
18. **Smart Search on Discover** — natural language → filter chips ("reels from creators about coffee this week").
19. **Auto-alt-text & auto-caption** at upload time (background edge function).
20. **AI Story Highlights cover generator** (gpt image/ gemini image).
21. Ai chat bot called Aurelix Ai
22. Premium features for future after all above work done we will discuss about , wallet aur coin, xp , aur infinity features 

## Suggested first batch (recommended)

If you say "go", I'll ship **Tier 1 in full** (story reactions, share-to-DM, realtime toaster, block/mute) + **#17 AI Assistant** — these give the biggest visible jump and unblock the rest.

## Pick your path

Reply with any of:

- `tier1` — engagement essentials
- `tier1+assistant` — recommended
- `all-tier1-2` — engagement + creator tools
- Or list numbers: e.g. `2, 4, 9, 17`
---

## Wave 2 — Shipped

- DB: `story_reactions`, `blocks`, `mutes`, `messages.shared_post_id`
- Story reactions (emoji bar) + reply-to-story → auto-DM
- Share-to-DM bottom sheet on every PostCard (+ Copy link split)
- Conversation renders shared-post preview card
- Global in-app realtime toaster (new DMs + notifications) mounted in AppShell
- Block & Mute from profile More menu; Feed filters both directions
- `/assistant` page (Aurelix AI, streaming GPT-5.5 Pro) + Wand button in Feed top bar
- Edge function `ai-assistant` streams SSE through Lovable AI Gateway

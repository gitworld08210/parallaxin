## Plan: 5 new features

### 1. Story stickers (Polls & Q&A)
- **DB**: `story_stickers` (id, story_id, kind: 'poll'|'qa', payload jsonb {question, options[]}, position {x,y}) + `story_sticker_responses` (id, sticker_id, user_id, response jsonb, created_at, unique(sticker_id,user_id))
- **UI**: extend `StoryCompose` with a sticker tool — drag/drop poll (2–4 options) or Q&A prompt onto the canvas. In `StoryViewer`, render interactive stickers: tap to vote / submit answer; show live tallies (poll bar fills) or hidden answers (only owner sees responses).
- **Owner insights**: new tab in story viewer for the author — list of votes/answers per sticker.

### 2. Collaborative posts (multi-author)
- **DB**: `post_collaborators` (post_id, user_id, status: 'pending'|'accepted'|'declined', invited_at, responded_at, primary key (post_id, user_id))
- **RLS**: post visible/owned by all accepted collaborators; only original author can invite; each invitee can accept/decline their own row.
- **Compose**: in `Compose` add an "Invite collaborators" picker (username search via profiles).
- **Display**: `PostCard` shows stacked avatars + "with @x and @y" (accepted only). Post appears in each accepted collaborator's profile grid and counts toward their `posts_count` (update `posts_count_trg` to also count accepted collab posts).
- **Notifications**: new types `collab_invite`, `collab_accepted`.

### 3. AI hashtag + best-time suggestions
- **Edge function**: `ai-post-suggestions` — input `{ content, media_type }`, output `{ hashtags: string[], best_time_iso: string, reasoning: string }`. Uses Lovable AI (`google/gemini-3-flash-preview`) with structured output (Zod schema via AI SDK `Output.object`). Best-time = analyze the user's last 30 days of `post_views` + follower activity windows; fallback to global heuristic if sparse.
- **UI**: in `Compose` add a "✨ Suggest" button → shows hashtag chips (tap to append) + recommended posting time (tap to set `scheduled_for`).

### 4. AI DM reply suggestions
- **Edge function**: `ai-dm-suggest` — input `{ conversation_id, last_n: 8 }`, fetches last messages (server-side, service role + member check), returns `{ suggestions: string[3] }` matching user's tone. Lovable AI, structured output.
- **UI**: in `Conversation`, above the input bar render 3 dismissable suggestion chips. Refresh on new incoming message. Setting toggle on `profiles` → `ai_dm_suggestions_enabled bool default true`.

### 5. Personalized "For You" ranking
- **DB**: `post_embeddings` (post_id pk, embedding vector(768), content_hash, created_at) — enable `pgvector`. `user_interest_vectors` (user_id pk, embedding vector(768), updated_at).
- **Edge functions**:
  - `embed-post` — triggered after publish (DB webhook or called from `Compose`); embeds `content` + hashtags via Lovable AI embeddings model; upserts.
  - `update-user-interests` — runs nightly or on engagement; averages embeddings of posts the user liked/saved/viewed in last 14 days.
  - `rank-foryou` — input `user_id`, returns top N post_ids by cosine similarity (excluding seen via `post_views`, blocked users, already-following-only filter optional). Falls back to chronological for cold-start.
- **UI**: new "For You" tab on `Feed` next to "Following". Uses `rank-foryou` then hydrates posts via existing query. Cache results 5 min in React Query.

### Order of build
1. DB migration (all new tables + pgvector + grants + RLS + trigger updates) — single migration
2. Edge functions (5 new) + deploy
3. UI: For You tab → Compose AI suggest → DM suggestions → Collab posts → Story stickers
4. Smoke test each: post a collab → vote on a poll → tap AI suggest → see For You ranks

### Technical notes
- Lovable AI: use existing AI gateway pattern (already used in `ai-assistant`, `ai-caption`). Embeddings model: `google/text-embedding-004` (768-dim).
- Realtime: add `story_sticker_responses` to `supabase_realtime` for live poll counts.
- All new tables get explicit GRANTs (authenticated CRUD as policies allow; service_role ALL; no anon).
- Reuse existing `useAuth`, `TopBar`, `GlassCard`, `framer-motion` patterns. No new design tokens needed.

This is a large scope (~3 edge functions, 1 migration, ~10 component changes). Want me to build it all in one pass, or split — e.g. start with **For You + AI suggestions** (highest leverage), then collab posts + story stickers in a follow-up?
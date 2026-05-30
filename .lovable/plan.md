# Remaining UI Wiring

Finish the three UI pieces left over from the engagement/AI feature build. Backend (tables, RLS, triggers) already exists.

## 1. Story stickers — authoring + viewing

**StoryCompose**
- Add a "Stickers" toolbar button → opens a small sheet with two options: **Poll** and **Q&A**.
- Poll editor: question + 2–4 options. Q&A editor: prompt text.
- Render sticker as a draggable chip overlaid on the story canvas; position stored as `{x, y}` normalized 0–1.
- On publish: after `stories` insert, insert into `story_stickers` with `kind`, `payload`, `position`.

**StoryViewer**
- Fetch `story_stickers` for the current story.
- Render at saved positions. 
  - Poll: tap an option → upsert into `story_sticker_responses`, show live % bars (subscribe via `supabase_realtime`).
  - Q&A: input field → insert response.
- If viewer is the story author: show an "Insights" tab listing all responses with responder avatar + answer.

## 2. Collaborative posts — display + accept/decline

**PostCard**
- Query `post_collaborators` (status='accepted') joined with profiles for the post.
- Header: stacked avatars (author + collaborators, max 3 shown + "+N"), text "@author with @user1 and @user2".

**Profile grid**
- Include posts where the user is an accepted collaborator (not only authored posts).

**Collab invite flow**
- New page/sheet `CollabInvites` (or inline in Notifications) listing pending rows where `user_id = me`.
- Two buttons per row: Accept → `status='accepted'`, `responded_at=now()`; Decline → `status='declined'`.

## 3. Notifications

Extend the notifications list renderer to handle:
- `collab_invite` → "{actor} invited you to collaborate on a post" → tap opens accept/decline sheet.
- `collab_accepted` → "{actor} accepted your collab invite" → tap opens the post.

## Technical notes

- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.story_sticker_responses;` (migration).
- Sticker drag: simple pointer events with bounds clamping — no extra deps.
- Avatar stack: reuse existing `Avatar` component with negative margin.
- Keep all new UI in feature folders next to existing `StoryCompose.tsx`, `StoryViewer.tsx`, `PostCard.tsx`, `Notifications.tsx`.

## Build order

1. Migration: enable realtime on `story_sticker_responses`.
2. PostCard collab display + Profile grid include.
3. Notifications rendering for new types + accept/decline sheet.
4. StoryCompose sticker authoring.
5. StoryViewer sticker rendering + responses + insights.
6. Smoke test each flow.
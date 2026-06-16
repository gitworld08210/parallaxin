# Plan: Groups, Group Calls, Reel Share & Story Mentions

Four connected features, shipped together since they share data models.

---

## 1. Group Chats (WhatsApp/Instagram style)

The `conversations` table already supports `is_group`. We just need UX + a few extras.

**Schema (migration):**

- Add `conversations.title text`, `avatar_url text`, `created_by uuid`.
- Add `conversation_participants.role text default 'member'` ('admin' | 'member').
- RPC `create_group(_title, _member_ids uuid[])` → inserts conversation, adds creator as admin, adds members.
- RPC `add_group_member(_conv, _user)` / `remove_group_member` / `leave_group` (admin-checked).
- Grants + RLS unchanged (existing participant policies already cover groups).

**UI:**

- `Messages.tsx` → "New group" button → `NewGroupSheet.tsx` (search followers, multi-select, name, create → navigate to conversation).
- `Conversation.tsx` → for groups: show group title/avatar in header, "Group info" sheet (members list, add/remove, leave).
- Messages already render per-sender; just show sender name above bubble when `is_group`.

---

## 2. Group Voice & Video Calls (mesh WebRTC, up to ~12)

Extend existing 1:1 call system to multi-party via **mesh** (each pair = own RTCPeerConnection). Good enough for small groups, no SFU needed.

Group call , screen share, reactions

And creator Start paid live it schedule 4 hour ago if user paid only which able to see live 

**Schema:**

- Add `calls.is_group boolean default false`, `calls.conversation_id` already exists.
- New `call_participants(call_id, user_id, joined_at, left_at, status)`.
- `call_signals` keeps `from_user`/`to_user` (already pairwise).

**Logic (`CallProvider.tsx` refactor):**

- `startGroupCall(conversationId, kind)` → insert call row `is_group=true`, insert self into `call_participants`, broadcast ring to all other participants.
- Each accepting peer creates pairwise PCs with already-joined peers (discovered via `call_participants` query + realtime).
- `remoteStreams: Map<userId, MediaStream>` instead of single stream.
- `CallScreen` renders a grid of remote tiles.
- Leave = mark `call_participants.left_at`; call ends when ≤1 remain.

**UI:**

- Group conversation header → phone + video icons call `startGroupCall`.
- `IncomingCallOverlay` shows group name + caller for group calls.

---

## 3. Share Reel to Followers (Instagram-style DM share)

**New component `ShareToFollowersSheet.tsx`:**

- Opens from Reels' send button (already exists in `Reels.tsx` / `PostCard.tsx`).
- Lists mutual followers + recent DMs, multi-select with checkmark chips.
- Optional message field.
- On send: for each selected user → `start_dm(other)` RPC → insert message with `content` = optional text + a special shared-post payload.

**Schema:**

- Add `messages.shared_post_id uuid references posts(id)` (nullable).
- `messages.kind text default 'text'` ('text' | 'shared_post' | 'shared_reel').

**Render:**

- `Conversation.tsx` message renderer → when `kind='shared_post'`, show a glass card with post thumbnail + caption + tap-to-open.

---

## 4. Story Mentions (@user sticker + auto-DM + re-share)

**Schema:**

- `story_stickers` already exists with 6 columns. Add a sticker `type='mention'` with `data: { user_id, username }`.
- On story insert with mention stickers → trigger inserts a DM to mentioned user: "mentioned you in their story" with `kind='story_mention'`, `shared_story_id` ref.
- Add `messages.shared_story_id uuid references stories(id)` nullable.

**UI:**

- `StoryCompose.tsx` → add "@ Mention" sticker tool. Tap → user picker (search followers/following) → places sticker with handle on canvas. Multiple mentions allowed.
- `StoryViewer.tsx` → mention stickers are tappable → opens user profile. Also shows a "+ Add to your story" button when the **mentioned** user views it → opens `StoryCompose` pre-loaded with the original story media + an attribution sticker.
- DM render → `kind='story_mention'` shows mini story preview + "Reply" / "Add to your story" buttons.

---

## Files

**New:** `NewGroupSheet.tsx`, `GroupInfoSheet.tsx`, `ShareToFollowersSheet.tsx`, `MentionPickerSheet.tsx`, `SharedPostMessage.tsx`, `SharedStoryMessage.tsx`. Plus 1 migration.

**Edited:** `CallProvider.tsx`, `CallScreen.tsx`, `IncomingCallOverlay.tsx`, `IncomingCallListener.tsx`, `Conversation.tsx`, `Messages.tsx`, `Reels.tsx`, `PostCard.tsx`, `StoryCompose.tsx`, `StoryViewer.tsx`, `lib/webrtc.ts`.

## Out of scope

- SFU/large groups (>6 video reliably). Mesh degrades past that.
  &nbsp;
- Mention notifications to non-followers when account is private.
- Story stickers other than mention (polls, music, etc.) — already partially exist; not touched here.

## Order of work

1. Migration (groups + call_participants + message kinds).
2. Group chat UI (create + info).
3. Group calls refactor.
4. Reel share sheet.
5. Story mention sticker + auto-DM + add-to-story flow.
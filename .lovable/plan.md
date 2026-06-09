## Goal
Rebuild **Messages** (inbox) and **Conversation** (thread) to match the attached mockup — pitch-black background, red `#E50914` accents, Telegram-style ergonomics, cinematic Netflix feel. Mobile-first (preview is 420px); the screenshot's two-pane look is the desktop layout.

## Messages (inbox) — `src/pages/Messages.tsx`
- Header: "Messages" bold title, filter icon + new-chat icon (red square button)
- Tab pills under header: **All · Unread (n) · Requests** — active tab gets red underline + red label, counter in red circle
- Chat rows:
  - 48px circular avatar (red ring if unread)
  - Bold name + verified red checkmark
  - Preview line (muted); when typing → "Typing…" in red
  - Right: timestamp (top), unread count in red pill (bottom)
  - Active/selected row: subtle red-tinted card background
- Bottom row: **Archived Chats** with archive icon + chevron
- Long-press → action sheet: Pin, Mute, Archive, Delete
- Search appears when tapping filter icon (collapses by default to match mockup)

## Conversation (thread) — `src/pages/Conversation.tsx`
- Sticky header: back arrow, avatar with red ring, name + verified, "online / typing…" in green/red below, search + call + more icons on the right
- **Pinned message banner**: red left bar, "Pinned Message" red label, preview text, tiny thumbnail, dismiss × 
- Date divider chip ("Today", "Yesterday") centered, dark gray pill
- Bubbles:
  - Theirs: dark graphite `#1f1f1f`, left-aligned, rounded with tail on last in group
  - Mine: red gradient `#7a1014 → #b8141a`, right-aligned, white text, ✓✓ read receipt in lighter red
  - Grouped by sender within 2 min; avatar shown only on first of group
  - Time inside bubble bottom-right (small, muted)
- Voice message bubble: red play button + red waveform + duration + sent time
- Long-press bubble → floating action bar: Reply, Copy, Forward, React, Delete + emoji row
- Swipe-right to reply; reply preview chip above composer
- Composer (sticky bottom, safe-area):
  - Pill input, attach 📎 (left), emoji 😊 + mic 🎙 (right, red mic)
  - Mic morphs into red send button when text present
  - Hold mic → slide-to-cancel voice recording (existing recorder logic preserved)

## Visual tokens (scoped inline, not global)
- Surfaces: page `#0a0a0a`, header/composer `#141414`, theirs bubble `#1f1f1f`, mine bubble red gradient
- Accent red: `#E50914` (primary CTAs, unread, mine bubbles, active tab)
- Online dot: `#46d369`
- Text: white / `rgba(255,255,255,0.6)` muted / `rgba(255,255,255,0.4)` faint
- Dividers: `rgba(255,255,255,0.06)`
- Motion: 200ms ease-out hovers, 180ms bubble pop-in, scale-on-press for rows + buttons

## Functional additions wired to existing schema
- **Pinned messages**: read `messages.is_pinned` if present, else skip the banner (no schema change this slice)
- **Typing indicator**: subscribe to Realtime `typing` channel per conversation (presence-based, no table)
- **Read receipts**: already in `messages.read_at` → render ✓ vs ✓✓
- **Unread count per chat**: count messages where `read_at IS NULL AND sender_id <> me`

## Files I'll touch
- `src/pages/Messages.tsx` — full rewrite
- `src/pages/Conversation.tsx` — full rewrite
- `src/components/dm/MessageBubble.tsx` — **new** (extracted)
- `src/components/dm/VoiceMessage.tsx` — restyle (red waveform + play button)
- `src/components/dm/ChatRow.tsx` — **new** (extracted inbox row)

## Out of scope
- Paid DMs paywall (separate slice you previously rejected — can revisit)
- Group chat creation, message search inside thread, scheduled messages, secret chats
- No backend / RLS / edge function changes
- No global theme token changes (scoped colors only)

Reply **approve** to build, or tell me what to change (e.g. "drop the red, use blue", "skip voice", "also redo the call screen").
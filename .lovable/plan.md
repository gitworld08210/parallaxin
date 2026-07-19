# Live black screen fix + WhatsApp-style Messages

## Part 1 — Fix the "black screen when I go live" bug

**Root cause (confirmed in `src/pages/LiveHost.tsx`):** The host's `<video>` element is rendered only when `streaming === true` (line 178). But `goLive()` calls `t.attach(videoRef.current)` (line 75) **before** `setStreaming(true)` runs (line 79). At that moment `videoRef.current` is `null`, so nothing gets attached and the viewport stays black even though the camera track is publishing to LiveKit.

**Fix:**
1. Flip `setStreaming(true)` on as soon as the LiveKit room connects, so the `<video>` element mounts.
2. Attach the local video track in a `useEffect` that runs when both `streaming` and the local track ref are ready — or store the created video track in a ref/state and attach inside a `requestAnimationFrame` after `setStreaming(true)`.
3. Keep `muted` + `playsInline` + `autoPlay` on the video (needed for local preview and iOS).
4. On `endLive`, detach and stop all local tracks (currently only `disconnect()` is called — camera light stays on).
5. Add a visible fallback: if no video frames arrive within 3s, show "Camera starting…" placeholder + a "Retry camera" button, and surface `getUserMedia` permission errors via toast (currently swallowed into a generic message).
6. Mirror the local preview (`scale-x-[-1]`) so the host sees themselves like a selfie camera — matches Instagram/TikTok.

No changes to viewer side unless the same attach-order bug exists — will verify `LiveViewer.tsx` during implementation and apply the same pattern if needed.

## Part 2 — WhatsApp-style Messages redesign

Rebuild the two existing screens with WhatsApp's exact visual language, using our design tokens (no hardcoded colors) and the tables already in the DB (`conversations`, `conversation_participants`, `messages`, `calls`, `stories`).

### Chats list (`src/pages/Messages.tsx`)
- WhatsApp green header with "Aurelix Chat" title, camera / search / overflow icons.
- Sticky tabs pill row: **All · Unread · Favourites · Groups** (uses existing `tab` state, renamed).
- Row layout: 56px round avatar → name + last message (single line, ellipsis, ✓/✓✓/✓✓ blue for read) → right column: time (green if unread) + unread pill + pin icon.
- Swipe row actions (framer-motion drag): swipe left → Archive / Delete, swipe right → Mark unread / Pin.
- Long-press row → selection mode with top action bar (pin, mute, archive, delete, mark read).
- Floating green FAB with `MessageCircle` for new chat.
- Bottom tab bar: **Chats · Updates · Communities · Calls** (Updates = existing stories, Calls = existing calls table, Communities = groups view).
- Empty state uses existing `EmptyState` component with WhatsApp-style copy.

### Chat thread (`src/pages/Conversation.tsx`)
- Header: back → avatar → name + "online / last seen / typing…" → video call, voice call, overflow.
- Wallpaper background (subtle doodle pattern token), messages as bubbles:
  - Outgoing: right-aligned, `chat-bubble-out` token (WhatsApp light-green), tail on last of group.
  - Incoming: left-aligned, `chat-bubble-in` token (card surface), tail on last of group.
  - Grouped by sender + minute; date chips ("Today", "Yesterday", "12 July 2026") pinned between groups.
  - Time + ✓/✓✓/✓✓ read receipts inside the bubble bottom-right.
- Reply-swipe: swipe a bubble right → quote-reply composer with colored left border.
- Long-press bubble → action sheet: Reply, React (emoji row: ❤️ 😂 😮 😢 🙏 👍 +), Forward, Star, Copy, Delete, Info.
- Reactions render as a pill under the bubble with count.
- Composer bar: emoji button, text input (auto-grow), attach (📎 opens sheet: Document / Camera / Gallery / Audio / Location / Contact / Poll), camera, mic (hold-to-record voice note with waveform preview and cancel-slide).
- Voice notes: bubble shows waveform, play/pause, duration, and a small avatar.
- Media messages: image/video preview with rounded corners, tap → fullscreen viewer.
- Typing indicator (three dots) and "seen" state driven by realtime channel.
- Disappearing-messages badge in header (feature flag, no backend work — UI only unless requested).
- Encrypted-notice system message on first open of a new chat.

### Calls tab (reuse `calls` + `call_participants`)
- History list grouped by date, incoming/outgoing/missed icons in green/red, tap to call back.
- Floating FAB → contact picker → start voice/video call using existing `CallScreen`.

### Data & realtime
- No schema changes needed for v1 — reuse `messages`, `conversations`, `conversation_participants`, `stories`, `calls`.
- Add realtime subscriptions for `messages` (INSERT/UPDATE for reactions & read_at) and `conversation_participants` (presence via LiveKit-less Postgres channel `typing`).
- If reactions and starred columns don't exist on `messages`, add them in a small migration (`reactions jsonb`, `starred_by uuid[]`) — will call out before running.

### Technical notes
- New tokens in `index.css`: `--chat-bg`, `--chat-bubble-out`, `--chat-bubble-out-foreground`, `--chat-bubble-in`, `--chat-tick-read`, `--wa-green`, `--wa-green-foreground`, `--wa-teal-dark`. Both light and dark palettes.
- New components under `src/components/whatsapp/`: `ChatHeader`, `ChatBubble`, `MessageTicks`, `DateChip`, `ReactionBar`, `ReactionPicker`, `VoiceRecorder`, `AttachSheet`, `SwipeableRow`, `WallpaperBg`, `ChatsTabBar`.
- Framer-motion for swipe/long-press/reaction animations.
- No new Edge Functions.
- Legal: this is a WhatsApp-inspired visual language using our own tokens and icons — no WhatsApp brand assets or exact logos.

## Files touched
- `src/pages/LiveHost.tsx` — attach order fix, mirror preview, track cleanup, permission errors.
- `src/pages/LiveViewer.tsx` — audit + apply same attach pattern if needed.
- `src/pages/Messages.tsx` — full rebuild.
- `src/pages/Conversation.tsx` — full rebuild.
- `src/components/whatsapp/*` — new primitives listed above.
- `src/index.css`, `tailwind.config.ts` — chat tokens.
- `src/App.tsx` — add `/calls` and `/updates` routes on the new tab bar.
- Optional migration for `messages.reactions` + `starred_by` if not present.

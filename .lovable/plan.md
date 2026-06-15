# Theme switcher row + WhatsApp/Instagram-style voice & video calls

Two independent changes, shipped together.

---

## Part 1 — Replace the toggle with a real fixed navigation at bottom 

The current row uses a `<Switch>`, which is why it doesn't feel like the rest of the menu. Replace it with a tappable navigation row that opens a small **Appearance** sheet with two clear options.

### UX

- Remove the `Switch`-based row in `SideMenu.tsx`.
- Add a normal nav row: icon = sun/moon (reflects current), label = **Appearance**, trailing text = current theme name (`Dark` / `Liquid Glass`).
- Tapping opens a bottom sheet with two large pickable cards:
  1. **Dark** — current red-on-black look (Moon icon, dark preview swatch).
  2. **Liquid Glass** — iOS-style frosted light theme (Sun/Sparkles icon, frosted light preview swatch).
- Selecting one calls `setTheme(...)` from `ThemeProvider`, closes the sheet, shows a toast "Switched to Liquid Glass / Dark".
- Selected card shows a checkmark + primary ring; tap-and-hold scale feedback.

### Files

- `src/components/layout/SideMenu.tsx` — drop Switch row, add Appearance row.
- `src/components/layout/AppearanceSheet.tsx` (new) — sheet with the two visual cards.

No theme logic changes — `ThemeProvider` already works. Light tokens already exist in `index.css`.

---

## Part 2 — 1:1 Voice & Video calling in DMs (WhatsApp / Instagram style)

Stack: **WebRTC peer-to-peer** + **Supabase Realtime** for signaling. No third-party (Twilio/Agora) needed for 1:1 — keeps it free and fully inside Lovable Cloud. Public Google STUN servers handle NAT traversal for ~80% of networks; a TURN server can be added later if reliability across strict NATs becomes an issue (would require an external paid service like Twilio Network Traversal or Metered.ca — out of scope for this phase).

### What the user gets

- In any 1:1 conversation header: **phone** and **video** icons (right side, next to the existing menu).
- Tap → outgoing call screen (full-screen, frosted, large avatar, "Calling…", Cancel button).
- Callee sees a full-screen **incoming call** overlay anywhere in the app (global listener), with Accept (green) / Decline (red) buttons + ringtone.
- On accept → full-screen in-call UI:
  - Voice: large avatar, name, live timer, mute, speaker toggle, end-call.
  - Video: remote video full-screen, local self-view picture-in-picture (draggable), mute, camera flip, video on/off, end-call.
- End or decline → call ends for both sides, summary message inserted into the conversation ("📞 Voice call · 2:14" or "📵 Missed call").

### Database (one migration)

`calls` table — one row per call, holds signaling state and history:

- `conversation_id`, `caller_id`, `callee_id`, `kind` ('voice'|'video'), `status` ('ringing'|'accepted'|'declined'|'ended'|'missed'|'cancelled'), `started_at`, `accepted_at`, `ended_at`, `duration_sec`.
- RLS: caller and callee can read/update their own calls.
- GRANTs for `authenticated` + `service_role`.
- Realtime enabled (`alter publication supabase_realtime add table calls`).

`call_signals` table — ephemeral SDP/ICE exchange:

- `call_id`, `from_user`, `to_user`, `kind` ('offer'|'answer'|'ice'|'bye'), `payload` jsonb.
- RLS: only participants. Auto-cleanup older than 1 hour via a simple `delete` policy run on insert (or skip and let it grow — tiny).

### Signaling flow (Supabase Realtime channels)

1. Caller inserts a `calls` row (`status='ringing'`).
2. Caller creates RTCPeerConnection, generates **offer**, inserts into `call_signals`.
3. Both sides subscribe to `call_signals` filtered by `call_id`.
4. Callee receives offer → creates peer connection → answers → inserts **answer** signal.
5. Both exchange **ice** candidates as they're gathered.
6. Either side ending sends **bye** and updates `calls.status`.

A global `<IncomingCallListener>` mounted in `AppShell` subscribes to:

- `postgres_changes` on `calls` where `callee_id=auth.uid()` and `status='ringing'`.
- Opens incoming-call overlay, plays ringtone (small mp3 in `/public/ringtone.mp3` — or use Web Audio synthesis to avoid asset).

### Files

- `supabase/migrations/<ts>_calls.sql` — tables, RLS, grants, realtime publication.
- `src/lib/webrtc.ts` (new) — thin wrapper around RTCPeerConnection + signaling helpers.
- `src/hooks/useCall.ts` (new) — state machine: idle → ringing → connected → ended; exposes start/accept/decline/end + media stream refs.
- `src/components/call/IncomingCallOverlay.tsx` (new) — global ringing UI with Accept/Decline.
- `src/components/call/CallScreen.tsx` (new) — full-screen in-call UI (voice + video variants).
- `src/components/call/IncomingCallListener.tsx` (new) — global realtime subscriber, mounted in `AppShell`.
- `src/pages/Conversation.tsx` (edit) — add phone + video icon buttons in the conversation header that invoke `startCall(kind)`.
- `src/components/layout/AppShell.tsx` (edit) — mount `<IncomingCallListener />` once.

### Edge cases handled

- Already on a call → second incoming auto-declines as "busy".
- Browser denies mic/camera → toast + cancel call.
- Callee offline → caller auto-cancels after 30s ring timeout → row marked `missed`, summary DM inserted.
- Page navigation during call → call state persists via a context provider so the in-call UI stays mounted across routes.

### Out of scope (this phase)

- Group calls (3+).
- TURN server for strict-NAT users (works on most networks via STUN only; add later if needed).
- Call recording.
- Push notifications when app is closed (would need OneSignal/web-push setup).
- Screen sharing.

---

## Technical notes

- WebRTC works in all modern mobile browsers (Safari iOS 11+, Chrome Android). No native wrapper needed.
- STUN config: `[{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]`.
- Ringtone: synthesized via WebAudio (two oscillators, 0.5s on / 0.5s off, looped) — avoids shipping an mp3.
- Local stream cleanup on `ended` to release mic/camera indicator.
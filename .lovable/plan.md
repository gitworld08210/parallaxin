
# Tier 4 Part 2 + Founders Deepening

Scope locked to option (b). Tier 5 (2FA, data export, deletion) and invite tokens / whisper channel deferred to next pass.

## 1. Tier 4 Part 2 — Polish & Safety

### Voice notes in DMs
- Add mic button in `Conversation.tsx` composer.
- Record via `MediaRecorder` → upload to `post-media/voice/{userId}/{uuid}.webm`.
- New `messages.media_url` + `messages.media_type` columns (audio).
- Inline waveform-style player (no heavy lib — CSS bars + `<audio>` element).

### Block & Report
- Block button on Profile header (uses existing `blocks` table). Blocked users hidden from Feed/Explore/DMs via client-side filter.
- Report sheet (`ReportSheet.tsx`) wired to existing `reports` table — reason picker (spam, harassment, impersonation, other) + details textarea.
- Surface in PostCard "..." menu, Profile "..." menu, Message long-press.

### Story Highlights UI
- `HighlightsRail.tsx` on Profile — horizontal circle rail showing `story_highlights` covers.
- `NewHighlightSheet.tsx` — pick from user's expired stories (`stories` where `expires_at < now()`) + cover + title.
- Tap highlight → reuse Story viewer.

### Alt-text AI
- Compose screen: "Suggest alt text" button → edge function `suggest-alt-text` calling Lovable AI `google/gemini-2.5-flash` with image URL.

## 2. Hall of Founders + Council — Part 2

### Founder Chronicle page
- Route `/founders/:username` → `FounderChronicle.tsx`.
- Full-screen mythic archive entry: hero `AuraFrame` (large), era mark, founder title, chronicle prose, signature works (3 pinned posts), unique sigil.
- New column `profiles.chronicle text`.

### Council Chambers
- Refactor `FounderCouncilScreen.tsx` into 4 wings: Architect / Curator / Sentinel / Innovator.
- Each wing = ambient gradient hero + member constellation (no ranked list; clustered avatar nodes).
- Tap member → Chronicle.

### Genesis Era section
- New section in `HallOfFoundersScreen.tsx` — reverent layout for `join_era = 'genesis'`, year mark, slow rotating central sigil, members arranged in arc.

### Founder-only Aurum theme
- New CSS class `.theme-aurum` in `index.css` (obsidian + warm gold tokens).
- Settings toggle visible only when `profiles.is_founder = true`.
- Persisted in `localStorage` + applied on `<html>`.

### Signature Aura
- New column `profiles.signature_aura text` (one of: ether, ember, verdant, violet, gold, frost).
- Picker in Settings (founders only). `AuraFrame` reads and tints rings accordingly.

### Genesis Mark watermark
- Subtle SVG sigil in PostCard footer when post author `is_founder = true`.

### Council vote weight
- Column `profiles.council_vote_weight int default 1` (council members get 3). No UI yet — schema-ready.

## 3. Database migration

```sql
ALTER TABLE public.profiles
  ADD COLUMN chronicle text,
  ADD COLUMN signature_aura text,
  ADD COLUMN council_vote_weight int NOT NULL DEFAULT 1;

ALTER TABLE public.messages
  ADD COLUMN media_url text,
  ADD COLUMN media_type text;
```
RLS already covers these (own-row policies).

## 4. Edge function

`suggest-alt-text` — POST `{ imageUrl }` → returns `{ altText }` via Lovable AI Gateway. CORS enabled, JWT validated in code.

## 5. Visual language (non-negotiable)

- Palette: obsidian `#06070B`, aurum `#C9A24C`, ether `#7EC8FF`.
- Founder pages use serif display (Cormorant).
- Motion: 20s+ rotation, no bouncy springs, parallax bloom on scroll.
- **No visible numeric scores anywhere.** Titles + eras only.
- No leaderboard ordering — eras and constellations.

## Files created
- `src/components/social/ReportSheet.tsx`
- `src/components/social/HighlightsRail.tsx`
- `src/components/social/NewHighlightSheet.tsx`
- `src/components/dm/VoiceRecorder.tsx`, `VoiceMessage.tsx`
- `src/pages/FounderChronicle.tsx`
- `src/components/founders/SignatureAuraPicker.tsx`
- `src/components/founders/GenesisMark.tsx`
- `supabase/functions/suggest-alt-text/index.ts`
- 1 migration

## Files edited
- `Profile.tsx`, `Conversation.tsx`, `Compose.tsx`, `HallOfFoundersScreen.tsx`, `FounderCouncilScreen.tsx`, `PostCard.tsx`, `Settings.tsx`, `index.css`, `App.tsx`

Ready to switch to build mode.

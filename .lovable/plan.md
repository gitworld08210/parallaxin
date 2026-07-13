# Redesign Upload + Paid Live Features

## Part 1 — Unified Compose (Instagram + TikTok style)

### A. Central "+" Create Sheet
Replace scattered upload entry points with one modal sheet opened from the bottom-nav "+" button. Options:
- **Post** (photo/carousel) — Instagram-style
- **Reel** (short video) — TikTok-style
- **Story** (24h)
- **Go Live** (opens live setup — see Part 2)

Full-screen sheet, large tap targets, animated icons, dark backdrop.

### B. Reel Compose redesign (TikTok-style)
File: `src/pages/ReelCompose.tsx` (rebuild)
- Full-screen vertical camera preview
- Left rail: **Flip cam, Speed (0.3x–3x), Timer, Filters, Beauty**
- Right rail: **Add Music, Effects, Align**
- Bottom: large record button with progress ring, gallery picker, "Next"
- After record → trim + caption + cover screen
- **Music picker sheet**: browse tracks, search, trim clip, adjust original/music volume (tracks stored in `music-library` bucket; seed with royalty-free set + creator uploads later)
- **Filter strip**: horizontal preset thumbnails (Vivid, Mono, Warm, Cool, Film, Noir, etc.) applied via CSS filters on preview; baked in on export using canvas/WebCodecs

### C. Post Compose redesign (Instagram-style)
File: `src/pages/Compose.tsx` (rebuild)
- Step 1: Gallery grid + multi-select (up to 10) with camera tab
- Step 2: Crop (1:1 / 4:5 / 16:9) + swipeable **filter carousel** below preview
- Step 3: Caption, tag people, location, audience, advanced (comments off, hide likes)

### D. Story Compose polish
File: `src/pages/StoryCompose.tsx`
- Add filter strip + **music sticker** (pick track, trim 15s, shows on story)
- Keep existing polls/Q&A stickers

### E. Design tokens
No new colors — use existing `bg-background/foreground/primary/muted`. All rails use `GlassCard` + `backdrop-blur`.

---

## Part 2 — Paid Live (with free option preserved)

### A. Data model (new columns / tables)
Extend `live_streams`:
- `access_type`: `free | ticket | subscribers_only`
- `ticket_price_coins` int
- `preview_seconds` int (default 0)
- `total_tips_coins` int (default 0)

New tables:
- `live_tickets` (id, stream_id, user_id, price_coins, purchased_at) — one row per paid entry
- `live_gifts_catalog` (id, name, icon, cost_coins, animation) — seed 6–8 gifts (Rose, Heart, Rocket, Crown, Diamond, Fireworks)
- `live_gifts` (id, stream_id, sender_id, gift_id, qty, coins_total, created_at) — tip/gift log

Grants + RLS per project rules. Uses existing `coin_transactions` + `creator_balance` for monetization (no new payment provider needed — coin economy already exists).

### B. Host flow — `src/pages/LiveHost.tsx`
Add pre-live setup:
- Title, thumbnail
- **Access**: Free / Ticket (set coin price) / Subscribers only
- Toggle: Allow gifts (default on)

### C. Viewer flow — `src/pages/LiveViewer.tsx`
On entry, check `access_type`:
- `free` → join directly
- `ticket` → check `live_tickets`; if none, show paywall with price + "Unlock with X coins" → deduct via edge function → insert ticket → join. Optional `preview_seconds` shows blurred preview then paywall
- `subscribers_only` → check `subscriptions` active for host; if not → "Subscribe to join" CTA to creator's premium page

Overlay:
- Gift button opens **Gift tray** (grid of gifts with coin cost)
- On send: deduct coins, insert `live_gifts`, broadcast animation to all viewers via realtime channel (`live:{id}`)
- Top overlay shows total tips + top gifters leaderboard

### D. Go Live entry
Add "Go Live" row inside the new central Create sheet → routes to `/live/host`.

### E. Edge functions
- `live-purchase-ticket` — validates coins, atomically deducts, inserts ticket, returns join token
- `live-send-gift` — validates coins, deducts, logs gift, credits host's `creator_balance` (minus platform cut)

---

## Files touched (summary)
**New:**
- `src/components/create/CreateSheet.tsx` (unified + sheet)
- `src/components/compose/FilterStrip.tsx`, `MusicPickerSheet.tsx`
- `src/components/live/PaywallOverlay.tsx`, `GiftTraySheet.tsx`, `GiftAnimation.tsx`
- `supabase/functions/live-purchase-ticket/index.ts`
- `supabase/functions/live-send-gift/index.ts`
- Migration: extend `live_streams`, add `live_tickets`, `live_gifts_catalog`, `live_gifts` (+ GRANTs, RLS, seed catalog)

**Edited:**
- `src/pages/ReelCompose.tsx` (full rebuild — TikTok layout)
- `src/pages/Compose.tsx` (full rebuild — Instagram layout)
- `src/pages/StoryCompose.tsx` (add filter strip + music sticker)
- `src/pages/LiveHost.tsx` (pre-live setup with access type)
- `src/pages/LiveViewer.tsx` (paywall + gift tray)
- Bottom nav "+" wiring (likely `AppShell.tsx`) → opens `CreateSheet`

## Out of scope (ask later if needed)
- Real-money purchase of coins (existing coin flow reused)
- Advanced AR effects / face tracking beyond CSS filters
- Live co-hosting / multi-guest

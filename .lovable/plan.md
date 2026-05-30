## Build the "Fix at bottom glass arc" bottom nav (v2)

Rebuild `AppShell` bottom nav to match the selected prototype exactly.

### New nav layout (5 slots, ordered)

```
[ Feed ]  [ Reels ]  [ + Create ]  [ DMs ]  [ Profile ]
```

- **Center Create (+)** replaces the Discover tab in the bar. It's an elevated circular gradient button (`-top-7`) that opens the existing Compose sheet (Post / Reel / Story).
- **Discover** moves to the Feed top bar as a Compass icon (next to Wand + Bell) so it stays one tap away.

### Visual spec (verbatim from chosen prototype)

- Bar: `bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] px-4 py-3` with `shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]`
- Ambient glow blob behind bar
- Active tab: icon wrapped in `p-2 rounded-2xl bg-gradient-to-br from-[#8b5cf6] via-[#d946ef] to-[#06b6d4] shadow-[0_0_20px_rgba(217,70,239,0.4)]`, white label
- Inactive tab: `text-white/40` icon + label, `active:scale-95`
- Center FAB: 56px ring with gradient stroke + inner gradient disk, big white `+`
- DMs slot: glowing cyan dot when there are unread messages (animated pulse)
- Profile slot: small avatar disk in place of the User icon; glowing fuchsia dot when there are unread notifications
- Font: Space Grotesk for tab labels (already loaded via app fonts)

### Behavior

- `NavLink` drives active state for the 4 destination slots
- Center `+` opens a bottom Sheet with Post / Reel / Story (the same one currently on Feed) — move that Sheet from `Feed.tsx` into `AppShell.tsx` so create is always reachable, and remove the floating FAB from Feed
- Unread counts:
  - `messages`: subscribe to inserts where I'm a participant and `sender_id != me` and `read_at is null` → dot on DMs slot
  - `notifications`: existing query → dot on Profile slot (was on Feed slot — move it)
- Reels keeps its black-themed nav variant (the bar already swaps when `pathname.startsWith("/reels")`)

### Files

- `src/components/layout/AppShell.tsx` — rewrite the `<nav>` block; add Sheet for Create; add DMs-unread effect; move notifications dot to Profile slot
- `src/pages/Feed.tsx` — remove the floating `+` FAB + its Sheet; add a Compass link to `/discover` in the top-bar right cluster
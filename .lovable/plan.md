# Full UI overhaul — clean , Instagram-grade

## Why the current UI feels bad

- Theme is over-designed: heavy purple glows, blurred glass on glass, gradient borders everywhere → on a real 420px phone it reads as muddy and dark, not "premium."
- Low contrast (`text-white/40`, `bg-white/5`) hides content. Feed looks empty even when posts exist.
- Bottom nav is a floating arc with a raised center button — visually loud and overlaps content on short screens.
- Inconsistent spacing, multiple font systems, decorative chrome (Wand2, Compass, Sparkles, Bell) crowding every top bar.
- Bottom design overlap to bottom buttons 

## New direction: "Clean "

Reference quality: Instagram + Netflix . Restrained, content-first, high contrast, almost no chrome.

- **Background:** flat `#0a0a0a` (no gradients, no glow halos).
- **Surfaces:** `#141414` cards, `#1f1f1f` borders. No glassmorphism.
- **Text:** `#fafafa` primary, `#a3a3a3` secondary, `#737373` tertiary. Real contrast.
- **Accent:** single color — Instagram-style `#0095f6` blue for links/CTAs. No multi-stop gradients anywhere except the Stories ring and the Create gradient.
- **Typography:** Inter throughout. Drop "Space Grotesk" display font everywhere.
- **Spacing:** 16px base. Cards full-width edge-to-edge like IG, not pill-padded.
- **Radius:** 12px cards, 8px buttons, full for avatars/badges only.

## Bottom nav redesign

Replace floating glass arc with a flat IG-style bar:

```
┌────────────────────────────────────────┐
│  🏠      🎬      ➕       💬       👤  │
└────────────────────────────────────────┘
```

- Fixed to bottom, full-width, `bg-[#0a0a0a]`, top border `border-t border-[#262626]`.
- 56px tall. No floating, no raised center, no glow.
- Active icon: filled variant (lucide `*Filled` or `fill-current`), inactive: outline.
- Badge dots: small `#ff3040` (IG red) on DM/Profile when unread.
- Create (+) opens the same bottom sheet (Post/Reel/Story) — but the button is flat, not elevated.

## Per-page fixes

### Feed

- Remove the giant gradient "For You / Following" pill — use IG-style underline tabs (text only, thin bottom border on active).
- TopBar: brand left ("Aurelix" in clean Inter Bold), 3 icons right (Compass, DMs link to Messages, Heart for Notifications). Drop the wand.
- Stories rail: keep, but ring becomes 2px gradient on unviewed / 1px `#262626` on viewed.
- PostCard: edge-to-edge, square media, action row below (heart, comment, share, bookmark), then like count, caption, timestamp. Like IG exactly.
- Empty state: simple centered text + outline button.

### Reels

- Full-screen black, overlay UI right-aligned (like IG Reels). No glass containers.

### Messages

- IG DM style: list rows with 56px avatar, name + last message preview, timestamp right, unread dot.
- Conversation: white bubbles on black for own, `#262626` bubbles for other. No glass.

### Profile

- Header: avatar 80px left, stats (posts/followers/following) row right. Display name + bio below. Edit profile / Follow button full-width.
- 3-col image grid, 1px gaps, square crops.
- Tabs: grid / reels / tagged (icons only with underline).

## Files to change

- `src/index.css` — overwrite color tokens, drop glow/shadow utilities, set Inter as the only font.
- `tailwind.config.ts` — simplify palette.
- `src/components/layout/AppShell.tsx` — flat bottom nav.
- `src/components/vibe/TopBar.tsx` — clean header.
- `src/components/social/PostCard.tsx` — IG card layout.
- `src/components/social/StoriesRail.tsx` — refine ring.
- `src/pages/Feed.tsx` — underline tabs, drop gradient pill, remove wand.
- `src/pages/Reels.tsx` — full-screen layout cleanup.
- `src/pages/Messages.tsx` — IG list rows.
- `src/pages/Conversation.tsx` — IG bubbles.
- `src/pages/Profile.tsx` — IG profile header + grid.

## Out of scope

- No feature changes (no new pages, no new backend).
- Keeping all existing routes, data queries, auth, RLS.
- Keeping Stories, AI Assistant, Verification flows — only their styling shifts.

## Confirmation

This is a styling-only sweep. After approval I'll implement in one pass and screenshot Feed + Messages + Profile to verify.
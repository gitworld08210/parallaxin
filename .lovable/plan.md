
# Match Profile to Mock — fix what's actually broken

Inspected the live `/profile` page next to mock screen 1. Three concrete mismatches:

## Issue 1 — ProfileShowcase still ships mock data ❌
The block under your bio shows `3.2M views`, `289K engagement`, `$12,450 supporters`, `Aura Level 12 Legendary 12,450/15,000 XP`. You explicitly asked for zero values. This is the real source of the frustration.

**Fix in `src/components/profile/ProfileShowcase.tsx`:**
- About: keep section, drop the hardcoded "AI Enthusiast / Cyberpunk Lover / Web3 Believer / Content Creator" chips (or render only what's in `profile.interests`)
- Achievements (4 tiles): keep names but render as **locked** (muted icon, no neon color, small lock icon corner)
- Performance Overview: Views `0`, Engagement `0`, Profile Visits `0`, New Followers `0`. Replace the fake sparklines with a flat baseline.
- Top Supporters: empty state "No supporters yet" instead of NovaX/CyberZ/Dreamy/Stellar
- Aura Level: ring at `0%`, Level `0`, label `Beginner`, `0 / 1,000 XP`
- "View Analytics" → routes to `/analytics`, "View Aura Benefits" → `/aura-level` (real pages, not toast)

## Issue 2 — Profile header layout doesn't match mock ❌
Mock: avatar sits **top-left overlapping the cover**, with display name + verified tick + handle + bio + website all stacked **to the right of the avatar** on the same row. Currently the avatar is centered-left and name/bio sit underneath.

**Fix in `src/pages/Profile.tsx`:**
- Wrap avatar + identity in a `flex gap-4` row
- Avatar `h-20 w-20`, neon gradient ring stays
- Identity column on the right gets name, `@handle`, bio, `aurelix.app/<username>` link
- Hall of Founders pill moves below this row (full width, left-aligned)
- Stats row stays as-is below

## Issue 3 — Empty cover looks broken ❌
When `profile.cover_url` is null the banner area just shows dark gradient with no content. Mock has a rich cinematic cover.

**Fix:** when no cover, render a layered fallback — radial gradient using `--primary` + `--aura` with subtle noise, instead of the flat dark gradient. (No image asset added.)

## Out of scope (not touching)
- HighlightsRail (renders empty state correctly when user has no highlights — matches mock once user adds them)
- Bottom nav (the floating row in my screenshot was a full-page screenshot artifact, not a real bug)
- Tabs row (already matches mock layout: text + small icon + underline)

## Verification step
After edits I will re-screenshot `/profile` at 414×896 and compare against the mock crop. If anything still doesn't match, I keep iterating before handing back.

Reply **go**.

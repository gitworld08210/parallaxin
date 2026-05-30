# Redesign Main Profile (Screen #1 from mock)

Repaint the public profile page to match screen 1 of your Aurelix mock — cinematic cover image, neon avatar ring, Hall of Founders pill, premium stat row, highlight rail with neon labels, and a new icon-tab grid. Keep all current data wiring (Supabase, follow/block/mute, posts/reels/saved) untouched — pure visual layer change.

> Note on the model: this Lovable session runs on Claude (Sonnet 4.5). GPT-5.5 isn't the session coder — it's only available inside your *app's* edge functions via the Lovable AI Gateway. I'll keep coding here on Claude; tell me if you want me to wire `openai/gpt-5.5` into an edge function instead.

## What changes in `src/pages/Profile.tsx`

1. **Top bar** — left: back arrow + "AURELIX" wordmark in primary neon. Right: bell icon (with red dot when unread), kebab/menu. Replace current minimal `@username` header.
2. **Cover banner** — full-width 180px cinematic cover (`profile.cover_url` if present, else gradient fallback). Avatar overlaps the bottom-left with a glowing neon ring (`ring-2 ring-primary shadow-[0_0_24px]`).
3. **Identity block** — display name + verification badge inline, `@username` muted below, bio (whitespace-pre-wrap), website link styled as `aurelix.app/<username>`.
4. **Hall of Founders pill** — small rounded pill with crown icon under the bio, only if it is approved founder from Admin `is_founder`. Gradient `from-aura/30 to-primary/20`.
5. **Stat row** — 3 columns centered: `Posts · Followers · Following`. Numbers large + bold, label `text-xs` uppercase muted. No dividers, generous spacing.
6. **Action row** — `Edit Profile` (gradient primary, filled), `Share Profile` (outlined), and a small square `UserPlus` icon button (invite). When viewing someone else: `Follow` / `Message` keep current logic.
7. **Highlights rail** — keep existing `HighlightsRail` component but wrap labels with neon-tinted captions (AI Art, Travel, Reels, Projects, Life style). No data change.
8. **Tab bar** — Posts / Reels / Spaces / Saved / Tagged as a horizontal scrolling row of text labels with an underline indicator (instead of the current icon-only row). Active tab gets `text-foreground` + 2px primary underline. "Spaces" and "Tagged" render an empty-state shell for now.
9. **Grid** — keep 3-col grid for Posts/Reels, but tighten gap to `gap-0.5`, add subtle hover scale, rounded `rounded-sm` on tiles.
10. **Showcase sections** — keep `ProfileShowcase` mount as-is (only on `isMe`).

## What does NOT change

- All Supabase queries, follow/block/mute, comment/report sheets, side menu wiring, routing.
- `ProfileShowcase`, `HighlightsRail`, `PostCard` internals.
- Other pages.

## Tech notes

- Pure JSX/Tailwind edits inside `Profile.tsx`. No new files.
- Uses existing semantic tokens (`--primary`, `--aura`, `--muted`) — no hex colors.
- Spaces/Tagged tabs render `EmptyState` placeholder; we'll wire data in a follow-up if you want.
- Cover height responsive: `h-40 sm:h-48`.

Reply **go** to build it, or tell me to skip/tweak any section above.
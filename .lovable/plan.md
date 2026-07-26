## Goal
Add Apple-style Liquid Glass surfaces to the app **in light mode only**. Dark mode stays byte-for-byte unchanged.

Powered by the `liquid-glass-js` skill (WebGL glass with real refraction/rim lighting/blur), with a safe Tailwind `backdrop-blur` fallback for browsers without WebGL2.

## Where glass appears (light mode only)
1. **Bottom tab bar** — floating pill nav in `AppShell`
2. **Top bar / page headers** — sticky `TopBar` / `PageHeader`
3. **Primary buttons** — FAB on Feed, Send button in Assistant/Conversation, Create sheet trigger
4. **Cards / sheets** — `CreateSheet`, `Compose` panels, key `GlassCard` surfaces

## How it works
- Copy `container.js`, `button.js`, `glass.css` from the skill assets into `public/vendor/liquid-glass/`.
- Load `html2canvas` (CDN) + the two glass scripts in `index.html` before `</body>`, gated so they only initialize when `document.documentElement` has no `.dark` class.
- Wrap the WebGL primitives in three React components:
  - `LiquidGlassSurface` — panel/card wrapper (used by TopBar, tab bar, sheets, cards)
  - `LiquidGlassButton` — pill/circle button (FAB, Send, Create)
  - `useIsLightGlass()` — hook returning `true` only when theme = light AND WebGL2 is available AND `prefers-reduced-motion` is off
- Each component renders liquid glass when `useIsLightGlass()` is true; otherwise falls back to the current styling (dark mode = untouched, unsupported browsers = current look).

## Files touched
- **New:** `public/vendor/liquid-glass/{container.js,button.js,glass.css}`
- **New:** `src/components/glass/LiquidGlassSurface.tsx`
- **New:** `src/components/glass/LiquidGlassButton.tsx`
- **New:** `src/hooks/useIsLightGlass.ts`
- **Edit:** `index.html` — add `<link>` + gated `<script>` tags
- **Edit:** `src/components/layout/AppShell.tsx` — bottom nav
- **Edit:** `src/components/vibe/TopBar.tsx` + `src/components/layout/PageHeader.tsx` — headers
- **Edit:** `src/pages/Feed.tsx`, `src/pages/Assistant.tsx`, `src/pages/Conversation.tsx` — key buttons
- **Edit:** `src/components/create/CreateSheet.tsx`, `src/components/vibe/GlassCard.tsx` — sheet/card surfaces

## Guarantees
- Dark mode: no CSS or DOM changes reach it — the theme check short-circuits before any WebGL work.
- No functional changes: only visual wrappers around existing controls; onClick/props/routing untouched.
- Performance: one shared `Container` per surface, buttons nested as children (skill's intended pattern) — not hundreds of canvases.
- Fallback: browsers without WebGL2 or with `prefers-reduced-motion` get the current Tailwind styling.

## Out of scope
- Dark mode restyling
- New animations beyond the glass shader
- Any business logic, data, or route changes

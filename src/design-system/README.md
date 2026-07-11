# Aurelix UI 2.0 — Design System

Foundation for the Aurelix redesign. This sprint delivers **tokens + primitive
wiring only** — no screen changes, no feature changes.

## What lives where

| Concern | Location |
| --- | --- |
| Color / surface / motion CSS vars | `src/index.css` (`:root` and `.light`) |
| Typed token references | `src/design-system/tokens.ts` |
| Motion presets (framer-motion variants) | `src/lib/motion.ts` |
| Primitive components (Button, Input, Card, Dialog, Sheet, Toast, …) | `src/components/ui/*` (shadcn — token-driven) |
| App-level composite primitives (TopBar, GlassCard, AuraAvatar, EmptyState) | `src/components/vibe/*`, `src/components/empty/*` |

## Rules

1. **Never** hardcode hex or raw `text-white` / `bg-black` in components.
   Use semantic tokens (`bg-background`, `text-foreground`, `bg-card`,
   `border-border`, `text-muted-foreground`, `bg-primary`, …).
2. Spacing = multiples of **4/8** only. Radius = one of `sm|md|lg|xl|2xl`.
3. Motion goes through `src/lib/motion.ts` presets or `motion.duration/ease`
   from `tokens.ts`. Duration ≤ 360 ms.
4. All primitives already ship the full state surface: `hover`, `active`,
   `disabled`, `focus-visible`, `data-[state=…]`, loading via `disabled`.

## Palette (Dark, canonical)

| Token | HSL | Hex |
| --- | --- | --- |
| `--background` | `240 6% 4%` | `#09090B` |
| `--surface` | `240 5% 7%` | `#111113` |
| `--card` / `--surface-glass` | `240 6% 10%` | `#17171A` |
| `--surface-elevated` / `--popover` | `240 8% 13%` | `#1F1F24` |
| `--border` | `240 8% 18%` | `#2A2A31` |
| `--foreground` | `0 0% 100%` | `#FFFFFF` |
| `--secondary-text` | `240 6% 71%` | `#B0B0BA` |
| `--muted-foreground` | `240 4% 60%` | `#7C7C86` |
| `--primary` | `265 85% 65%` | premium violet |
| `--success` / `--warning` / `--danger` | green / orange / red | semantic |

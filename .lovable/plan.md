# App-wide Redesign Plan

You're asking for a full visual + interaction overhaul across most of the app. This is a large scope, so I want to align before I touch code.

## What you're asking for (as I understand it)

| Surface | Inspiration | Core feel |
|---|---|---|
| Home feed | Twitter / X | Infinite text-first timeline, sticky tabs (For you / Following), compact engagement bar |
| Photo/Post grid | Instagram | 3-col grid, stories rail, double-tap heart, immersive viewer |
| Reels | TikTok | Full-screen vertical snap, right-rail actions, auto-play, swipe up/down |
| Messages | Telegram / WhatsApp | Chat bubbles, tail, sent/read ticks, voice notes, media grid, swipe-to-reply |
| Side menu / drawer | Instagram | Slide-out with account switcher, saved, close friends, insights, settings |
| Auth / Login | X | Split-screen big logo, phased email → password, minimal chrome |
| Profile | X | Cover + avatar overlap, verified + affiliation chip, sticky tabs |
| Premium | Apple | Big serif hero, plan cards with hairline borders, tier toggle, quiet motion |

## Scope reality check

The current app already has ~30 pages. Rewriting all of them premium-quality in one pass is not realistic in a single turn — the result would be shallow across the board. I want to do this in **staged passes**, one surface family per turn, so each screen actually gets the craft it deserves.

## Suggested order (highest impact first)

```text
Pass 1  Auth        Auth.tsx, ResetPassword.tsx           (X-style split hero)
Pass 2  Side menu   SideMenu.tsx + AppShell trigger       (IG drawer, account row, sectioned links)
Pass 3  Feed        Feed.tsx + PostCard                   (X timeline, sticky For you / Following)
Pass 4  Reels       Reels.tsx + ReelCompose viewer        (TikTok vertical snap + right rail)
Pass 5  Messages    Messages.tsx + Conversation.tsx       (Telegram bubbles, WhatsApp ticks, voice UI)
Pass 6  Premium     Premium.tsx                           (Apple hero, plan cards, tier toggle)
Pass 7  Profile     Profile.tsx polish                    (already X-styled; tighten spacing + affiliation)
```

Each pass = one turn, focused, verified visually before moving on.

## What I need from you before I start

1. **Confirm the order** above, or reshuffle it (e.g. "start with Reels").
2. **Design tokens** — should I keep the current dark Aurelix palette (primary purple, dark background), or re-pick a palette for the whole app? If re-picking, I'll run a taste round (palette / typography / layout) first.
3. **Scope of change per screen** — visual only (layout, spacing, motion, chrome) vs. also restructuring information architecture (adding/removing sections)? Recommend visual-only to keep behavior stable.
4. **Menu content** — you said "menu I access more features". List the entries you want in the IG-style drawer (e.g. Saved, Close Friends, Insights, Wallet, Verification, Settings, Log out) or let me propose a default set based on existing routes.

Once you answer, I'll start with Pass 1 and ship one polished surface per turn.

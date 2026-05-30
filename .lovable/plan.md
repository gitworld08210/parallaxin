## Goal

The mockup shows several features that don't yet exist in the app. Add them as **visible but non-clickable placeholders** (with a "Coming soon" hint on tap) so the UI matches the vision. We'll wire real functionality later.

## Missing features identified

Comparing mockup vs current app:


| Feature                                                                                                                                                                 | In app?              | Action                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | -------------------------------- |
| Home, Explore, Reels, Messages, Notifications, Hall of Founders, Saved, Settings, Premium, Wallet, Verification, Profile                                                | Yes                  | skip                             |
| **Communities**                                                                                                                                                         | No                   | add placeholder                  |
| **Creator Hub**                                                                                                                                                         | No                   | add placeholder                  |
| **Analytics** (global, not per-post)                                                                                                                                    | No                   | add placeholder                  |
| **Help & Support**                                                                                                                                                      | No                   | add placeholder                  |
| **Achievements** card (Top Creator, Viral Creator, Trendsetter, Hall of Founders badges)                                                                                | No                   | add to Profile as static section |
| **Performance Overview** (Views / Engagement / Profile Visits / New Followers with sparkline-style stats)                                                               | No                   | add to Profile as static section |
| **Top Supporters** list                                                                                                                                                 | No                   | add to Profile as static section |
| **Aura Level** ring (level 12 Legendary, XP progress)                                                                                                                   | No                   | add to Profile as static section |
| **About** card (interests chips: AI Enthusiast, Cyberpunk Lover, Web3 Believer, Content Creator)**Note:-** All feature button add show on side menu of profile section | Partial (bio exists) | add interests chips card         |


## Implementation

### 1. Side menu entries (non-clickable)

In `src/components/layout/SideMenu.tsx`, add new rows for **Communities**, **Creator Hub**, **Analytics**, **Help & Support**. Render them styled identically to the active rows but:

- Use a `<button>` (not a `<Link>`)
- On click → `toast({ title: "Coming soon", description: "<feature> is launching shortly." })`
- Add a subtle "Soon" pill on the right

### 2. Profile page additions (static, non-clickable)

In `src/pages/Profile.tsx`, add four new presentational sections below the existing profile header, each wrapped in a card matching the mockup's dark glass aesthetic:

- **About card** — bio text + 4 interest chips with icons
- **Achievements** — 2×2 grid of badge tiles (icon + title + subtitle)
- **Performance Overview** — 4 stat tiles (label, big number, % change, faux sparkline SVG)
- **Top Supporters** — list of 4 mock supporters with avatar + handle + Aura amount
- **Aura Level** — circular progress ring with level number, label, and XP

All data is hardcoded mock data for now. All "See All" / "View …" buttons render but on click show the same "Coming soon" toast.

### 3. Visual style

- Reuse existing semantic tokens (`bg-card`, `border-border`, `text-primary`, `shadow-glow`)
- New sections use the same red-glow accent already defined in `index.css`
- No new colors added

## Non-goals

- No new routes, no backend changes, no schema changes
- No real analytics, communities, or achievements logic
- Existing pages (Feed, Reels, Messages, etc.) untouched

## Files touched

- `src/components/layout/SideMenu.tsx` — add 4 non-clickable rows
- `src/pages/Profile.tsx` — add 5 new presentational sections
- (maybe) `src/components/profile/` — small new folder for the section components if Profile.tsx gets long

Ready to build when you approve.
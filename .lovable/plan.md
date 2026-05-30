## Goal

Make `/profile` match the attached reference 1:1. Remove elements that aren't in the reference; reflow the header so bio + website sit full-width below the avatar row instead of inside the identity column.

## Changes — `src/pages/Profile.tsx` only

### 1. Identity column (avatar+name row)

Keep only the display name (+ verified tick if approved by admin in backend) and `@username`. Remove from this column:

- the bio paragraph
- the Hall of Founders inline pill if approved by admin in backend then only appear here

### 2. New full-width "About strip" between avatar row and Stats

Render directly after the avatar row, before Stats:

- `{profile.bio}` as a left-aligned `<p>` (only if present)
- `aurelix.app/{username}` as a primary-colored link on its own line

This matches the reference, where `Gg` and `aurelix.app/ad876` start from the left edge under the avatar — not next to the name.

### 3. Delete the Verification CTA banner

Remove the entire block currently between Actions and Highlights:

```
{isMe && !profile.verified && (<Link to="/verification-center" …>Request verification</Link>)}
```

This feature lives in the side menu; it shouldn't appear on the profile screen.

## Out of scope (already matches reference)

- Top bar (AURELIX wordmark, back, bell, menu)
- Cover banner gradient fallback
- Avatar treatment (gradient ring, size, overlap)
- Stats row (Posts / Followers / Following)
- Action buttons (Edit Profile / Share Profile / invite)
- HighlightsRail "New" tile
- ProfileShowcase (About, Achievements, Performance, Top Supporters, Aura Level)
- Tabs row and empty "No posts yet" state

## Verification

After edit, navigate to `/profile` at 414×896 and screenshot. Compare side-by-side with the reference and confirm: bio+link sit full-width under the avatar row, no "Request verification" banner appears, no Hall of Founders pill in header.
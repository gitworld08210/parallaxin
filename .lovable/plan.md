## Goal

Walk through the app end-to-end using the browser tool, identify what's broken, fix anything I find. You sit back — I'll narrate findings as I go.

## Test pass (in order)

I'll use the preview at 420×765 (your current viewport). For each step: load the screen, exercise the main action, check console + network for errors.

### A. Admin flow (logged in as adit080210@gmail.com)
1. `/auth` → log in with `adit080210@gmail.com / admin@9756` → should land on `/admin`.
2. **Verification requests** — list loads; if a pending row exists, open it, generate signed URLs for ID + supporting docs, click Approve and confirm profile gets `verified=true` + notification row inserted.
3. **Reports** — list loads; flip a status open → reviewed → resolved.
4. **Founder seats** — list loads; assign a user to a seat, edit title/role, save; check `founder_seats` row updated and `profiles.is_founder` flipped via trigger.
5. **Users & roles** — search a username, toggle moderator role on/off; check `user_roles` row appears/disappears.
6. Sign out from admin.

### B. Regular user flow (separate signup or existing non-admin)
1. Sign in (or sign up a fresh account).
2. **Feed (`/`)** — stories rail + posts render; like, comment, save a post.
3. **Compose (`/compose`)** — upload an image, publish; confirm it appears in feed and `posts_count` on profile increments.
4. **Profile (`/profile`)** — opens; edit profile saves; verification request submit reaches `verification_requests` table.
5. **Discover / Reels / Notifications / Messages** — each route loads without console errors; open a DM thread and send a message.
6. **Founders pages** — `/founders` redirects to `/hall-of-founders` (just fixed), `/hall-of-founders` and `/founder-council` render.
7. **Settings → security/privacy/blocked/export** — each subscreen opens.

### C. Fix as I go
Any broken screen / failed network call / console error → I stop the test pass, fix it, then resume from that step. I'll tell you each bug as it's found, not at the end.

## What I need from you

Nothing — I have the admin credentials. For step B I'll either reuse an existing non-admin account in the DB or sign up a throwaway one. I'll confirm with you before any destructive action (deleting a real user's post/report).

## Out of scope

- Visual polish (separate pass if you want)
- New features
- Performance / SEO audits

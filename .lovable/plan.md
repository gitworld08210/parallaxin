## Goal

Remove the in-app admin panel entirely. All approvals (verification + Founder Hall) happen by an admin flipping a boolean in the backend table editor. The database itself reacts: grants perks, sends notifications, and is fully reversible (admin can flip back to false to revoke).

No `/admin` route. No admin UI. No edge functions for approval. Just: **edit row → trigger fires → user gets notified.**

---

## 1. Verification flow (rebuild around a boolean)

Today `verification_requests.status` is text (`pending`/`approved`/`rejected`) and nothing happens when it changes.

New shape:

- Keep `verification_requests` table (users still submit).
- Add column `approved boolean default false` (the only thing admin touches).
- Add DB trigger `on_verification_approved`:
  - When `approved` flips `false → true`: set `profiles.verified = true`, set `profiles.verification_kind = category`, insert a row into `notifications` (`type = 'verification_approved'`), set `reviewed_at = now()`.
  - When `approved` flips `true → false`: set `profiles.verified = false`, clear `verification_kind`, insert `notifications` row (`type = 'verification_revoked'`).

Admin workflow: Backend → Tables → `verification_requests` → toggle `approved` checkbox. Done.

---

## 2. Founder Hall flow (seed list, not applications)

Drop the application model. Founder Hall is a curated list the admin controls directly.

- **Delete** `founder_applications` table.
- **Delete** `FounderApply.tsx` page and any link to it.
- **Delete** `admin-approve-founder` and `admin-approve-verification` edge functions.
- **Delete** `src/pages/admin/AdminConsole.tsx`.

Create a new table `founder_seats`:

```text
founder_seats
  id            uuid pk
  user_id       uuid unique     -- which user holds this seat
  seat_number   int unique      -- 1..50 (admin assigns)
  council_role  app_role_enum   -- architect/curator/sentinel/innovator (nullable)
  founder_title text            -- optional ceremonial title
  is_active     boolean default true   -- admin's on/off switch
  created_at    timestamptz
```

Seed rows 1–50 + 1 admin seat empty (`user_id = null, is_active = false`) so admin sees the slots ready to fill.

DB trigger `on_founder_seat_change`:

- When `user_id` is set AND `is_active = true`: update that profile → `is_founder = true`, `founder_level = 1`, `join_era = 'founder'`, copy `council_role` + `founder_title`. Insert notification `type = 'founder_inducted'`.
- When `is_active` flips `true → false` OR `user_id` cleared: revoke → `is_founder = false`, clear founder fields. Insert notification `type = 'founder_revoked'`.

Admin workflow: Backend → Tables → `founder_seats` → paste a `user_id` into seat #7, set `council_role`, ensure `is_active = true`. Save. User is now a founder.

To revoke: flip `is_active` to false. Perks vanish, user notified.

---

## 3. Notifications

Extend `notifications.type` accepted values (it's already free-text) to include:

- `verification_approved` / `verification_revoked`
- `founder_inducted` / `founder_revoked`

Add a small UI mapper in `Notifications.tsx` so these render with the right icon + copy:

- "You've been verified ✓"
- "Welcome to the Founder Hall — Seat #7"
- "Your founder status has been updated"

No new screens — they appear in the existing notifications list.

---

## 4. Hall of Founders screen (read-only public list + perks)

`HallOfFoundersScreen.tsx` becomes a public showcase driven by `founder_seats`:

- Query: `founder_seats` where `is_active = true AND user_id IS NOT NULL`, joined with `profiles`, ordered by `seat_number`.
- Layout: cinematic grid of 50 numbered seats. Filled seats show avatar + display name + council_role badge + seat number. Empty seats show a dim "Seat awaits" placeholder.
- Tap a founder → their profile.
- Top of screen: **Perks of the Founder Hall** section (static, taken from prior plan):
  1. Genesis Mark on profile + everywhere they appear
  2. Signature Aura frame (animated gradient)
  3. Council voting weight ×3 on platform proposals
  4. Permanent join era `founder`
  5. Founder-only chat ring (future)
  6. Free Premium for life
  7. Early access to new features
  8. Name engraved in the Genesis Wall (settings → about)

No "Apply" button anywhere. Founder Hall is invitation-only via admin.

---

## 5. Security cleanup

- Keep `user_roles` + `has_role()` (used by trigger to guard who can write to `approved`/`is_active`).
- Add RLS on `founder_seats`:
  - SELECT: everyone (it's a public hall).
  - INSERT/UPDATE/DELETE: only `has_role(auth.uid(), 'admin')`.
- Add RLS on `verification_requests.approved` column write: only admin via a `BEFORE UPDATE` trigger that rejects non-admin attempts to change `approved`.

---

## 6. Files

**Delete**

- `src/pages/admin/AdminConsole.tsx`
- `src/pages/FounderApply.tsx`
- `supabase/functions/admin-approve-verification/`
- `supabase/functions/admin-approve-founder/`

**Migration (single file)**

- Drop `founder_applications`.
- Add `verification_requests.approved boolean default false`.
- Create `founder_seats` + seed 50 empty rows.
- Create both triggers + notification inserts.
- RLS policies on `founder_seats`.

**Edit**

- `src/App.tsx` — remove `/admin` and `/founder-apply` routes.
- `src/components/founders/HallOfFoundersScreen.tsx` — rewrite to read `founder_seats` + render perks section.
- `src/pages/Notifications.tsx` — render new notification types.

---

## Questions before I build

1. **Seed count:** confirm 50 founder seats (or different number)?
2. **Seat numbering:** should seat #1 be reserved for you (the admin), or all 50 open?
3. **Revoking founder:** when admin flips `is_active = false`, should the user's past content (posts/comments) lose the founder badge retroactively, or only future? (Recommend: badge disappears everywhere immediately — single source of truth on `profiles.is_founder`.)
4. **Verification revoke notification copy:** make notification brack so admin write message annual or here ai can generate message. Admin give reason for revoke hall of founders ai make notification from taking reason 
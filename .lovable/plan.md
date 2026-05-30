## Goal

Use the existing `/auth` login form for everyone. After a successful sign-in, check the user's role:

- If they have the `admin` role → redirect straight to `/admin` (admin panel only, no regular app chrome).
- Otherwise → normal flow (onboarding or `/`).

No separate admin login URL. Same email + password form. The difference is purely where they land based on role.

## Behavior

1. `**/auth` (existing page)** — unchanged UI. After `signIn` succeeds, query `user_roles` for the signed-in user. If `admin` row exists, navigate to `/admin`; else navigate to the previous intended route or `/`.
2. `**AuthProvider**` — on app load / `onAuthStateChange`, if the current route is a normal app route AND the user is admin, do NOT auto-redirect (admins can still browse the app if they manually navigate). But the post-login redirect always sends admins to `/admin`.
3. `**/admin**` — new admin-only area, guarded by a new `AdminRoute` wrapper using `useUserRole`. Non-admins hitting `/admin` get redirected to `/`. Admins see a dedicated admin layout (sidebar + header, no bottom nav / side menu from the consumer app).

## Admin panel contents

Sidebar with four sections:

- **Verification requests** — list pending `verification_requests` with all fields (full_name, category, organization, official_email, country, dob, reason, links, ID doc preview, supporting doc preview via signed URLs from the private `verification-docs` bucket). Approve / Reject toggles `approved`; the existing `on_verification_approved_trg` trigger handles profile + notifications.
- **Reports** — list `reports`, update `status` (open / reviewed / resolved).
- **Founder seats** — list `founder_seats`, assign/revoke `user_id`, edit `founder_title`, `council_role`, `is_active`, `revoke_reason`.
- **Users & roles** — search profiles by username, grant/revoke `admin` or `moderator` rows in `user_roles`.

Header: "Admin Panel" + admin's name + Sign out.

## Routing changes (in `src/App.tsx`)

- Add `<Route element={<AdminRoute />}><Route path="/admin" element={<AdminLayout />}>…children…</Route></Route>`.
- `/auth` stays the same; only its post-login redirect logic changes.

## Database changes

Add RLS policies on `user_roles` so admins can `SELECT / INSERT / DELETE` rows there (needed for the Users & roles screen). Uses `has_role(auth.uid(), 'admin')`. No schema changes — existing admin policies on `verification_requests`, `reports`, `founder_seats` already cover review/update.

## First admin

I'll seed one admin row in `user_roles` for the email you give me. Until then the panel exists but nobody passes the role check. Tell me which email should become the first admin and I'll insert it right after the build step.

Admin login id = [adit080210@gmail.com](mailto:adit080210@gmail.com) 

Password:- admin@9756

## Files to add

- `src/components/AdminRoute.tsx`
- `src/pages/admin/AdminLayout.tsx`
- `src/pages/admin/VerificationRequestsAdmin.tsx`
- `src/pages/admin/ReportsAdmin.tsx`
- `src/pages/admin/FounderSeatsAdmin.tsx`
- `src/pages/admin/UsersRolesAdmin.tsx`

## Files to edit

- `src/pages/Auth.tsx` — after sign-in, check role and redirect admins to `/admin`.
- `src/App.tsx` — register the `/admin` routes.

## Out of scope

- 2FA for admins.
- Admin action audit log.
- Extra notification emails beyond what the existing trigger already writes.
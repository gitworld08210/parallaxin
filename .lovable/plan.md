# Organization Accounts & Affiliation System

Large feature. Shipping it in 4 phases so you can review each before the next.

## Phase 1 — Database & backend

New tables (all in `public`, RLS + GRANTs):

- `organizations` — `id`, `owner_user_id`, `name`, `username` (unique), `logo_url`, `email`, `website`, `industry`, `org_type` (company/startup/edu/ngo/government), `description`, `country`, `location`, `verified`, timestamps
- `organization_members` — `org_id`, `user_id`, `member_role` (admin/manager/viewer), `joined_at` — internal team controlling the org account
- `affiliations` — `id`, `org_id`, `user_id`, `role` (enum: founder/co_founder/ceo/cto/employee/brand_ambassador/official_rep/advisor/investor/moderator), `status` (pending/active/declined/revoked/ended), `started_on`, `ended_on`, `note`, `issued_by`, `responded_at`, timestamps. Unique partial index on `(org_id,user_id)` where status in (pending, active) prevents duplicates.
- `affiliation_audit_logs` — `id`, `affiliation_id`, `org_id`, `actor_user_id`, `action` (issued/accepted/declined/revoked/role_changed/ended), `metadata jsonb`, `created_at`

Profiles: add `account_type` ('personal' | 'organization') and link to `organizations.id` for the org's own profile row (orgs still use a profiles row so they can post reels/posts like normal users — per your note).

Security-definer RPCs:
- `create_organization(...)` — creates org + profile + owner membership
- `issue_affiliation(org, username, role, started_on, ended_on, note)` — admin-only, creates pending row + notification + audit
- `respond_affiliation(affiliation_id, accept boolean)` — only the invited user
- `revoke_affiliation(affiliation_id, reason)` — admin-only
- `is_org_admin(org, user)` — helper used in RLS

Storage bucket `org-logos` (public) for logo uploads.

## Phase 2 — Signup & org onboarding

- `/auth` gets an account-type toggle: **Personal** | **Organization**
- Personal → existing flow unchanged
- Organization → after auth, redirect to `/onboarding/organization` with the advanced form (name, username, logo upload, official email, website, industry, org_type, description, country, location)
- After submit → redirect to org admin dashboard

## Phase 3 — Org admin dashboard

Route: `/org/:username/admin` — glassmorphism UI, gated by `is_org_admin`. Tabs:
1. **Team** — list active affiliated members, search, remove
2. **Affiliations** — issue new (search user by username → pick role → dates → note), pending list, revoke, edit role
3. **Analytics** — profile visits, post engagement, team stats (reuses existing post analytics where available)
4. **Posts** — create/manage official posts, pin announcement (adds `is_pinned` to posts for org accounts)

## Phase 4 — User-facing affiliation UX

- Notification entry: "VibeNexus invited you to become an official Founder" with Accept / Decline buttons
- Profile header: org logo chip beside verification tick, with "Founder at VibeNexus · Affiliated since Jun 2026"
- Tap chip → modal with logo, org name, role, status, issued date, verified state, link to org profile
- Only `active` affiliations render publicly; revoked disappear immediately (realtime)

## Technical notes

- Affiliation role + org_type as Postgres enums
- All mutating RPCs `SECURITY DEFINER` with `set search_path = public`; every action writes an `affiliation_audit_logs` row
- RLS:
  - `organizations` SELECT public, UPDATE/DELETE only org admins
  - `affiliations` SELECT public when `status='active'`; the invited user and org admins can see their own pending/revoked; INSERT/UPDATE only via RPCs (no direct table writes)
  - `affiliation_audit_logs` SELECT org admins only
- Org profile reuses existing `profiles` row → orgs post reels/posts using the same composer, no code duplication

Confirm and I'll start with Phase 1 (the migration).

# Organization module — audit summary and change plan

## What I found (short version)

The organization backend (tables, RLS, RPCs) is mostly solid. The invite flow is the one thing that's actually broken end-to-end for the user, and it's a **database permissions bug**, not a UI bug. On top of that, there's a chunk of dead/half-built code that's confusing to reason about.

## Root cause of your "This invitation is no longer available" error

Confirmed by reading the live policies:

- Table `public.organization_invites` has a SELECT policy of `is_organization_member(organization_id)`.
- Meaning: only people who are **already** in the organization can read invite rows.
- The invitee — the person the invite is for — is **not yet** a member, so every direct `select()` against `organization_invites` from the invitee returns nothing.

Every code path that opens the invite page or lists incoming invites tries to do a direct select:

- `src/pages/InviteAccept.tsx` line 69-75 (fetch by `invite_token`)
- `src/services/organization/invite.service.ts` `listIncomingForUser` (used by `useIncomingInvites`)
- `src/pages/Notifications.tsx` fallback lookup in `openInvite`

All of them silently return empty for the invitee, so:
- The pending-invites banner on `/notifications` never shows.
- Clicking the org-invite notification hits the "no longer available" fallback.
- Opening `/invite/:token` directly shows "Invitation not found".

The Accept/Decline RPCs (`org_accept_invite`, `org_decline_invite`) are `SECURITY DEFINER` so they'd work — but the user never gets to a screen that has the buttons.

## What to change

### 1. Fix the invite RLS (the actual bug) — required

Add a security-definer RPC + broaden SELECT so an invitee can see their own invite.

- New RPC `public.get_organization_invite_by_token(_token uuid)` — `SECURITY DEFINER`, returns the invite joined with org + inviter profile + role name as a single row. Callable by any authenticated user. This is what `/invite/:token` should call instead of a raw select.
- New RPC `public.list_incoming_organization_invites()` — `SECURITY DEFINER`, returns pending, non-expired invites where `email = auth.jwt() ->> 'email'` OR `username = (select username from profiles where user_id = auth.uid())`. This is what `useIncomingInvites` should call.
- Add a SELECT policy on `organization_invites` so invitees can also read their own rows directly (belt + suspenders, in case something bypasses the RPC): `email = auth.jwt() ->> 'email' OR username = (select username from public.profiles where user_id = auth.uid())`.

Client changes after the migration:
- `InviteAccept.tsx` — replace the direct select block (lines 69-96) with a single `supabase.rpc('get_organization_invite_by_token', { _token: token })` call.
- `invite.service.ts` `listIncomingForUser` — replace select with `rpc('list_incoming_organization_invites')`.
- `Notifications.tsx` `openInvite` — replace the fallback direct select with the same RPC.

### 2. Clean up the invite notification click path — small quality-of-life

- `Notifications.tsx` currently does a two-step "look up token → navigate". Simpler: on click, `nav(/organization-invite/${notification_id})` and let the invite page resolve the invite from `organization_id + auth.uid()` via the new RPC. Optional, keeps URLs stable if someone bookmarks.

### 3. Remove or finish the vaporware "affiliation" branch — pick one

Currently the notification `type` enum contains 6 `affiliation_*` values, and `Notifications.tsx` has icon/text/click handlers for them, but there is no `affiliations` table, no RPC, no code that ever inserts one. It's pure dead surface area.

Two options (I recommend A unless you actually want the feature):

- **A. Remove:** drop the six enum values from `notifications_type_check`, delete the `affiliation_*` branches in `Notifications.tsx` (`iconFor`, `textFor`, the `openInvite` type check).
- **B. Build:** design a real `profile_affiliations` table + `affiliate_user` / `accept_affiliation` RPCs + notification triggers. Bigger scope — separate plan.

### 4. Delete unused organization scaffolds — hygiene

Only if you're not planning to build these soon; otherwise leave them. All are 8-line `// page scaffold. Build feature UI here.` stubs with no logic and no incoming links:

- `src/pages/organization/CreateOrganization.tsx` and its `/organization/create` route in `App.tsx` (the real creation flow is `/onboarding/organization` → `OrganizationOnboarding.tsx`).
- `src/components/organization/forms/CreateOrganizationForm.tsx` (dead export).
- Optionally: `OrganizationAnalytics`, `OrganizationAnnouncements`, `OrganizationCalendar`, `OrganizationDrive`, `OrganizationFeed`, `OrganizationHiring`, `OrganizationNotifications`, `OrganizationProfile`, `OrganizationProjects`, `OrganizationSearch`, `OrganizationTasks` — if you don't have a near-term plan for these. I'd keep `OrganizationProfile` and build it (it's the public-facing org page).

### 5. Consistency fixes — nice to have, low risk

- Rename `is_organization_admin` to be permission-based (`has_org_permission(uid, org, 'organization.manage')`) instead of hardcoded role names `'Owner'/'Administrator'`. Otherwise, custom-named admin roles silently fail RLS while succeeding in RPCs.
- Drop `useMyWorkspaces` in favor of the "canonical" `useUserOrganizations` (only after grepping call sites and updating them).
- Fix duplicate `{/* Affiliated organizations */}` comment in `src/pages/Profile.tsx:545-546`.
- Consider removing the direct `INSERT` policy on `organizations` so all creation must go through `create_organization_workspace` (prevents orphan orgs with no default role/settings/membership).

## Recommended order

1. **Migration:** the two new RPCs + broadened SELECT policy on `organization_invites` (fixes the bug you're actually hitting).
2. **Client:** switch `InviteAccept`, `invite.service.listIncomingForUser`, and `Notifications.openInvite` to the new RPCs.
3. **Cleanup:** remove `affiliation_*` dead code and the unused scaffolds you don't plan to build.
4. **Later:** admin-check consistency, `useMyWorkspaces` dedupe, org insert policy tightening — batch these once the invite flow is stable.

## Technical details

- New RPC skeletons will use `SECURITY DEFINER` with `SET search_path = public`, return `SETOF` a record type, and be granted `EXECUTE` to `authenticated`.
- The broadened SELECT policy uses `auth.jwt() ->> 'email'` (available inside RLS) and a subselect against `public.profiles`; both are safe inside RLS expressions.
- No changes to `org_accept_invite` / `org_decline_invite` — they already work.
- Type regeneration will happen automatically after the migration approves; client edits come after that.

Approve this and I'll do it in that order (migration first, then client, then optional cleanup — I'll pause before the cleanup step so you can pick what to delete).

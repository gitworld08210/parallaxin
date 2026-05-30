## Problem

The `verification_requests` table has RLS:

- `vr_admin_update` — UPDATE allowed only if `has_role(auth.uid(), 'admin')`
- `vr_update_own` — user can only update their own row while `status = 'pending'`

When you flip `approved = true` from the Cloud table editor, the request runs as your authenticated user. Since you have no `admin` row in `user_roles`, the UPDATE is rejected → "Failed to update row".

Once you're an admin, the existing `on_verification_approved_trg` trigger will automatically:
- set `profiles.verified = true` and `verification_kind`
- set `status = 'approved'` and `reviewed_at = now()`
- send a `verification_approved` notification

So you only need to toggle `approved` — don't manually type "Approve" into `status` (the trigger sets it).

## Fix

Insert one row into `public.user_roles` granting `admin` to your account:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('52acf2d9-d278-40ad-ab26-5c65fb52ac88', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

This uses the `supabase--insert` tool (data change, not a schema migration).

## After applying

1. Reopen the row in the table editor.
2. Toggle **approved** to on. Leave `status` and `reviewed_at` alone — the trigger fills them.
3. Click **Save**. The profile's verified badge will turn on automatically.

## Out of scope

- No schema or RLS changes.
- No frontend changes.
- Not building an in-app admin moderation screen (can be a follow-up if you want to stop using the raw table editor).

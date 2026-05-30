## Issue found

You are admin. The update is failing because the approval trigger tries to create this notification type:

- `verification_approved`

But the `notifications` table currently only allows:

- `like`
- `comment`
- `follow`
- `message`
- `mention`

So when you turn `approved` on, the trigger updates the profile and then fails at the notification step because `verification_approved` is blocked by the table rule. That makes the whole row save fail.

## Plan

1. **Fix notification type rules**
   - Update the `notifications` table rule to also allow the app’s existing system notifications:
     - `verification_approved`
     - `verification_revoked`
     - `founder_inducted`
     - `founder_revoked`

2. **Keep the existing approval trigger**
   - Leave the current approval automation in place:
     - turning `approved` on sets profile verified badge
     - sets request `status = approved`
     - sets `reviewed_at = now()`
     - creates the notification

3. **Approve the pending request that failed**
   - After the schema fix, update the pending verification request for `66e6ebe2-f61c-4cb1-beb6-3081faa41e69` to `approved = true`.

4. **Verify**
   - Confirm the request is approved.
   - Confirm the profile has `verified = true` and `verification_kind = gov`.
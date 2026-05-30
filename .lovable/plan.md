# Aurelix — Build Notes

## Verification: how to approve manually

Approvals are **not** automated. To verify a user:

1. Open the backend → `verification_requests` table.
2. Find the pending row for the user.
3. Update `status = 'approved'` and set `reviewed_at = now()`.
4. In the `profiles` table, set `verified = true` for the same `user_id`.

Quick SQL:

```sql
UPDATE public.verification_requests SET status='approved', reviewed_at=now() WHERE user_id='<USER_UUID>';
UPDATE public.profiles SET verified=true WHERE user_id='<USER_UUID>';
```

To reject: `status='rejected'`, leave profile unchanged.

## AI model
`ai-caption` and `ai-moderate` edge functions use `openai/gpt-5.5-pro` via Lovable AI Gateway.

## Reels
Posts have `is_reel boolean`. Feed shows `is_reel=false`, `/reels` shows `is_reel=true`. Compose via `/compose/reel`.

## Stories
24h expiry via `expires_at`. RLS filters expired rows from the public SELECT.

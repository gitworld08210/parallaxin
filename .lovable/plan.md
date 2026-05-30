# Security Fixes Plan

The scan returned 3 findings. Here's how I'll fix each:

## 1. Private account posts publicly readable (ERROR)
The `posts_select_published` RLS policy lets anyone read posts from private accounts. `comments_select_all` has the same issue.

**Fix (migration):**
- Replace `posts_select_published` so private-account posts are only visible to the owner or approved followers.
- Replace `comments_select_all` with a policy that hides comments on posts whose owner is private (unless viewer is owner/follower).

## 2. AI Assistant prompt injection (WARN)
`supabase/functions/ai-assistant/index.ts` forwards the raw `messages` array to the model, allowing injected `system` roles and unbounded size.

**Fix:** Cap to 40 messages, strip non user/assistant roles, truncate content to 4000 chars before forwarding.

## 3. SSRF in suggest-alt-text (WARN)
`supabase/functions/suggest-alt-text/index.ts` forwards any user-supplied `imageUrl` to the AI vision API.

**Fix:** Validate `imageUrl` starts with `${SUPABASE_URL}/storage/v1/object/public/` before forwarding; otherwise return 400.

## Technical details
- One DB migration for the two RLS policy replacements.
- Two edge function edits (auto-deployed).
- No UI or schema-shape changes; no breaking changes for normal users.

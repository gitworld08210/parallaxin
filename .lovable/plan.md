## Goal
Match Instagram behavior: the home Stories rail should only show stories from accounts the current user follows (plus their own "Your story" entry). Today it shows every public, unexpired story from any user.

## Change
Edit `src/components/social/StoriesRail.tsx` `load()`:

1. If no `user`, render only the "Your story" tile (skip query).
2. Fetch the list of accounts the user follows:
   ```ts
   const { data: f } = await supabase
     .from("follows")
     .select("following_id")
     .eq("follower_id", user.id);
   const ids = (f ?? []).map(r => r.following_id);
   ```
3. If `ids.length === 0`, set `groups` to `[]` and return (rail shows only "Your story").
4. Otherwise add `.in("user_id", ids)` to the existing stories query. Self stories are intentionally excluded from the followed list (the "Your story" tile already handles the user's own stories — current code also filters `g.user_id !== user.id`, so behavior is unchanged there).

## Out of scope
- StoryViewer, CloseFriends audience, highlights, notifications.
- No schema or RLS changes (RLS already allows public + close-friend visibility; this is a UI-level filter to match the followed-only product rule).

## Verification
Reload Feed at 420×820 while logged in as the test user — rail should show only "Your story" (since test user follows nobody). Follow another account that has an active story, refresh, confirm that user's ring appears and opens in StoryViewer.

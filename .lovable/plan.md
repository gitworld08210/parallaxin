Align the existing app screens to the attached Aurelix mockup. Visual/presentation changes only — no backend, auth, or data-model changes. Bottom tab nav stays as it is today (user likes current notification/bell icon).

## Screens to update

### 1. Splash & Onboarding (`src/pages/Onboarding.tsx`)

- Full-bleed dark hero with the "creator universe" collage feel.
- Centered title "A New Universe for Creators." + tagline "Create. Connect. Earn. Grow."
- Page-indicator dots, primary red "Get Started" button, secondary "Log In" link.

### 2. Login (`src/pages/Auth.tsx`)

- Netflix-style centered layout: Aurelix logo + "Creator Universe" subtitle.
- Email/Phone + Password inputs, red "Log In" button, "Forgot password?" link.
- "or continue with" divider → Google / Apple / GitHub.
- "New to Aurelix? Sign up" footer.

### 3. Home Feed (`src/pages/Feed.tsx`)

- Top bar: red "AURELIX" wordmark + dropdown caret on left, search + heart on right.
- Stories rail directly under top bar (already exists — restyle ring + "Your story" first item).
- Post card: avatar + name + Aura badge chip on the right, image, action row (heart/comment/share/save), caption with hashtags, time.

### 4. Reels / Shorts (`src/pages/Reels.tsx`)

- Full-screen vertical video container, "Reels" title + camera icon top-left/right.
- Right-side action stack: like count, comments, share — vertically aligned.
- Bottom overlay: @handle + Follow pill, caption, audio strip.

### 5. Messages (`src/pages/Messages.tsx`)

- "Messages" title + compose icon.
- Search bar.
- Segmented tabs: All / Primary (badge) / Requests.
- Conversation rows with avatar, name + verified tick, preview text, time, unread count pill.

### 6. Create / Post (`src/pages/Compose.tsx`)

- Bottom sheet style with "Create" header.
- Three large colored tiles: Post / Reel / Story.
- Full-width red "Live" tile.
- List rows below: Go Live, Camera, AI Video, Upload.

### 7. Post View (`src/pages/PostDetail.tsx`)

- Back chevron + "Post" title.
- Carousel indicator (1/4), caption with hashtags, date.
- Likes / Comments / Shares row, heart/comment/share/save icon strip.

### 8. Search / Discover (`src/pages/Discover.tsx`)

- Rounded search input with placeholder.
- Horizontal filter chips: For you / Trending / Creators / Reels / AI.
- "Trending Now 🔥" section: hashtag chips with post counts.
- "Top Creators" list: avatar + handle + Follow button rows.

### 9. Notifications (`src/pages/Notifications.tsx`)

- "Notifications" title + filter icon on the right (no back chevron).
- Group by **Today / Yesterday** section labels.
- Cleaner row: avatar, one-line message (bold name + light action + inline time), small red unread dot at the far right.
- Remove the small overlay action icon on avatars.

### 10. Profile (`src/pages/Profile.tsx`)

- Header: avatar, display name + verified tick, @handle, three counts (Posts / Followers / Following).
- Bio + secondary line, Edit Profile + Share Profile buttons.
- Highlights rail (rounded thumbnails).
- Tabs: posts grid / reels / tagged.

### 11. Sidebar / Menu (new `src/components/layout/SideMenu.tsx`, opened from top-bar avatar)

- Header: avatar + name + @handle, close button.
- List: My Profile, Creator Hub, Aura Wallet (with balance pill), Saved, Analytics, Settings, Help & Support, Light Mode toggle, request verification.
- Red "Log Out" at the bottom.

## Design tokens (`src/index.css`, `tailwind.config.ts`)

- Confirm pure-black background, white text, signature Aurelix red as primary, soft red glow for shadows/gradients.
- Reuse existing semantic tokens — no hardcoded hex in components.

## Out of scope

- Bottom navigation bar — left as-is.
- Notification icon / bell — unchanged.
- Any backend, schema, RLS, edge function, or auth logic.

## Suggested order

1. Tokens & shared chrome (TopBar, GlassCard) audit
2. Onboarding + Login
3. Feed + Stories rail + PostCard
4. Reels
5. Messages
6. Compose
7. PostDetail
8. Discover
9. Notifications
10. Profile + Side menu
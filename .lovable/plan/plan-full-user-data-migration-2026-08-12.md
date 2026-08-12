---
title: Full User Data Migration (Firebase/Cloudinary)
description: Migrate all user-facing data (Posts, Reels, Stories, Messages, Notifications, Likes) to Firebase and Cloudinary, keeping enterprise/company data on Supabase.
---

# Plan - Full User Data Migration

Migrate all public-facing social data from Supabase to Firebase (Firestore) and Cloudinary (Storage) to optimize for scale and cost.

## User-Facing Changes
- **No visible changes**: The UI remains the same, but data fetching and storage will transition to Firebase/Cloudinary.
- **Improved speed**: Faster media loading via Cloudinary CDN.
- **Reliable Auth**: Seamless Firebase-to-Supabase bridge for Admin OS access.

## Technical Details

### 1. Data Schema Mapping (Firestore)
- **`posts`**: Collection in Firestore containing standard posts, reels, and stories metadata.
- **`likes`**: Sub-collection within each post/reel or global `interactions` collection.
- **`comments`**: Sub-collection within each post.
- **`conversations` & `messages`**: Collections for the WhatsApp-style messaging system.
- **`notifications`**: User-specific notification feed in Firestore.

### 2. Implementation Steps

#### A. Media Migration (Cloudinary)
- Update `ReelCompose.tsx` and `StoryCompose.tsx` to use `uploadToCloudinary` from `src/lib/cloudinary.ts`.
- Update all media display components to handle Cloudinary URLs (already partially done in `Compose.tsx`).

#### B. Content Fetching (Firestore)
- **Feed/Reels**: Update `Feed.tsx`, `Reels.tsx`, and `Discover.tsx` to query Firestore `posts` collection instead of Supabase `posts` table.
- **Messaging**: Refactor `Messages.tsx` and `Conversation.tsx` to use Firestore real-time listeners (`onSnapshot`).
- **Profile**: Update `Profile.tsx` to fetch posts and stats from Firestore.

#### C. Interactions & Social Graph
- Update like/comment/follow logic to write to Firestore.
- Keep `employees` and `admin_*` tables on Supabase for enterprise security.

#### D. Sync & Bridge
- Ensure `firebase-bridge` continues to handle session syncing for Admin OS modules.
- Maintain dual-read during transition if necessary for legacy data.

### 3. Files to Modify
- `src/pages/Reels.tsx`: Switch from Supabase to Firestore `posts`.
- `src/pages/Feed.tsx`: Switch to Firestore.
- `src/pages/Messages.tsx` & `src/pages/Conversation.tsx`: WhatsApp-clone migration.
- `src/pages/ReelCompose.tsx` & `src/pages/StoryCompose.tsx`: Media upload migration.
- `src/pages/Profile.tsx`: Data source update.

# Backend Synchronization & Stability Plan

The application has partially migrated to Firebase and Cloudinary but many critical features still rely on a legacy Supabase backend that is either disconnected or incomplete. This plan will synchronize the remaining features to use Firebase as the primary source of truth, stabilize core social functionality, and ensure overall platform reliability.

## 1. Authentication & Profile Synchronization
- Update `AuthProvider.tsx` to handle profile creation and hydration exclusively from Firestore.
- Refactor `Onboarding.tsx` to save user data primarily to Firestore.
- Synchronize profile updates in `EditProfile.tsx` to dual-write to Firestore and keep Supabase as a secondary administrative mirror.

## 2. Core Social Features Migration
- **Feed & Reels:** Fully transition `Feed.tsx` and `Reels.tsx` to fetch content from Firestore.
- **Posting:** Update `Compose.tsx`, `ReelCompose.tsx`, and `StoryCompose.tsx` to write posts, reels, and stories directly to Firestore.
- **Interactions:** Move Likes, Comments, and Saves to Firestore to prevent "feature not available" errors.
- **Discover:** Refactor `Discover.tsx` to query profiles and trending content from Firestore.

## 3. Communication & Identity Stabilization
- **Messaging:** Ensure `Messages.tsx` and `Conversation.tsx` use the established Firestore-based messaging schema.
- **Virtual World:** Migrate the KYC application flow and access logs to Firestore.
- **Notifications:** Transition the notification system to Firestore for real-time updates and reliability.

## 4. Economic & Enterprise Logic
- **Wallet OS:** Finalize the migration of the atomic ledger and coin balance tracking to Firestore.
- **Organizations:** Ensure workspace discovery and membership checks work reliably with the new architecture.

## Technical Details
- Use `firebase/firestore` for all real-time data needs.
- Continue using `cloudinary` for high-performance media storage.
- Keep `reliableInvoke` for legacy AI processing tasks where Supabase Edge Functions are still the best fit, but ensure they handle authentication gracefully.

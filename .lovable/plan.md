# Fix Profile & TikTok-Style Creation Flow

Redesign the profile and creation flow to follow a TikTok/Instagram logic with a unified "Plus" button experience and fix profile access issues.

## User Review Required

> [!IMPORTANT]
> - The bottom "Plus" button will now open a unified creation sheet (Reels, Posts, Stories, Live) instead of a dedicated "Compose" page.
> - The profile section is being audited to ensure it correctly resolves users via Firestore.

## Proposed Changes

### 1. Unified Creation Sheet (TikTok Style)
- Modify `src/components/layout/MobileNav.tsx` to prevent navigation to `/compose` and instead trigger a stateful modal/sheet.
- Create `src/components/compose/UnifiedCreationSheet.tsx` containing options: **Reel**, **Post**, **Story**, **Go Live**.
- Update icons to match the requested TikTok/Instagram vibe.

### 2. Profile Fixes & Optimization
- Review `src/pages/Profile.tsx` lookup logic to ensure it handles both ID-based and username-based resolution from Firestore consistently.
- Add error boundaries and better loading states for profile sections.

### 3. Reels & UI Refinement
- Update `src/pages/Reels.tsx` and `src/components/social/PostCard.tsx` to strictly follow the 9:16 ratio and Pure Black aesthetic.
- Remove any remaining "X-style" artifacts from these components as requested (merging best of both).

## Technical Details
- Use `framer-motion` for the creation sheet entry/exit.
- Ensure `useAuth` correctly provides the current profile for the creation context.
- Update `src/App.tsx` routes if necessary (e.g., ensuring `/compose` is no longer the primary entry point).
- Verify Firestore queries in `Profile.tsx` don't block the main thread.

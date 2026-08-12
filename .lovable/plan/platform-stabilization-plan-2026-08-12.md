# Platform Stabilization Plan

I have analyzed the hybrid architecture (Firebase + Supabase) and identified potential failure points in the authentication bridge and profile synchronization.

## Proposed Changes

### 1. Auth Bridge Resiliency
- Update `AuthProvider` to handle Supabase bridge failures without blocking the main social feed.
- Implement background re-sync for staff members who need Admin OS access.

### 2. Login Flow Optimization
- Ensure `Auth.tsx` waits for both Firebase and Supabase synchronization before routing staff to Admin OS.
- Improve error reporting for Google/Email signup failures.

### 3. Profile Parity
- Decouple Firestore and Supabase writes during onboarding to prevent a failure in one from blocking the other.

### 4. Backend Verification
- Ensure all necessary Firebase secrets (`FIREBASE_PROJECT_ID`, etc.) are correctly set in the Supabase Edge Function environment.

## Technical Tasks
- **src/contexts/AuthProvider.tsx**: Add bridge retry logic and background synchronization.
- **src/pages/Auth.tsx**: Refine `routeForUser` to handle partial sync states.
- **src/pages/Onboarding.tsx**: Wrap Supabase writes in try-catch to allow social onboarding to proceed even if Admin OS record creation fails.

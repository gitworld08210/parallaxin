# Aurelix Platform Stabilization Plan

Audit and repair the Firebase/Supabase hybrid state to ensure auth, profile sync, and Admin OS function correctly for all users.

## User Experience (Frontend)

- **Auth Sync**: Update `AuthProvider` to ensure every Firebase sign-in triggers a `firebase-bridge` call to hydrate the Supabase session.
- **Profile Parity**: Ensure `Onboarding` saves to both Firestore (primary) and Supabase `profiles` (for RLS/Admin OS).
- **Session Persistence**: Fix the message passcode prompt to persist correctly across logins using the `message_passcodes` table.
- **Unified Navigation**: Ensure the SideMenu correctly reflects employee status by checking both Firebase-linked profile and Supabase employee records.

## Technical Details

- **Sync Triggers**: Add a `useEffect` in `AuthProvider` that calls the `firebase-bridge` Edge Function when `firebaseUser` changes but Supabase `session` is missing.
- **Admin OS Access**: Update `useEmployee` to handle potential delay in Supabase user creation during the first login after migration.
- **Data Integrity**: Implement a "Sync Profile" helper in `src/lib/firebase.ts` that `Onboarding.tsx` and `EditProfile.tsx` use to keep Firestore and Supabase in lockstep.
- **Passcode Fix**: Modify `MessagesPasscodeGate.tsx` to read from Supabase `message_passcodes` as the source of truth, using the Firebase UID as the lookup key.

## Phases

1. **Auth Bridge**: Enforce token sync in `AuthProvider`.
2. **Profile Dual-Write**: Update Onboarding to write to both backends.
3. **Admin OS Resilience**: Graceful handling of missing employee records during sync.
4. **Security & Passcode**: Stabilize the DM lock persistence.

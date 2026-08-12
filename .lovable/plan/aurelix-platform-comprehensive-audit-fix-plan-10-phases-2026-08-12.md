# Aurelix Platform Comprehensive Audit & Fix Plan (10 Phases)

The platform is currently in a complex state due to the hybrid migration between Lovable Cloud (Supabase) and Firebase/Cloudinary. This audit addresses critical login issues and ensures feature parity across all modules.

## Phase 1: Authentication Infrastructure Audit & Google Login Fix
**Status: IN PROGRESS**
- **Audit**: Verified that `Auth.tsx` uses Firebase for Auth but requires a `firebase-bridge` to sync with Supabase for Admin OS access.
- **Problem**: Google login was likely failing at the Supabase level because the provider wasn't enabled in the backend config.
- **Fix**: Enabled Google and Apple social providers via backend tools.
- **Verification**: Check if `firebase-bridge` correctly handles existing Supabase users with the same email.

## Phase 2: User Onboarding & Profile Sync Audit
- **Audit**: Check `Onboarding.tsx` and `OrganizationOnboarding.tsx`.
- **Problem**: Profiles are stored in Firestore, but some legacy Admin OS features query Supabase `profiles`.
- **Fix**: Ensure `AuthProvider` correctly hydrates the Supabase session after Firebase login. Add a trigger or effect to sync critical profile data from Firestore to Supabase `profiles` table for Admin OS visibility.

## Phase 3: Social Feed & Media Delivery Audit
- **Audit**: Review `Feed.tsx`, `Reels.tsx`, and `StoryCompose.tsx`.
- **Problem**: Reels and Stories are now on Firestore/Cloudinary. Check if "Paid Content" logic (coin gates) is correctly enforced in Firestore queries.
- **Fix**: Update Firestore rules to check for `is_premium` and user coins before returning media URLs.

## Phase 4: Messaging & Real-time Communication Audit
- **Audit**: `Messages.tsx` and `Conversation.tsx` (WhatsApp clone).
- **Problem**: Migrated to Firestore. Check if "Passcode" logic (set in Supabase `message_passcodes`) is still integrated correctly with the Firestore message list.
- **Fix**: Update the `MessagesPasscodeGate` to work seamlessly with the Firebase Auth session.

## Phase 5: Wallet OS & Atomic Ledger Audit
- **Audit**: `WalletHome.tsx` and Supabase ledger tables.
- **Problem**: Wallet is the primary system staying on Supabase (Lovable Cloud) for security/RLS. Ensure Firebase UID correctly maps to the Supabase `user_id` in the ledger.
- **Fix**: Verify RLS policies on `wallet_ledger` and `coin_purchases`.

## Phase 6: Admin OS & Department Routing Audit
- **Audit**: `AdminOSGate.tsx`, `useEmployee.ts`.
- **Problem**: Admin OS relies heavily on Supabase RLS. If the Firebase session isn't bridged correctly, Admins lose access.
- **Fix**: Strengthen the `firebase-bridge` to handle token refreshes and edge cases where the Supabase session might expire independently of Firebase.

## Phase 7: Ads Platform (AAP) & Billing Audit
- **Audit**: `CampaignWizard.tsx`, `ads_accounts`.
- **Problem**: Ad creatives are on Cloudinary, but campaign logic is on Supabase.
- **Fix**: Ensure `AdsGate` correctly identifies Organization accounts across both backends.

## Phase 8: Virtual World & Twilio Integration Audit
- **Audit**: `VirtualWorld.tsx` and `virtual-world-send` Edge Function.
- **Problem**: Verify that the Aadhaar KYC (Supabase) correctly unlocks the Twilio interface (Firebase session).
- **Fix**: Sync `virtual_world_access` status to Firestore profile for faster frontend UI gating.

## Phase 9: Recruitment & Payroll Operations Audit
- **Audit**: `OnboardingWizard.tsx`, `PayrollCycles.tsx`.
- **Problem**: PDF generation (Joining Letters/Payslips) is handled by Supabase Edge Functions.
- **Fix**: Ensure these functions can verify the Firebase UID passed in the request header.

## Phase 10: Production Readiness & Deployment Finalization
- **Audit**: Performance check on Cloudinary media and Firestore query indices.
- **Fix**: Add missing Firestore indices for `posts` (ordered by `created_at`) and `profiles` (followers count). Final verify of all secrets.

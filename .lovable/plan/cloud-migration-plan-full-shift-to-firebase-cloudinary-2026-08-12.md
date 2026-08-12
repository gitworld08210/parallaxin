# Cloud Migration Plan: Full Shift to Firebase & Cloudinary

Moving all application data, authentication, and logic away from Lovable Cloud (Supabase) to a unified architecture using Firebase (Auth, Firestore, Storage) and Cloudinary (Media).

## Technical Overview
- **Authentication**: Migrate from Supabase Auth to Firebase Auth (Social & Email).
- **Database**: Shift all relational data from Supabase Postgres to Firebase Firestore (NoSQL).
- **Storage**: Use Cloudinary for all user-generated media (Photos, Videos, Reels) and Firebase Storage for private documents (KYC, Invoices).
- **Backend Logic**: Move Supabase Edge Functions to a centralized Firebase bridge or external server logic.

## Implementation Steps

### Phase 1: Authentication & Profile Synchronization
- Update `AuthProvider.tsx` to remove the Supabase bridge dependency.
- Ensure all profile data (including admin roles) is stored in Firestore `profiles` collection.
- Map Firebase UID to all existing data references.

### Phase 2: Relational Data to Firestore
- Convert Supabase tables to Firestore collections:
  - `posts` (Reels, Stories, Feed) -> `posts` collection.
  - `messages` -> `conversations` and `messages` collections.
  - `wallet` & `transactions` -> `wallets` and `ledger` collections.
  - `ads` -> `campaigns` and `ad_accounts` collections.
  - `hr` & `payroll` -> `employees` and `payslips` collections (Firestore with strict Security Rules).

### Phase 3: Media Migration
- Update all upload components (`Compose.tsx`, `CreateSheet.tsx`, `AdsManager.tsx`) to use the Cloudinary SDK.
- Replace Supabase Storage signed URLs with Cloudinary transformation URLs.

### Phase 4: Removing Supabase Dependencies
- Remove `@supabase/supabase-js` imports where possible.
- Replace `supabase.functions.invoke` calls with direct API calls or Firebase Functions.
- Decommission RLS policies and database triggers in favor of Firestore Security Rules.

## User Impact
- No downtime expected for end-users as logic is swapped component-by-component.
- Improved media loading speeds via Cloudinary CDN.
- Unified real-time experience using Firestore snapshots.

## Technical Details
- **Firestore Schema**: Hierarchical structure for high-performance reads.
- **Security**: Granular Firestore rules to mimic Supabase RLS.
- **Environment**: Critical API keys moved from Supabase secrets to `.env` and Firebase Config.

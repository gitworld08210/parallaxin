# Plan: Aurelix Master Build Implementation

This plan establishes the core architectural foundations for AURELIX as a production-grade, modular ecosystem, focusing on security, data integrity, and internal governance through the Admin OS.

## User Review Required

> [!IMPORTANT]
> This plan involves significant architectural shifts. Please confirm the following:
> 1.  **Auth Sync**: We are currently using Firebase for profiles but Supabase for some Admin functions. This plan will unify permissions in Firestore for consistent RBAC across the vertical mobile app.
> 2.  **Organization Scope**: Do you want "Aurelix" (internal) to be a special type of organization that has access to Admin OS, or keep them strictly separate in the database?

## Proposed Changes

### 1. Identity & RBAC (Security First)
- Implement `roles` and `permissions` collections in Firestore.
- Update `AuthProvider.tsx` to fetch and cache user permissions.
- Create a `usePermissions` hook for client-side gating (while enforcing at the backend).

### 2. Admin OS Modularization
- Refactor the current Admin OS to a department-based architecture (Founder, Finance, Trust & Safety, etc.).
- Implement the "Unified Approval Inbox" at `/admin-os/approvals` to handle multi-department requests.
- Create a standardized `AuditLog` utility to track all privileged actions.

### 3. Economic Infrastructure (Aura Coin)
- Implement a double-entry ledger system in Firestore for Aura Coin.
- Create the "Transaction History" and "Wallet" screens with atomic updates.
- Set up the platform fee structure (15%) as configurable parameters in a `global_config` collection.

### 4. Employee Lifecycle & Passport
- Build the "Employee Passport" as a permanent internal record.
- Implement the hiring flow: `Candidate` -> `Offer` -> `Active` -> `Exited`.
- Restrict sensitive employee data to Founder/HR roles via granular Firestore rules.

## Technical Details

- **Database**: Firestore as primary source of truth for social and identity data. Supabase retained for legacy RLS tasks where required, but moving towards a unified Firebase-native approach.
- **Security**: Security Definer functions (or Firebase Rules equivalents) to prevent unauthorized profile/ledger mutations.
- **Architecture**:
  - `src/lib/ledger.ts`: Core financial logic.
  - `src/hooks/usePermissions.ts`: Hook for checking `profile.role` and `profile.department`.
  - `src/components/admin-os/AuditObserver.tsx`: HOC to log interactions with admin components.

## Impact
- **Security**: Least-privilege access enforced across all modules.
- **Stability**: Atomic transactions for all financial/economic operations.
- **UX**: Unified, 9:16 optimized mobile experience for both users and admins.

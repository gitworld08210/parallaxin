# Plan: Restore Aurelix Core Features & Unified Workspace

The user wants to "restore old Aurelix everything", which refers to the enterprise-grade Admin OS, Wallet OS, and Organization features that were partially fragmented during the Firebase/Cloudinary migration. We will unify the routing, fix broken permissions, and ensure the "Aurelix" branding and premium dark aesthetic are consistent across all modules.

## User Review Required

> [!IMPORTANT]  
> The app is currently set to a s **mobile layout**. Should the Admin OS and Organization workspaces also be forced into this mobile frame, or should they be allowed to expand on desktop for productivity? (I will assume mobile-first within the frame for consistency unless told otherwise).

## Proposed Changes

### 1. Unified Identity & Access Control (RBAC)

- **Fix Admin OS Gate**: Update `src/components/ProtectedRoute.tsx` to properly check for `is_founder`, `is_admin`, or `role` (COO, HR Head, etc.) from Firestore profiles.
- **Grant Access in SideMenu**: Update `src/components/layout/SideMenu.tsx` to show the "Aurelix Admin OS" and "Organization Admin" links based on these permissions.

### 2. Restore Admin OS Modules

- **Verification Queue**: Fix the "Department Routing". Ensure reports go to Trust & Safety, KYC to Virtual World, and financial approvals to Finance.
- **Executive Appointments**: Update the permissions in `AppointmentsPanel.tsx` to allow HR Head and COO to appoint members, and ensure the onboarding sessions are correctly linked.
- **Approvals Inbox**: Re-link the Finance queue to handle coin top-up approvals and ledger updates.

### 3. Restore Wallet OS Economy

- **Atomic Ledger**: Ensure `useWalletLedgerOS` and `useWalletOS` are pulling from the unified Firestore `wallets` and `ledger` collections.
- **Unified Branding**: Standardize the "Aura Coin" terminology and iconography across the wallet and store.

### 4. Organization Workspace

- **Slug-based Routing**: Ensure `/organization/:slug` correctly loads the workspace data from Firestore.
- **Member Management**: Restore the ability to invite members and assign roles within an organization.

### 5. Premium UI/UX Polish

- **Liquid Glass Aesthetic**: Apply the "Pure Black" and high-fidelity glows to the Admin OS and Wallet dashboards to match the Feed.
- **Navigation**: Ensure the SideMenu and MobileNav provide a seamless flow between the Social Feed, Wallet, and Admin OS.

## Technical Details

- **Backend**: Using Firestore as the primary source of truth for all "Aurelix" enterprise data.
- **Routing**: Restoring `src/App.tsx` lazy imports from `NotFound` to their actual page components where available.
- **State**: Using the existing `AuthProvider` and `useOrganizationContext` for permission-based UI rendering.
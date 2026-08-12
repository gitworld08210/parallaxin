# Plan: Fix Payment Operations and Localize to English

## User Feedback
- Coin approval/rejection is failing.
- Postpaid credit and invoice actions might be inconsistent.
- Request for all UI text to be in English (removing Hindi fragments).

## Proposed Changes

### 1. Fix Backend Logic (Supabase RPCs)
- **`finance_review_coin_topup`**: Overhaul to ensure it's truly atomic and bypasses any restrictive triggers on `profiles_private`. It must use `SECURITY DEFINER` and explicitly set `search_path`.
- **Permission Predicates**: Standardize `is_finance_staff` and `is_admin_os_founder` to ensure they accurately reflect the current department keys and roles.

### 2. Standardize UI Language (English Only)
- **`PaymentOperations.tsx`**: Replace all Hindi success/error messages and descriptions with professional English.
- **`FinanceLegalShell.tsx`**: Ensure all labels and breadcrumbs are in English.
- **`Auth.tsx`**: Audit for any leftover localized fragments in routing logic or messages.

### 3. Improve UI Interaction
- **Success Feedback**: Update `toast` notifications to be more descriptive.
- **State Management**: Ensure that after an approval/rejection, the UI local state is immediately updated or re-fetched to prevent stale "busy" states.

## Technical Details
- Create a new migration for the `finance_review_coin_topup` RPC fix.
- Perform a search-replace for common Hindi strings like "nahi hui", "kar diye gaye", etc.
- Verify `is_finance_staff` includes `finance_legal` and `finance` department keys.

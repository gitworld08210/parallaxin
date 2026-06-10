## Plan: Admin-approved QR payment verification

Random UTRs currently get auto-verified and credit creators instantly. We'll change this so UTR submission only queues a tip for **admin review**, and creator balance is credited only after you confirm the payment in your Paytm Business account.

### 1. Database (one migration)

- Replace `verify_tip_with_utr` so it:
  - stores the UTR
  - sets tip `status = 'pending_review'`
  - records `submitted_at`
  - does NOT call `credit_creator`, does NOT notify recipient
  - still rejects duplicate UTRs and non-12-digit input
- Add admin-only RPCs (protected by `has_role(auth.uid(),'admin')`):
  - `admin_approve_tip(_tip_id)` → mark verified, credit creator atomically, notify recipient
  - `admin_reject_tip(_tip_id, _reason)` → mark rejected, store reason, no credit
  - `admin_revoke_tip(_tip_id, _reason)` → for already-verified tips paid by fake UTR: debit the creator balance back and mark rejected
- Allow `'pending_review'` and `'rejected'` in the tips status check constraint if needed.

### 2. Payer UI (`TipSheet.tsx`)

- After UTR submit, show **"Submitted for review"** state (not "Verified"), explaining admin will confirm shortly.
- Update copy on the QR/payment screen to make this expectation clear.

### 3. Admin UI (`/admin/payments`)

- New "Pending QR Payments" section listing tips with `status = 'pending_review'`:
  - sender, recipient, amount, UTR, submitted time
  - Approve / Reject buttons (reject asks for reason)
- New "Recently Verified" section with a **Revoke** action for tips wrongly verified earlier (uses `admin_revoke_tip`).

### 4. Cleanup of bad data

- Provide a one-time admin action in the same UI to revoke any prior tips that were verified by random UTR test entries (using the revoke RPC), so creator balances are corrected.
- Amount goes to creator aura wallet from where he request the payment for account credit 💳 before requesting payment user need to do kyc with Bank account details and and photos id uploaded with Bank passbook this is verify by admin panel after is user can request their payment for withdrawal from wallet is rejected by admin then send notification our team found documents is not proper do kyc again 

### Out of scope

- No Paytm API/webhook integration (your account only allows QR).
- No change to coin purchase or subscription flows.
## Goal
Simplify auth to a single Sign up / Log in surface. Remove the separate "Phone" tab. During signup, the user must verify **at least one** of: email or phone. Both fields are collected; verification of either one unlocks the app.

## Changes

### 1. `src/pages/Auth.tsx` — collapse to 2 tabs
- Remove the `"phone"` tab and all phone-OTP UI from this page.
- Tabs become: **Log in** / **Sign up**.
- Sign-up form fields (in order):
  - Account kind (Personal / Organization) — unchanged
  - Email (required)
  - Phone in E.164 (required)
  - Password (required, 6+)
- On submit:
  - Call `supabase.auth.signUp({ email, password, options: { data: { pending_phone: phone }, emailRedirectTo } })`.
  - Immediately after, invoke `send-phone-otp` so a code is sent to the phone.
  - Route user to the verification gate (they are signed-in-but-unverified, or if email confirmation blocks session, show "check your email" state).
- Log-in tab stays email + password only. Phone-only login is dropped from this screen (kept out of scope per user request to remove the extra section).

### 2. `src/components/auth/EmailVerificationGate.tsx` → rename conceptually to a **Verification Gate**
Show whenever **neither** channel is verified. Dismiss as soon as **one** is verified.

Logic (`useNeedsVerification`):
```
emailVerified = !!user.email_confirmed_at && !isSyntheticPhoneEmail(user.email)
phoneVerified = !!user.phone_confirmed_at   // from auth.users
needsGate     = !(emailVerified || phoneVerified)
```

Gate UI (single screen, two actions):
- Headline: "Verify your account"
- Subtext: "Confirm your email **or** your phone number to continue."
- **Card A — Email**: shows the pending email, "Resend link" button (uses `supabase.auth.resend`). If no email attached (legacy phone-only user), show input to add one.
- **Card B — Phone**: shows the pending phone from `user_metadata.pending_phone` or `user.phone`. Button "Send code" → calls `send-phone-otp`. Then a 6-digit input → calls a new small edge function `verify-signup-phone` that runs Twilio VerificationCheck and, on success, calls `admin.updateUserById(uid, { phone, phone_confirm: true })`.
- Poll `supabase.auth.refreshSession()` every 8s; auto-close when either flag flips true.
- Sign-out link at the bottom (kept).

### 3. New edge function `supabase/functions/verify-signup-phone/index.ts`
- Input: `{ phone, code }` + user's JWT (verify via `admin.auth.getUser(token)`).
- Runs Twilio `VerificationCheck`.
- On approved: `admin.auth.admin.updateUserById(user.id, { phone, phone_confirm: true })`.
- Returns `{ ok: true }`.

### 4. Deprecate the standalone phone signup path
- `verify-phone-otp` edge function stays (used elsewhere/for legacy) but is no longer invoked from Auth.tsx.
- `send-phone-otp` is reused unchanged for the gate's phone verification.

### 5. Copy tweaks
- Gate title/subtitle updated to reflect "either one is enough".
- Sign-up button label unchanged ("Create account").

## Out of scope
- Password reset flow, change-email screen, change-phone screen — unchanged.
- Removing/renaming `verify-phone-otp` function.
- Auth email templates.

## Files touched
- edit `src/pages/Auth.tsx`
- edit `src/components/auth/EmailVerificationGate.tsx` (rework to dual-channel gate)
- create `supabase/functions/verify-signup-phone/index.ts`
- deploy the new function

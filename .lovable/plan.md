## What changes

### 1. Email is mandatory in every signup

- **Email tab** (existing): keep as is — Supabase already blocks sign-in until the confirmation link is clicked.
- **Signup**: add an email field. Flow becomes:
  1. Enter phone + email → tap "Send code" (Twilio OTP goes to the phone).
  2. Enter the 6-digit code → account is created with **both** phone (verified) and email (not yet verified).
  3. User is signed in immediately, but the app shows a full-screen **"Verify your email"** gate on every route until they click the confirmation link. A "Resend email" button is on the gate.



### 3.Password reset via email link 

- New tab on `/reset-password`: "Reset via email".
- Existing "Reset via email" flow stays.

### 4. Verify new email when changing email

- The existing "Change email" screen already calls `supabase.auth.updateUser({ email })`, which triggers a confirmation link to the **new** address. Add clear copy so the user knows the change only takes effect after they click that link, and add a "Resend confirmation" button.

### 5. Add / change phone number with SMS OTP

- New "Phone number" screen under Settings → Security.
- Shows current phone (if any). Enter new number → "Send code" (Twilio Verify) → enter code → edge function verifies and writes the phone onto the user record via admin API.

## Technical bits

- **Auth config**: call `supabase--configure_auth` with `auto_confirm_email: false`.
- **New edge functions** (Twilio Verify + service-role admin API):
  - `reset-password-phone` — verifies OTP, updates password for the user whose synthetic email matches the phone.
  - `change-phone-otp` — verifies OTP, sets phone on the authenticated user (Bearer JWT from client).
  - Update `verify-phone-otp` — accept an optional `email` on first-time signup and store it on the created user (email_confirm=false so the confirmation link is triggered).
- **New client screens/updates**:
  - `src/pages/Auth.tsx` — add email field to Phone tab.
  - `src/pages/ResetPassword.tsx` — add "Reset via phone" tab with OTP + new-password form.
  - `src/pages/security/ChangePhoneScreen.tsx` — new screen; add route + Settings link.
  - `src/components/auth/EmailVerificationGate.tsx` — full-screen gate shown while `user.email_confirmed_at` is null; wraps the authenticated app in `AppShell`.
  - Update `ChangeEmailScreen.tsx` — clarifying copy + "Resend confirmation" button.

## Out of scope

- Custom-branded auth email templates (still uses default Lovable templates).
- 2FA changes (existing TOTP flow untouched).
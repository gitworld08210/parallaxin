# Tier 5 — Security, Privacy & Account Controls

Premium, mythic-consistent security layer for Aurelix. Scaffolds production-grade account safety without breaking the obsidian/aurum aesthetic.

## Scope

### 1. Two-Factor Authentication (TOTP)

- New `SecurityScreen.tsx` under Settings → Security
- "Enable Two-Factor Aura" flow using Supabase `auth.mfa.enroll({ factorType: 'totp' })`
- QR code render (via `qrcode` lib) + 6-digit verification
- Recovery codes list (10 codes) shown once, downloadable as `.txt`
- Disable factor flow with re-auth confirmation
- Status pill in Settings: "Aura Shield: Active / Inactive"

### 2. Login Activity & Sessions

- `LoginActivityScreen.tsx` — lists recent sign-ins
- New table `login_events` (user_id, ip, user_agent, city, created_at)
- Edge function `log-login` called on `SIGNED_IN` auth event (captures UA + IP from headers)
- "Sign out everywhere" button → `supabase.auth.signOut({ scope: 'global' })`
- Mythic styling: each session as a faint constellation node, current session glows aurum

### 3. Data Export

- `DataExportScreen.tsx`
- Edge function `export-user-data` — collects profile, posts, comments, messages, follows, saves, highlights into a single JSON
- Streams as downloadable `aurelix-archive-{date}.json`
- Rate-limited: 1 export per 24h (tracked via `data_export_requests` table)

### 4. Account Deletion

- `DeleteAccountScreen.tsx` — multi-step ritual
  - Step 1: Reason (optional textarea)
  - Step 2: Type username to confirm
  - Step 3: Re-enter password
- Edge function `delete-account` using service role → `auth.admin.deleteUser()` + cascade cleanup
- 7-day soft-delete grace: `profiles.deletion_scheduled_at` column; restore by signing back in
- Cron-style edge function `purge-deleted-accounts` (manual trigger doc'd; not scheduled here)

### 5. Privacy Controls (lightweight additions)

- Private account toggle → `profiles.is_private bool default false`
- Hide read receipts toggle → `profiles.show_read_receipts bool default true` (DM `read_at` writes skipped when off)
- Hide last seen — already have `show_activity`; surface in Privacy panel
- Block list viewer (`BlockedListScreen.tsx`) — reads from `blocks`, unblock action

### 6. Password & Email

- "Change password" → `supabase.auth.updateUser({ password })` with current-password reauth
- "Change email" → `supabase.auth.updateUser({ email })` triggers verification email
-  **Ai features** 
- **Only for premium user** sugges ai features 
- And ai features for normal user 

## Files

**New:**

- `src/pages/security/SecurityScreen.tsx`
- `src/pages/security/TwoFactorSetup.tsx`
- `src/pages/security/LoginActivityScreen.tsx`
- `src/pages/security/DataExportScreen.tsx`
- `src/pages/security/DeleteAccountScreen.tsx`
- `src/pages/security/BlockedListScreen.tsx`
- `src/pages/security/PrivacyScreen.tsx`
- `src/pages/security/ChangePasswordScreen.tsx`
- `src/pages/security/ChangeEmailScreen.tsx`
- `src/components/security/ConstellationSession.tsx`
- `supabase/functions/log-login/index.ts`
- `supabase/functions/export-user-data/index.ts`
- `supabase/functions/delete-account/index.ts`
- 1 migration

**Edited:**

- `src/pages/Settings.tsx` — add Security section with entries
- `src/App.tsx` — new routes
- `src/pages/Conversation.tsx` — respect `show_read_receipts` before calling `mark_conversation_read`
- `src/integrations/supabase/client.ts` — NOT touched (auto-managed)

## Database Migration

```sql
-- login_events
CREATE TABLE public.login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  ip text, user_agent text, city text,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT ON public.login_events TO authenticated;
GRANT ALL ON public.login_events TO service_role;
ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY le_select_own ON public.login_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY le_insert_own ON public.login_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- data_export_requests
CREATE TABLE public.data_export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT ON public.data_export_requests TO authenticated;
GRANT ALL ON public.data_export_requests TO service_role;
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY der_own ON public.data_export_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY der_insert_own ON public.data_export_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- profile additions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_private boolean not null default false,
  ADD COLUMN IF NOT EXISTS show_read_receipts boolean not null default true,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at timestamptz;
```

## Visual Language

- Obsidian `#06070B` base, aurum `#C9A24C` accents
- Sessions render as constellation nodes (no aggressive red warnings — even "danger" zones use restrained ember `#B5533C`)
- Delete account flow uses slow fade transitions, no bouncy springs
- 2FA QR code framed inside an `AuraFrame`

## Dependencies

- `qrcode` (small, ~20kb) for TOTP QR rendering

## Out of scope (deferred)

- Hardware key (WebAuthn) — Supabase MFA doesn't natively support yet
- Admin-side report review dashboard
- Scheduled purge cron (function written; user wires schedule later)

Proceeding to build immediately after this plan.
# Fix: Messages passcode asks to re-setup after re-login

## Problem (verified)
`src/components/messages/MessagesPasscodeGate.tsx` stores the passcode hash + recovery answer in `localStorage` under `msg_passcode:<uid>`. `localStorage` is scoped per origin + per browser, so:

- Signing in on `parallaxai.in` after having set it on the preview origin (or another browser / cleared site data / incognito) returns `null` from `readStored()`.
- The gate then renders the **SetupWizard** and asks the user to create a new passcode, even though the account already has one.

No code path deletes the key on `signOut`, so plain logout-then-login on the same origin/browser works — but any origin/browser change breaks it. That matches the reported symptom.

## Fix approach
Move the source of truth to the backend (per-user), keep `localStorage` only as an optional cache. Same account → same passcode everywhere.

## Backend changes
Add one migration:

- Table `public.message_passcodes`
  - `user_id uuid primary key references auth.users(id) on delete cascade`
  - `hash text not null`               (SHA-256 of passcode, same as today)
  - `question text not null`
  - `answer_hash text not null`        (SHA-256 of lowercased answer)
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`
- `GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_passcodes TO authenticated;`
- `GRANT ALL ON public.message_passcodes TO service_role;`
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
- Policies: `SELECT / INSERT / UPDATE / DELETE` all restricted to `auth.uid() = user_id`. No `anon` grant.
- Trigger to keep `updated_at` fresh on UPDATE.

## Frontend changes — only `src/components/messages/MessagesPasscodeGate.tsx`
- Replace `readStored` / `writeStored` with async Supabase calls against `message_passcodes` (upsert on create/reset, select on gate load).
- Keep the existing SHA-256 hashing untouched (values remain compatible).
- Keep a **read-through cache** in `localStorage` under the same key so warm loads stay instant, but treat the DB as authoritative — on mount, hydrate from DB and overwrite the cache; on write, update DB then cache.
- Show the existing Loader2 spinner while the initial DB fetch is in flight (already handled by the `ready` flag; just gate `setReady(true)` on the DB response).
- No change to the lock UX, the recovery-question flow, the session-unlock behavior, or any other file.

## Migration for existing users
No server-side migration is possible (we can't read old localStorage from SQL). Behavior for people who set a passcode before this fix:

- On any origin where the local cache still exists, the app will **auto-upload** the cached record into `message_passcodes` on first successful unlock (a one-time backfill inside `tryUnlock` after hash match). From then on the DB row wins everywhere.
- On origins with no cache, they'll go through SetupWizard once, then it's DB-backed and stable.

## Not changing
- Hash algorithm, key names in cache, recovery-question wording, keypad UI, `sessionUnlocked` re-lock logic on route change, `AuthProvider`, or any other page. Scope stays inside the passcode gate and one new table.

## Technical notes
- Use `supabase.from('message_passcodes').select('hash, question, answer_hash').eq('user_id', user.id).maybeSingle()`.
- Upsert with `onConflict: 'user_id'`.
- All hashing stays client-side; server only stores the already-hashed values.

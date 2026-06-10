Three separate bugs are causing the failures in your screenshots. Here's what's wrong and the fix for each.

## 1. UTR verification fails — "notifications_type_check"

The `verify_tip_with_utr` RPC inserts a notification with `type = 'tip'`, but the `notifications.type` CHECK constraint only allows `like, comment, follow, message, mention, verification_approved, verification_revoked, founder_inducted, founder_revoked`. Insert is rejected, the whole transaction rolls back, and the tip never gets marked verified.

**Fix:** migration to drop and recreate the check constraint with `'tip'` added.

## 2. QR image broken + UPI ID shown with quotes

The admin save in `PaymentsAdmin.tsx` calls `JSON.stringify(value)` before upserting into `app_config.value` (a `jsonb` column). The Supabase client serializes again, so values are double-encoded:

```
platform_upi_id  = "\"paytmqrqsds0x5sfe@paytm\""
platform_qr_url  = "\"\\\"\\\"\""           ← empty string wrapped twice
```

That's why the tip sheet shows `"paytmqrqsds0x5sfe@paytm"` (with literal quotes) and the QR image is broken (URL is a stringified empty string).

**Fix:**
- `PaymentsAdmin.tsx`: pass raw strings to upsert, no `JSON.stringify`.
- Migration: rewrite the three existing rows to clean string values.
- Re-upload your QR after the fix (the previous upload saved an empty URL).

## 3. AI caption / moderation — "Edge Function returned a non-2xx status code"

`ai-caption`, `ai-moderate`, and `ai-assistant` all use `model: "openai/gpt-5.5-pro"`, which is not a valid Lovable AI Gateway model. The gateway returns an error, the function returns non-2xx, and `supabase.functions.invoke` throws.

**Fix:**
- Switch those three functions to `google/gemini-2.5-flash` (the standard free default; the same model already used in `suggest-alt-text` and `ai-post-suggestions`).
- Make moderation non-blocking on errors in `Compose.tsx` so a flaky AI call can never stop a user from posting.

## Technical changes

**Migration**
- `ALTER TABLE notifications DROP CONSTRAINT notifications_type_check`, recreate with `'tip'` added.
- `UPDATE app_config` to set `platform_upi_id`, `platform_qr_url`, `platform_payee_name` to clean string values (strip the extra JSON wrapping).

**Edge functions**
- `supabase/functions/ai-caption/index.ts` — model → `google/gemini-2.5-flash`.
- `supabase/functions/ai-moderate/index.ts` — model → `google/gemini-2.5-flash`.
- `supabase/functions/ai-assistant/index.ts` — model → `google/gemini-2.5-flash`.

**Frontend**
- `src/pages/admin/PaymentsAdmin.tsx` — upsert plain strings (no `JSON.stringify`).
- `src/components/social/TipSheet.tsx` — defensively strip surrounding quotes when reading current (possibly still cached) values.
- `src/pages/Compose.tsx` — wrap the `ai-moderate` call so it never blocks publishing if the function errors.

After these land you'll need to re-open `/admin/payments` and re-upload your QR image once (the old upload stored an empty URL).

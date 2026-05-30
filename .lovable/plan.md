# Get Verified — Backend + UI plan

Scope: rebuild the verification flow to match screens 6 (Verification Center) and 7 (5-step Request wizard). Backend extended to support 5 categories. Eligibility = always eligible (any logged-in user can apply). Badges image is design reference only — not implemented as a system.

## 1. Database changes (one migration)

Extend the existing `verification_requests` table — no new tables needed.

```sql
-- Allow the 5 wizard categories
ALTER TABLE public.verification_requests
  DROP CONSTRAINT IF EXISTS verification_requests_category_check;

ALTER TABLE public.verification_requests
  ADD CONSTRAINT verification_requests_category_check
  CHECK (category IN ('government','founder','public_figure','business','media'));

-- New fields the wizard collects
ALTER TABLE public.verification_requests
  ADD COLUMN IF NOT EXISTS organization text,
  ADD COLUMN IF NOT EXISTS official_email text,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS supporting_doc_url text;
```

Existing trigger `on_verification_approved_trg` keeps working — it writes `profiles.verified = true` and `profiles.verification_kind = category` on admin approval, and creates a notification. Nothing to change there.

Storage bucket `verification-docs` (private) is reused for both the ID doc and the optional supporting doc, under `<user_id>/...`.

## 2. UI — two new screens replacing current `/verification`

### Screen A — `/verification` (Verification Center, matches screen 6)
- Header: back button + "Verification Center" + bell
- Hero card: shield illustration, "Get Verified on Aurelix", subtitle, **Request Verification** CTA → `/verification/request`
- "Your Verification" status list:
  - **Status** — `Not Verified` / `Pending` / `Verified` (read from `verification_requests` + `profiles.verified`)
  - **Eligibility** — always "You are eligible to apply" (per your choice)
  - **Benefits** — static line "Stand out, get discovered"
- "Learn more about verification" link at bottom (static info sheet, no route change)
- If user already has `status='pending'` → CTA becomes disabled "Under review", request screen blocks resubmit
- If `profiles.verified=true` → hero shows verified state with their badge kind

### Screen B — `/verification/request` (5-step wizard, matches screen 7)
Step indicator pills `1 2 3 4 5` at top. Back button cancels to Center.

1. **Select Type** — 5 cards: Government / Official, Founder, Public Figure, Business / Brand, Media / Journalist. Radio selection.
2. **Identity** — full legal name, country (text), date of birth (optional)
3. **Proof** — upload ID document (required, image/PDF) → `verification-docs/<uid>/id-<uuid>.<ext>`
4. **Context** — organization (optional), official email (optional), reason textarea, reference links (one per line), optional supporting doc → `verification-docs/<uid>/support-<uuid>.<ext>`
5. **Review & submit** — read-only summary + Submit button → `INSERT` into `verification_requests` with `status='pending'`, then redirect to Center showing "Under review"

Each step has Next / Back. Validation per step; Next disabled until required fields filled.

## 3. Files

**New**
- `src/pages/VerificationCenter.tsx` — screen 6
- `src/pages/VerificationRequest.tsx` — screen 7 wizard (single file, internal step state)

**Edit**
- `src/App.tsx` — replace `/verification` route, add `/verification/request`
- `src/components/layout/SideMenu.tsx` — "Verification Center" row → real route (remove "Soon")
- `src/lib/mock.ts` — extend `VerificationKind` enum if used elsewhere

**Delete / archive**
- Old `src/pages/Verification.tsx` — replaced by Center + Request

## 4. Out of scope (explicitly)

- The 13-badge artwork system from the second image (design reference only)
- Aura Level, Achievements, Monetization, Analytics, Creator Hub pages (separate phase)
- Admin approval UI (admin still approves via DB / existing flow)
- Eligibility rules — always eligible for now

---

Reply **"go"** to start. Migration runs first (needs your approval), then UI.

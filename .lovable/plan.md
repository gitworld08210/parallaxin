# Phase 4.7 — Executive Appointment Flow (Founder → C-Suite) with Gmail Joining Letter PDF

Founder Office se Co-Founder + all C-level heads (HR, CTO, CFO, COO, CSO, CPO, GC, Head of T&S, Head of Verification, Head of Support) ko one-click appoint. System auto employee ID + random temp password generate karega, ek beautifully designed **PDF joining letter** banayega, aur founder ke connected Gmail account se executive ki personal email par PDF attachment ke saath bhejega. Founder ko screen pe bhi ek-baar copy of credentials milega as fallback.

## Employee ID scheme

- Founder: `AURE-F01` (existing `AUR-FND-177051` → migrate to `AURE-F01`)
- Co-Founder: `AURE-F02`
- All hired: `AURE001`, `AURE002`, `AURE003`, … (Postgres sequence, race-safe)
- Manual employee_number input hata denge; server auto-generate.

## Founder Office — Executive Appointments panel

Route: `/admin-os/founder-office/appointments`. Founder-only (role check + RLS).

- Pre-defined C-level slot cards: Co-Founder, HR Head, CTO, CFO, COO, CSO, CPO, General Counsel, Head of T&S, Head of Verification, Head of Support.
- Status per slot: Vacant / Appointed / Suspended. Appointed dikhaye person + employee ID + joining date.
- "Appoint" button → modal (full name, personal email address, phone, joining date, notes).
- CTA card on Founder Office Dashboard.

## Gmail Connector setup

- Connect Gmail via `standard_connectors--connect` (connector_id `google_mail`). Scopes needed: `gmail.send` for sending, `gmail.compose` for drafts fallback.
- Founder connects his Google account once. Sender identity = founder's Gmail address.
- Env vars available in edge functions: `LOVABLE_API_KEY`, `GOOGLE_MAIL_API_KEY`.

## `appoint-executive` edge function

Steps (service role):
1. Verify caller is active founder.
2. Ensure department + role exist for slot; reject if slot already has active head.
3. Generate 20-char temp password.
4. Create `auth.users` (email_confirm true, metadata full_name).
5. Insert into `employees`: auto `employee_number`, `user_type = 'executive'`, `level = 'L6'`, `employment_status = 'active'`, `requires_password_change = true`, `requires_2fa_setup = true`, reporting to founder.
6. Insert into `user_roles`.
7. Generate joining-letter PDF server-side (using `pdf-lib` via npm specifier in Deno) with Aurelix branding: logo mark, header "Aurelix — Letter of Appointment", executive name, employee ID, role, department, joining date, effective from, welcome paragraph, terms footer, signatures block. First-login URL, temp password inside a boxed "Confidential Access Details" section.
8. Upload PDF to Storage bucket `joining-letters` (private) at `appointments/<employee_number>.pdf`. Return signed URL (30-day) for founder's fallback download.
9. Build RFC 2822 MIME message with multipart/mixed: text/html body (short welcome + note that attached PDF has details) + PDF attachment (base64). Post to Gmail API `users/me/messages/send` via gateway.
10. Insert into `executive_appointments` audit + `admin_audit_logs`.
11. Return `{ employee_number, email_sent: true, gmail_message_id, pdf_signed_url, temp_password }` (temp_password shown once as fallback if user prefers to hand over securely).

## Frontend appointment result modal

- Success: "Joining letter emailed to <personal_email> from <founder's gmail>" + "Download PDF copy" button + "Reveal credentials" toggle (masked temp password, copy button). Warning: "Credentials not shown again."
- On email failure: PDF download + credentials block prominent, retry-email button.

## People Ops gating

- `EmployeeForm`: employee_number auto/readonly.
- Non-founder create disabled with tooltip when HR Head slot is Vacant. Founder unrestricted.

## Storage

- Private bucket `joining-letters`; RLS: founder + owning executive can read; admin write via service role only.

## Database migration (single)

1. `CREATE SEQUENCE employees_hire_seq;`
2. `CREATE FUNCTION gen_employee_number()` returning `'AURE' || lpad(nextval::text, 3, '0')`.
3. Backfill existing rows to `AURE-F01`, `AURE001`, `AURE002`, `AURE003`. Reset sequence to 4.
4. `admin_user_type` enum: add `executive` if missing.
5. New table `executive_appointments` (slot_key, employee_id, appointed_by, personal_email, appointed_at, revoked_at, gmail_message_id, pdf_path, notes) with GRANTs + RLS + policies.
6. Seed missing C-level `admin_departments` + `admin_roles`.

## Files

Add:
- `supabase/functions/appoint-executive/index.ts`
- `supabase/functions/_shared/joining-letter-pdf.ts` (PDF builder using pdf-lib)
- `supabase/migrations/<ts>_executive_appointments.sql`
- `src/pages/admin-os/founder-office/AppointmentsPanel.tsx`
- `src/pages/admin-os/founder-office/AppointmentModal.tsx`
- `src/pages/admin-os/founder-office/AppointmentResultDialog.tsx`
- `src/hooks/admin-os/useAppointments.ts`

Edit:
- `src/App.tsx` (new route + sidebar link).
- `src/pages/admin-os/founder-office/FounderOfficeDashboard.tsx` (CTA card).
- `src/pages/admin-os/people-ops/EmployeeForm.tsx` (auto employee_number + HR-Head guard).
- `supabase/functions/seed-founder/index.ts` (new founders → `AURE-F01`).

## Pre-build steps (need user action once)

1. Connect Gmail via `standard_connectors--connect` (I'll trigger the dialog).
2. Create Storage bucket `joining-letters` (I'll do it via tool).

## Verification

- Playwright login as founder → appoint HR Head with real personal email → check Gmail Sent folder for email with PDF attached → open PDF confirms branding + AURE001 + temp password.
- Logout, login with HR Head creds → forced password change screen.
- `psql`: employee_number order = `AURE-F01`, `AURE001`, `AURE002`, `AURE003`, `AURE004` (new HR Head).

## Out of scope

- Auth email templates (unchanged, using Lovable defaults).
- Accept/decline flow — direct joining letter as agreed.
- Bulk / re-appointment flows — future phase.

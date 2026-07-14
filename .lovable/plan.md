
## Problem

User-facing submissions and the admin-os department queues are running on two disconnected tables. Nothing bridges them, so departments never see the work:

| User submits from | Writes to | Admin-os department reads from | Currently linked? |
|---|---|---|---|
| `/verification` (Verification.tsx) | `verification_requests` | Verification dept → `ver_applications` / `ver_documents` / `ver_reviews` | No |
| `ReportSheet` (post/profile/etc.) | `reports` | Trust & Safety dept → `ts_cases` / `ts_evidence` | No |
| KYC flow | `kyc_submissions` | Verification / Finance dept | No |

The old admin page `VerificationRequestsAdmin.tsx` still exists but isn't wired into the department workspace, so department members with the right role never see any of it.

## Fix

Introduce a routing layer that mirrors every new user submission into the corresponding admin-os department table, using the two-client edge-function pattern (user client validates the submission via RLS, service-role client inserts the department record so it bypasses RLS safely).

### 1. Edge functions (new)

- `route-verification-request` — on submit, reads the `verification_requests` row with the user client, then inserts a matching `ver_applications` row (+ copies uploaded docs into `ver_documents`, initial `ver_history` "submitted" entry) with the service-role client. Stores the new `ver_applications.id` back on the source row.
- `route-report` — reads the `reports` row, creates a `ts_cases` row (category mapped from the report reason, severity default `low`, status `new`), copies target ref into evidence, seeds `ts_case_timeline`.
- `route-kyc-submission` — reads `kyc_submissions`, creates the equivalent Verification-department application record and attaches KYC documents.

Each function:
- Requires `Authorization` header (user JWT).
- Uses the user client to `select` the row (RLS proves the caller owns it).
- Uses the service-role client to insert into the department tables and to write the linkage id back.
- Returns `{ ok: true, application_id | case_id }`.

Config: add each function to `supabase/config.toml` with `verify_jwt = true`.

### 2. Client wiring

- `src/pages/Verification.tsx` — after the insert into `verification_requests`, call `supabase.functions.invoke("route-verification-request", { body: { id } })`. On failure, surface a toast but keep the submission (function is retryable).
- `src/components/social/ReportSheet.tsx` — after inserting into `reports`, call `route-report`.
- KYC submit path (whichever page writes to `kyc_submissions`) — call `route-kyc-submission`. Locate the exact file during build (grep `kyc_submissions` insert).

### 3. Schema additions (migration)

Small, additive only:
- `verification_requests.ver_application_id uuid` (nullable) — linkage.
- `reports.ts_case_id uuid` (nullable).
- `kyc_submissions.ver_application_id uuid` (nullable).
- Optional index on each new column.

No RLS changes to the source tables; the department tables already have their own RLS. The service-role client bypasses RLS for the routed insert, which is safe because we validated ownership on the user client first.

### 4. Backfill

One-time SQL in the same migration: for existing `verification_requests` / `reports` / `kyc_submissions` rows with no linkage, insert corresponding department rows. Runs as the migration role (service-level), so RLS is not an issue.

### 5. Verification after build

- Submit a verification request as a normal user → confirm a new `ver_applications` row appears in the Verification department queue.
- File a report → confirm a `ts_cases` row appears for Trust & Safety.
- Submit KYC → confirm it appears in the Verification/Finance queue.
- Check that department members with the appropriate admin-os role can see and act on each item.

## Out of scope

- Redesigning the department UIs.
- Removing the legacy `VerificationRequestsAdmin.tsx` / `ReportsAdmin.tsx` pages (kept as a superadmin fallback for now).
- Changing how KYC documents are stored.

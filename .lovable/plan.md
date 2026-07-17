## Plan: Big-tech style Admin OS request routing

I’ll make every user-side submission automatically land in the right Admin OS department, with a reliable backend route instead of relying on client-side “fire and forget” calls.

### What will be routed

- **User verification requests** → Verification Department queue
- **Creator KYC submissions** → Verification Department queue, with finance-safe metadata for payout readiness
- **User reports** → Trust & Safety case queue
- **Creator payout / withdrawal requests** → Finance & Legal payout queue
- Existing un-routed old records will be **backfilled** so they appear in Admin OS too.

### Backend routing reliability

- Add an idempotent backend routing layer so inserts automatically create the right internal work item.
- Keep existing edge routes as compatibility, but make the backend the source of truth.
- Add routing status fields where needed, especially for payout requests, so each record can be traced.
- Emit Admin OS activity events for each routed item: submitted, routed, assigned, reviewed.
- Create/repair platform assignment visibility so the correct department can see department-assigned work, not only founder/admin roles.

### Department queues

- **Verification**: show user verification and KYC items in the existing application queue with source labels, priority, SLA, and user/metadata summary.
- **Trust & Safety**: show user reports as official cases with source, target type, severity, and triage state.
- **Finance & Legal**: add a professional **Creator Payouts** queue for payout requests with amount, method, status, risk/KYC signal, approve/reject actions, and audit trail.
- Add counts/badges on department tabs where useful so pending work is visible immediately.

### Professional operating-system polish

- Add an **Admin OS Intake** overview section/card showing cross-department live work:
  - Pending verification
  - Pending KYC
  - New reports
  - Pending payouts
  - SLA / priority status
- Use existing Admin OS styling and permission model; no separate admin panel look.
- Add empty states, loading states, and clear error states.
- Keep sensitive fields compact and only visible inside permission-gated department views.

### Technical details

- Database migration:
  - Add missing payout routing metadata columns if needed.
  - Add/replace routing functions/triggers for `verification_requests`, `kyc_submissions`, `reports`, and `payout_requests`.
  - Backfill any rows that already exist but are not linked to internal Admin OS work items.
  - Update RLS/policies for `platform_assignments` so members of the assigned department can read relevant work.
- Functions:
  - Harden existing route functions to emit activity/assignment records and stay idempotent.
- Frontend:
  - Update Verification, Trust & Safety, Finance & Legal, and Admin OS overview pages/hooks to surface routed work cleanly.
- Verification:
  - Run typecheck/build and verify the main Admin OS queues render without runtime errors.
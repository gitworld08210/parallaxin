# Phase 1.12 — Core Platform Engines

Ten reusable engines that every Admin OS module consumes. No department-specific logic inside engines. Built incrementally in three shippable waves so the app never breaks.

## Scope

Engines: Approval, Workflow, Notification, Global Search, Assignment, Reporting, Dashboard, Activity Feed, File/Document, Scheduler.

Every engine ships with: DB tables (RLS + GRANTs + audit), a typed service layer (`src/services/platform/<engine>.ts`), a React hook (`src/hooks/platform/use<Engine>.ts`), and a reusable UI surface under `src/components/platform/<engine>/` + a console page under `src/pages/admin-os/platform/<engine>/`.

All engines integrate with existing RBAC (`has_role`, admin permissions), `admin_audit_logs`, and existing `notifications` table where possible (extended, not duplicated).

## Wave 1 — Foundations (governance backbone)

1. **Approval Engine**
   - Tables: `platform_approval_requests`, `platform_approval_steps`, `platform_approval_decisions`.
   - Generic: any module submits `{module, entity_type, entity_id, payload, workflow_id}`; approvers act via reusable Approval Center.
   - UI: `/admin-os/platform/approvals` inbox + `<ApprovalPanel entityType entityId />` embeddable.

2. **Workflow Engine**
   - Tables: `platform_workflows`, `platform_workflow_steps`, `platform_workflow_runs`, `platform_workflow_run_steps`.
   - JSON-defined steps (approval / notification / assignment / script). Approval Engine consumes workflows.
   - UI: read-only workflow viewer now; drag-drop editor stub for later.

3. **Notification Engine**
   - Reuse existing `notifications` table; add `platform_notification_channels`, `platform_notification_preferences`, `platform_notification_templates`.
   - Service: `notify({recipient, template, data, channels})`. Every other engine calls this — no direct inserts.
   - UI: Notification Center dropdown + `/admin-os/platform/notifications` settings.

4. **Activity Feed Engine**
   - Table: `platform_activity_events` (actor, verb, object_type, object_id, department_id, visibility, metadata).
   - Reusable `<ActivityTimeline filters />` and `/admin-os/platform/activity` global feed. Realtime via Supabase channel.

## Wave 2 — Work distribution & data access

5. **Assignment Engine**
   - Tables: `platform_assignments`, `platform_assignment_rules`.
   - Manual + rule-based (round-robin, load-based, department). AI-assisted stub.
   - UI: `/admin-os/platform/assignments` queue + `<AssignmentBadge />`.

6. **Global Search Engine**
   - Table: `platform_search_index` (object_type, object_id, title, body, tags, department_id, permission_key) + `tsvector` + GIN index.
   - Triggers on employees, departments, `admin_audit_logs`, approvals, workflows, documents keep it in sync.
   - RPC `platform_search(query, filters)` respects RBAC. UI: global ⌘K palette + `/admin-os/platform/search`.

7. **File & Document Engine**
   - Storage bucket `platform-documents` (private) + tables `platform_documents`, `platform_document_versions`, `platform_document_permissions`.
   - Version history, ownership, per-doc ACL. UI: `/admin-os/platform/documents` manager + `<DocumentPicker />`.

## Wave 3 — Insight & automation

8. **Reporting Engine**
   - Tables: `platform_report_definitions`, `platform_report_runs`.
   - Definitions declare data source (view/RPC), columns, filters, schedule. CSV export via edge function.
   - UI: `/admin-os/platform/reports` browse/run/export.

9. **Dashboard Engine**
   - Tables: `platform_dashboards`, `platform_dashboard_widgets`, `platform_widget_catalog`.
   - Widgets are typed components registered in a client-side catalog; dashboards assemble them per department. Existing dashboards migrated to use widgets.
   - UI: `<DashboardCanvas dashboardId />` + `/admin-os/platform/dashboards` editor.

10. **Scheduler Engine**
    - Tables: `platform_scheduled_jobs`, `platform_scheduled_job_runs`.
    - Backed by `pg_cron` + `pg_net` calling a single `platform-scheduler-tick` edge function that dispatches due jobs (reports, reminders, cleanup, notification digests).
    - UI: `/admin-os/platform/scheduler` console.

## Cross-cutting rules applied to every engine

- **RLS + GRANTs** on every new public table (authenticated + service_role; admin-scoped via `has_role` / admin permissions).
- **Audit**: engine services write to `admin_audit_logs` automatically via helper `logAdminAction`.
- **Realtime**: `ALTER PUBLICATION supabase_realtime ADD TABLE ...` for approvals, notifications, assignments, activity events, dashboard-driving tables.
- **APIs**: each service exposes `create / get / list(filter,sort,page) / update / remove` where allowed; permission checks via existing `ADMIN_PERMISSIONS`.
- **Errors**: standardized `PlatformError` with code + user-safe message; hooks surface via toast.
- **No department logic**: engines only know generic `module` + `entity_type` + `entity_id`.

## File layout (new)

```text
src/
  services/platform/{approval,workflow,notification,search,assignment,reporting,dashboard,activity,document,scheduler}.ts
  hooks/platform/use{Approvals,Workflows,Notifications,...}.ts
  components/platform/{approval,workflow,notification,search,assignment,reports,dashboard,activity,documents,scheduler}/*
  pages/admin-os/platform/{approvals,workflows,notifications,search,assignments,reports,dashboards,activity,documents,scheduler}/*
supabase/functions/
  platform-scheduler-tick/index.ts
  platform-report-run/index.ts
```

Routes registered under existing `/admin-os` layout, gated by admin permissions. Sidebar gets a new "Platform" section.

## Delivery order (one migration + code batch per wave)

1. Wave 1 migration → services/hooks/UI → wire into existing HR/Founder/Audit modules.
2. Wave 2 migration → services/hooks/UI → migrate existing search/file usage.
3. Wave 3 migration + edge functions + pg_cron → migrate existing dashboards to widget engine.

## Technical notes

- Search uses Postgres `tsvector`; no external service.
- Workflow steps stored as JSONB with a discriminated union type in TS.
- Dashboard widgets are React components keyed by `widget_type` string; catalog lives client-side, DB stores only config.
- Scheduler tick edge function runs every minute via `pg_cron` + `pg_net`, invoked with anon key + internal shared secret.
- All new tables get `created_at`/`updated_at` + `update_updated_at_column` trigger, soft-delete via `deleted_at` where the spec calls for it (documents, workflows, dashboards, reports, jobs).

## Out of scope (explicit)

- Push notifications, email delivery integration (Notification Engine leaves channel adapters as stubs).
- Drag-and-drop workflow/dashboard editors (viewer + JSON editor only; UX stub for later phase).
- AI-assisted assignment (interface only).

Approve to start with Wave 1 (Approval + Workflow + Notification + Activity Feed).

# Phase 2.5 — Organization Structure & Workforce Planning

Builds the shared org-planning layer on top of the existing People Ops foundation. Every view is generated from live `employees` + `admin_departments` data, plus four new planning tables. No new recruitment/payroll surface.

## New database tables (single migration)

All in `public` with RLS, GRANTs, `updated_at` triggers, and audit-log writes.

- `department_capacity` — one row per `admin_departments`, holds `max_capacity`, `target_capacity`, `workload_score`, `notes`, `updated_by`.
- `open_positions` — hiring requests: `department_id`, `role_id`, `level`, `title`, `reason`, `priority` (low/med/high/critical), `status` (draft/pending_approval/approved/filled/cancelled), `requested_by`, `approved_by`, `expected_joining`, `filled_by_employee_id`, `notes`.
- `succession_plans` — one row per critical position: `scope` (department_head/deputy_head/team_lead/specialist), `department_id`, `incumbent_employee_id`, `primary_successor_id`, `secondary_successor_id`, `readiness_level` (not_ready/dev_1y/dev_6m/ready_now), `training_progress` (0–100), `notes`.
- `workforce_forecasts` — per-department planning windows: `department_id`, `period_start`, `period_end`, `planned_headcount`, `notes`.

Access: read = `is_active_employee(auth.uid())` + `people_ops.org.view`. Write = `has_admin_permission(auth.uid(), 'people_ops.org.manage')`. Add five new permission keys to `admin_permissions` and register them in `permissions.ts`.

## Backend service — `src/hooks/admin-os/useOrganization.ts`

Reusable hooks for every page:

- `useOrgChart()` — pulls active employees, department heads, and departments; returns tree grouped Founder Office → Departments → Heads → Deputies → Team Leads → Employees.
- `useDepartmentCapacity()` — joins departments with `department_capacity`, computed columns: current headcount, vacancies, capacity %, health score (green/amber/red bands).
- `useOpenPositions()` + `useUpsertPosition()` / `useTransitionPositionStatus()` — CRUD with audit.
- `useSuccessionMatrix()` + `useUpsertSuccession()`.
- `useWorkforceForecast()` + `useUpsertForecast()`.
- `useOrganizationalHealth()` — aggregates department stability, leadership coverage, open positions, and capacity utilisation into one dashboard payload.

Every mutation writes to `admin_audit_logs` (module `people_ops`, actions `org.capacity.updated`, `org.position.*`, `org.succession.updated`, `org.forecast.updated`).

## Frontend pages — `src/pages/admin-os/people-ops/org/`

All built on the Phase 1.13 Design System (`PageHeader`, `SectionCard`, `StatCard`, `DataTable`, `StatusBadge`, `ConfirmDialog`).

- `OrganizationIndex.tsx` (`/admin-os/people-ops/org`) — Organizational Health dashboard: leadership coverage, open positions, capacity utilisation, hiring-need alerts, quick links to sub-pages.
- `OrgChart.tsx` (`/admin-os/people-ops/org/chart`) — expandable company tree; search, department filter, expand/collapse-all, print-friendly layout.
- `CapacityDashboard.tsx` (`/admin-os/people-ops/org/capacity`) — table per department: current/max/target headcount, vacancy count, capacity %, health colour, inline edit for `max_capacity` and `target_capacity`.
- `OpenPositions.tsx` (`/admin-os/people-ops/org/positions`) — center for hiring requests: filter by status/department/priority; create/edit dialog; status transitions with reason (audit-logged).
- `Succession.tsx` (`/admin-os/people-ops/org/succession`) — matrix per critical role: incumbent → primary/secondary successor pickers, readiness dropdown, training-progress slider.
- `WorkforcePlanning.tsx` (`/admin-os/people-ops/org/planning`) — forecast timeline per department: current vs planned headcount, editable period rows.

## Wiring

- `src/App.tsx` — lazy-import six new pages under the People Ops routes.
- `src/pages/admin-os/people-ops/PeopleOpsIndex.tsx` — add "Organization" quick-link.
- `src/features/admin-os/modules.config.ts` — no new top-level module; org lives inside People Ops.
- `src/features/admin-os/permissions.ts` — add `PEOPLE_OPS_ORG_VIEW`, `PEOPLE_OPS_ORG_MANAGE`, `PEOPLE_OPS_CAPACITY_MANAGE`, `PEOPLE_OPS_POSITIONS_MANAGE`, `PEOPLE_OPS_SUCCESSION_MANAGE`.

## Not in scope

Recruitment, payroll, attendance, performance reviews, and any external job-board publishing. Open positions are internal hiring requests only.

## Definition of done

Migration + audit triggers applied, five pages navigable, RBAC gates enforced, every mutation audited, org chart reflects live `employees` data, capacity/health computed live, existing People Ops flows untouched.

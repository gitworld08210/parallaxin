/**
 * Aurelix Admin OS — permission registry.
 *
 * Single source of truth for permission keys. Never hardcode raw strings
 * anywhere else. Server-side RLS + `has_admin_permission()` is the actual
 * authority; this catalog powers UI gates and navigation only.
 */
export const ADMIN_PERMISSIONS = {
  ADMIN_OS_ACCESS: "admin_os.access",

  PEOPLE_OPS_EMPLOYEES_VIEW: "people_ops.employees.view",
  PEOPLE_OPS_EMPLOYEES_MANAGE: "people_ops.employees.manage",

  TRUST_SAFETY_REPORTS_VIEW: "trust_safety.reports.view",
  TRUST_SAFETY_REPORTS_ACT: "trust_safety.reports.act",

  VERIFICATION_REQUESTS_VIEW: "verification.requests.view",
  VERIFICATION_REQUESTS_ACT: "verification.requests.act",

  FINANCE_PAYOUTS_VIEW: "finance.payouts.view",
  FINANCE_PAYOUTS_APPROVE: "finance.payouts.approve",

  SUPPORT_TICKETS_VIEW: "support.tickets.view",
  SUPPORT_TICKETS_ACT: "support.tickets.act",

  ENGINEERING_TOOLS_VIEW: "engineering.tools.view",

  SECURITY_AUDIT_VIEW: "security.audit.view",
  SECURITY_SESSIONS_REVOKE: "security.sessions.revoke",

  ORGANIZATIONS_VIEW: "organizations.view",
  ORGANIZATIONS_MANAGE: "organizations.manage",

  CREATOR_SUCCESS_VIEW: "creator_success.view",

  ADOS_VIEW: "ados.view",
  ADS_VIEW: "ads.view",

  FOUNDER_OFFICE_ACCESS: "founder_office.access",
  FOUNDER_OFFICE_OVERRIDES: "founder_office.overrides",
} as const;

export type AdminPermissionKey =
  (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS];

export const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  candidate: "Candidate",
  offer_sent: "Offer Sent",
  offer_accepted: "Offer Accepted",
  pre_onboarding: "Pre-Onboarding",
  joining_today: "Joining Today",
  active: "Active",
  on_leave: "On Leave",
  suspended: "Suspended",
  resigned: "Resigned",
  exited: "Exited",
  archived: "Archived",
};

export const ACTIVE_EMPLOYMENT_STATUSES = new Set([
  "active",
  "on_leave",
  "joining_today",
]);

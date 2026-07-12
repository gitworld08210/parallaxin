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

  // Platform engines (Phase 1.12)
  APPROVALS_VIEW: "approvals.view",
  APPROVALS_DECIDE: "approvals.decide",
  WORKFLOWS_VIEW: "workflows.view",
  WORKFLOWS_MANAGE: "workflows.manage",
  PLATFORM_ACTIVITY_VIEW: "platform.activity.view",
  ASSIGNMENTS_VIEW: "assignments.view",
  ASSIGNMENTS_MANAGE: "assignments.manage",
  DOCUMENTS_VIEW: "documents.view",
  REPORTS_VIEW: "reports.view",
  DASHBOARDS_VIEW: "dashboards.view",
  SCHEDULER_VIEW: "scheduler.view",

  // Employee Passport (Phase 2.3)
  PEOPLE_OPS_PASSPORT_VIEW: "people_ops.passport.view",
  PEOPLE_OPS_PASSPORT_MANAGE: "people_ops.passport.manage",

  // Workforce movements (Phase 2.4)
  PEOPLE_OPS_MOVEMENTS_VIEW: "people_ops.movements.view",
  PEOPLE_OPS_MOVEMENTS_MANAGE: "people_ops.movements.manage",
  PEOPLE_OPS_MOVEMENTS_APPLY: "people_ops.movements.apply",

  // Organization & workforce planning (Phase 2.5)
  PEOPLE_OPS_ORG_VIEW: "people_ops.org.view",
  PEOPLE_OPS_ORG_MANAGE: "people_ops.org.manage",
  PEOPLE_OPS_CAPACITY_MANAGE: "people_ops.capacity.manage",
  PEOPLE_OPS_POSITIONS_MANAGE: "people_ops.positions.manage",
  PEOPLE_OPS_SUCCESSION_MANAGE: "people_ops.succession.manage",

  // Performance management (Phase 2.6)
  PEOPLE_OPS_PERFORMANCE_VIEW: "people_ops.performance.view",
  PEOPLE_OPS_PERFORMANCE_MANAGE: "people_ops.performance.manage",
  PEOPLE_OPS_PERFORMANCE_REVIEW: "people_ops.performance.review",
  PEOPLE_OPS_RECOGNITION_GRANT: "people_ops.recognition.grant",

  // Learning, Skills, Certifications (Phase 2.7)
  PEOPLE_OPS_LEARNING_VIEW: "people_ops.learning.view",
  PEOPLE_OPS_LEARNING_MANAGE: "people_ops.learning.manage",
  PEOPLE_OPS_LEARNING_ENROLL: "people_ops.learning.enroll",
  PEOPLE_OPS_LEARNING_VERIFY_SKILL: "people_ops.learning.verify_skill",

  // Recruitment & Hiring (Phase 2.8)
  PEOPLE_OPS_RECRUITMENT_VIEW: "people_ops.recruitment.view",
  PEOPLE_OPS_RECRUITMENT_MANAGE: "people_ops.recruitment.manage",
  PEOPLE_OPS_RECRUITMENT_INTERVIEW: "people_ops.recruitment.interview",
  PEOPLE_OPS_RECRUITMENT_OFFER: "people_ops.recruitment.offer",

  // Attendance, Leave, Shifts, Holidays (Phase 2.9)
  PEOPLE_OPS_ATTENDANCE_VIEW: "people_ops.attendance.view",
  PEOPLE_OPS_ATTENDANCE_MANAGE: "people_ops.attendance.manage",
  PEOPLE_OPS_LEAVE_APPROVE: "people_ops.leave.approve",
  PEOPLE_OPS_SHIFT_MANAGE: "people_ops.shift.manage",
  PEOPLE_OPS_HOLIDAY_MANAGE: "people_ops.holiday.manage",

  // Payroll, Compensation & Benefits (Phase 2.10)
  PEOPLE_OPS_PAYROLL_VIEW: "people_ops.payroll.view",
  PEOPLE_OPS_PAYROLL_MANAGE: "people_ops.payroll.manage",
  PEOPLE_OPS_COMPENSATION_MANAGE: "people_ops.compensation.manage",
  PEOPLE_OPS_BONUS_MANAGE: "people_ops.bonus.manage",
  PEOPLE_OPS_BENEFITS_MANAGE: "people_ops.benefits.manage",
  PEOPLE_OPS_REIMBURSEMENT_MANAGE: "people_ops.reimbursement.manage",

  // Hire compensation + finance onboarding
  FINANCE_HIRE_COMP_SUBMIT: "finance.hire_comp.submit",
  FINANCE_HIRE_COMP_REVIEW_L1: "finance.hire_comp.review_l1",
  FINANCE_HIRE_COMP_APPROVE_L2: "finance.hire_comp.approve_l2",
  FINANCE_HIRE_ONBOARDING_VERIFY: "finance.hire_onboarding.verify",

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

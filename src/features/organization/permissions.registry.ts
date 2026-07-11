/**
 * Permission registry — single source of truth for permission keys used
 * across the organization workspace. Server-side authorization always wins;
 * this registry powers UI gates, role editors, and audit labels.
 *
 * To add a permission:
 *   1. Insert a row into `public.organization_permissions` via migration.
 *   2. Add the key to `ORG_PERMISSIONS` below with a stable module/label.
 * Never hardcode raw permission strings elsewhere — always reference this map.
 */
export const ORG_PERMISSIONS = {
  ORGANIZATION_VIEW: "organization.view",
  ORGANIZATION_MANAGE: "organization.manage",
  ORGANIZATION_DELETE: "organization.delete",

  MEMBERS_VIEW: "members.view",
  MEMBERS_INVITE: "members.invite",
  MEMBERS_REMOVE: "members.remove",
  MEMBERS_CHANGE_ROLE: "members.change_role",
  MEMBERS_MANAGE_ROLES: "members.manage_roles",

  ROLES_MANAGE: "roles.manage",

  DEPARTMENTS_VIEW: "departments.view",
  DEPARTMENTS_CREATE: "departments.create",
  DEPARTMENTS_EDIT: "departments.edit",
  DEPARTMENTS_UPDATE: "departments.update",
  DEPARTMENTS_DELETE: "departments.delete",
  DEPARTMENTS_MANAGE: "departments.manage",

  SETTINGS_UPDATE: "settings.update",

  ANALYTICS_VIEW: "analytics.view",

  FEED_POST: "feed.post",
  PROJECTS_CREATE: "projects.create",
  TASKS_CREATE: "tasks.create",
  CALENDAR_MANAGE: "calendar.manage",
  FILES_UPLOAD: "files.upload",
  JOBS_CREATE: "jobs.create",
  BILLING_MANAGE: "billing.manage",
  AI_USE: "ai.use",
} as const;

export type OrgPermissionKey = (typeof ORG_PERMISSIONS)[keyof typeof ORG_PERMISSIONS];

export const ORG_PERMISSION_MODULES: Record<OrgPermissionKey, string> = {
  "organization.view": "organization",
  "organization.manage": "organization",
  "organization.delete": "organization",
  "members.view": "members",
  "members.invite": "members",
  "members.remove": "members",
  "members.change_role": "members",
  "members.manage_roles": "members",
  "roles.manage": "roles",
  "departments.view": "departments",
  "departments.create": "departments",
  "departments.edit": "departments",
  "departments.update": "departments",
  "departments.delete": "departments",
  "departments.manage": "departments",
  "settings.update": "settings",
  "analytics.view": "analytics",
  "feed.post": "feed",
  "projects.create": "projects",
  "tasks.create": "tasks",
  "calendar.manage": "calendar",
  "files.upload": "files",
  "jobs.create": "hiring",
  "billing.manage": "billing",
  "ai.use": "ai",
};

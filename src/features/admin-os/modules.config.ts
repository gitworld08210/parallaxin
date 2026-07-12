/**
 * Aurelix Admin OS — module registry.
 *
 * Adding a module = adding a config entry. Navigation, routing, and
 * permission gates all read from here. No hardcoded nav or routes elsewhere.
 */
import {
  LayoutDashboard,
  Users,
  Shield,
  BadgeCheck,
  Landmark,
  LifeBuoy,
  Cpu,
  Lock,
  Building2,
  Sparkles,
  Radar,
  Megaphone,
  Crown,
  BookOpen,
  Ticket,
  ScrollText,
  Settings,
  Layers,
  type LucideIcon,
} from "lucide-react";
import {
  ADMIN_PERMISSIONS,
  type AdminPermissionKey,
} from "./permissions";

export interface AdminModule {
  /** URL segment under /admin-os/ */
  slug: string;
  /** Sidebar label */
  label: string;
  /** Short subtitle for cards */
  tagline: string;
  icon: LucideIcon;
  /** Permission required to see + enter this module. */
  permission: AdminPermissionKey;
  /** Section grouping in the sidebar. */
  section: "core" | "operations" | "governance" | "platform";
  /** Roadmap phase this module lands in. */
  phase: string;
}

export const ADMIN_MODULES: AdminModule[] = [
  {
    slug: "overview",
    label: "Overview",
    tagline: "Home of Admin OS",
    icon: LayoutDashboard,
    permission: ADMIN_PERMISSIONS.ADMIN_OS_ACCESS,
    section: "core",
    phase: "1.0",
  },

  // Operations
  {
    slug: "departments",
    label: "Departments",
    tagline: "All company departments",
    icon: Building2,
    permission: ADMIN_PERMISSIONS.ADMIN_OS_ACCESS,
    section: "core",
    phase: "1.6",
  },
  {
    slug: "people-ops",
    label: "People Ops",
    tagline: "Employees, onboarding, HR",
    icon: Users,
    permission: ADMIN_PERMISSIONS.PEOPLE_OPS_EMPLOYEES_VIEW,
    section: "operations",
    phase: "2.1",
  },
  {
    slug: "trust-safety",
    label: "Trust & Safety",
    tagline: "Reports, appeals, moderation",
    icon: Shield,
    permission: ADMIN_PERMISSIONS.TRUST_SAFETY_REPORTS_VIEW,
    section: "operations",
    phase: "2.2",
  },
  {
    slug: "verification",
    label: "Verification",
    tagline: "Identity & account verification",
    icon: BadgeCheck,
    permission: ADMIN_PERMISSIONS.VERIFICATION_REQUESTS_VIEW,
    section: "operations",
    phase: "2.3",
  },
  {
    slug: "finance-legal",
    label: "Finance",
    tagline: "Payouts, ledgers, tax",
    icon: Landmark,
    permission: ADMIN_PERMISSIONS.FINANCE_PAYOUTS_VIEW,
    section: "operations",
    phase: "2.4",
  },
  {
    slug: "support",
    label: "Support",
    tagline: "Tickets & user support",
    icon: LifeBuoy,
    permission: ADMIN_PERMISSIONS.SUPPORT_TICKETS_VIEW,
    section: "operations",
    phase: "2.5",
  },

  // Platform
  {
    slug: "engineering",
    label: "Engineering",
    tagline: "Internal tools & platform",
    icon: Cpu,
    permission: ADMIN_PERMISSIONS.ENGINEERING_TOOLS_VIEW,
    section: "platform",
    phase: "2.6",
  },
  {
    slug: "security",
    label: "Security",
    tagline: "Audit, sessions, incidents",
    icon: Lock,
    permission: ADMIN_PERMISSIONS.SECURITY_AUDIT_VIEW,
    section: "platform",
    phase: "2.7",
  },
  {
    slug: "organizations",
    label: "Organizations",
    tagline: "Workspace admin at scale",
    icon: Building2,
    permission: ADMIN_PERMISSIONS.ORGANIZATIONS_VIEW,
    section: "platform",
    phase: "2.8",
  },
  {
    slug: "creator-success",
    label: "Creator Success",
    tagline: "Creator growth & enablement",
    icon: Sparkles,
    permission: ADMIN_PERMISSIONS.CREATOR_SUCCESS_VIEW,
    section: "platform",
    phase: "2.9",
  },
  {
    slug: "ados",
    label: "ADOS",
    tagline: "Aurelix Distribution & Ops",
    icon: Radar,
    permission: ADMIN_PERMISSIONS.ADOS_VIEW,
    section: "platform",
    phase: "3.1",
  },
  {
    slug: "ads",
    label: "Ads & Business",
    tagline: "Ads platform & business tools",
    icon: Megaphone,
    permission: ADMIN_PERMISSIONS.ADS_VIEW,
    section: "platform",
    phase: "3.2",
  },
  {
    slug: "platform",
    label: "Platform Engines",
    tagline: "Approvals, workflows, docs, more",
    icon: Layers,
    permission: ADMIN_PERMISSIONS.ADMIN_OS_ACCESS,
    section: "platform",
    phase: "1.12",
  },

  // Governance
  {
    slug: "founder-office",
    label: "Founder Office",
    tagline: "Executive governance",
    icon: Crown,
    permission: ADMIN_PERMISSIONS.FOUNDER_OFFICE_ACCESS,
    section: "governance",
    phase: "1.0",
  },
  {
    slug: "audit",
    label: "Audit Center",
    tagline: "Every action, every actor",
    icon: ScrollText,
    permission: ADMIN_PERMISSIONS.SECURITY_AUDIT_VIEW,
    section: "governance",
    phase: "2.7",
  },
  {
    slug: "knowledge",
    label: "Knowledge",
    tagline: "Internal knowledge center",
    icon: BookOpen,
    permission: ADMIN_PERMISSIONS.ADMIN_OS_ACCESS,
    section: "governance",
    phase: "3.3",
  },
  {
    slug: "tickets",
    label: "Internal Tickets",
    tagline: "Cross-department tickets",
    icon: Ticket,
    permission: ADMIN_PERMISSIONS.ADMIN_OS_ACCESS,
    section: "governance",
    phase: "3.4",
  },
  {
    slug: "settings",
    label: "Settings",
    tagline: "Admin OS configuration",
    icon: Settings,
    permission: ADMIN_PERMISSIONS.ADMIN_OS_ACCESS,
    section: "governance",
    phase: "1.0",
  },
];

export const SECTION_LABELS: Record<AdminModule["section"], string> = {
  core: "Core",
  operations: "Operations",
  platform: "Platform",
  governance: "Governance",
};

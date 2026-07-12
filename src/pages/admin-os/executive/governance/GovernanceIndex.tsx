/**
 * Phase 3.4 — Governance Center home / dashboard.
 */
import { Link } from "react-router-dom";
import { PageHeader, SectionCard, StatCard } from "@/components/admin-os/ds";
import {
  usePolicies, useGovernanceRules, useAuthorityMatrix,
  useApprovalMatrix, useAuthorityDelegations, useCharters,
} from "@/hooks/admin-os/useGovernance";
import { ScrollText, Shield, GitBranch, FileText, Building2, Users2, Search } from "lucide-react";

const sections = [
  { to: "policies", label: "Policy Center", icon: FileText, desc: "Create, review, publish and archive company policies." },
  { to: "authority", label: "Authority Matrix", icon: Shield, desc: "Who has what authority across the company." },
  { to: "approval-matrix", label: "Approval Matrix", icon: GitBranch, desc: "Who approves, recommends, reviews and is notified for each request type." },
  { to: "delegations", label: "Delegations", icon: Users2, desc: "Temporary Founder Office authority transfers." },
  { to: "charters", label: "Department Charters", icon: Building2, desc: "Mission, KPIs, approval rights and standards per department." },
  { to: "search", label: "Governance Search", icon: Search, desc: "Cross-search every governance record." },
];

const GovernanceIndex = () => {
  const { data: policies = [] } = usePolicies();
  const { data: rules = [] } = useGovernanceRules();
  const { data: authority = [] } = useAuthorityMatrix();
  const { data: approvals = [] } = useApprovalMatrix();
  const { data: delegations = [] } = useAuthorityDelegations();
  const { data: charters = [] } = useCharters();

  const published = policies.filter((p) => p.status === "published").length;
  const pendingReview = policies.filter((p) => p.status === "review").length;
  const activeDeleg = delegations.filter((d: any) => d.status === "active").length;
  const approvedCharters = charters.filter((c: any) => c.status === "approved").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="FOUNDER OFFICE · GOVERNANCE"
        title="Company Governance Center"
        description="Single source of truth for policies, authority, approvals and delegations."
        icon={ScrollText}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Published policies" value={String(published)} sublabel={`${policies.length} total`} />
        <StatCard label="Pending review" value={String(pendingReview)} sublabel="Awaiting founder review" />
        <StatCard label="Active delegations" value={String(activeDeleg)} />
        <StatCard label="Approved charters" value={String(approvedCharters)} sublabel={`${charters.length} total`} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Governance rules" value={String(rules.length)} />
        <StatCard label="Authority rows" value={String(authority.length)} />
        <StatCard label="Approval matrix rows" value={String(approvals.length)} />
        <StatCard label="Departments with charter" value={String(new Set(charters.map((c: any) => c.department_id)).size)} />
      </div>

      <SectionCard title="Governance modules" description="Every governance change here is versioned and audited.">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sections.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="group rounded-lg border border-border/60 bg-card p-4 hover:border-primary/60 hover:bg-primary/[0.03] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <s.icon className="h-4 w-4" />
                </div>
                <p className="font-semibold text-sm">{s.label}</p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{s.desc}</p>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};

export default GovernanceIndex;

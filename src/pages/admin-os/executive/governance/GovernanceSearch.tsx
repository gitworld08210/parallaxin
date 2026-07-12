/**
 * Phase 3.4 — Cross-governance search.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, SectionCard, StatusBadge } from "@/components/admin-os/ds";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  usePolicies, useGovernanceRules, useAuthorityMatrix,
  useApprovalMatrix, useAuthorityDelegations, useCharters,
} from "@/hooks/admin-os/useGovernance";

const GovernanceSearch = () => {
  const [q, setQ] = useState("");
  const { data: policies = [] } = usePolicies();
  const { data: rules = [] } = useGovernanceRules();
  const { data: authority = [] } = useAuthorityMatrix();
  const { data: approvals = [] } = useApprovalMatrix();
  const { data: delegations = [] } = useAuthorityDelegations();
  const { data: charters = [] } = useCharters();

  const term = q.trim().toLowerCase();
  const match = (v: unknown) => !term || String(v ?? "").toLowerCase().includes(term);

  const results = useMemo(() => ({
    policies: policies.filter((p) => match(p.title) || match(p.code) || match(p.summary) || match(p.category)),
    rules: rules.filter((r: any) => match(r.name) || match(r.description)),
    authority: authority.filter((a: any) => match(a.role_key) || match(a.scope) || match(a.description)),
    approvals: approvals.filter((a: any) => match(a.request_type) || match(a.scope) || match(a.description)),
    delegations: delegations.filter((d: any) => match(d.scope) || match(d.reason)),
    charters: charters.filter((c: any) => match(c.mission) || match(c.department?.name)),
  }), [term, policies, rules, authority, approvals, delegations, charters]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="GOVERNANCE · SEARCH" title="Governance Search"
        description="Search every policy, rule, authority, approval, delegation and charter." />
      <SectionCard>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search keyword, owner, department, code…" className="pl-8"
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </SectionCard>

      <SectionCard title={`Policies (${results.policies.length})`} padded={false}>
        <div className="divide-y divide-border/60">
          {results.policies.slice(0, 20).map((p) => (
            <Link key={p.id} to={`/admin-os/executive/governance/policies/${p.id}`}
              className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/30">
              <span className="font-mono text-[11px] text-muted-foreground">{p.code}</span>
              <span className="text-sm flex-1 truncate">{p.title}</span>
              <StatusBadge tone="info" label={p.status} />
            </Link>
          ))}
          {results.policies.length === 0 && <p className="px-5 py-3 text-xs text-muted-foreground">No policies.</p>}
        </div>
      </SectionCard>

      <div className="grid md:grid-cols-2 gap-6">
        <SectionCard title={`Rules (${results.rules.length})`}>
          <ul className="text-sm space-y-1.5">
            {results.rules.slice(0, 10).map((r: any) => (
              <li key={r.id} className="flex justify-between">
                <span className="truncate">{r.name}</span>
                <span className="text-[11px] text-muted-foreground">{r.priority}</span>
              </li>
            ))}
            {results.rules.length === 0 && <p className="text-xs text-muted-foreground">No rules.</p>}
          </ul>
        </SectionCard>
        <SectionCard title={`Authority (${results.authority.length})`}>
          <ul className="text-sm space-y-1.5">
            {results.authority.slice(0, 10).map((a: any) => (
              <li key={a.id} className="flex justify-between">
                <span className="font-mono text-xs">{a.role_key}</span>
                <span className="text-xs text-muted-foreground">{a.scope} · {a.authority_level}</span>
              </li>
            ))}
            {results.authority.length === 0 && <p className="text-xs text-muted-foreground">No rows.</p>}
          </ul>
        </SectionCard>
        <SectionCard title={`Approvals (${results.approvals.length})`}>
          <ul className="text-sm space-y-1.5">
            {results.approvals.slice(0, 10).map((a: any) => (
              <li key={a.id} className="flex justify-between">
                <span className="font-mono text-xs">{a.request_type}</span>
                <span className="text-xs text-muted-foreground">{a.approver_role}</span>
              </li>
            ))}
            {results.approvals.length === 0 && <p className="text-xs text-muted-foreground">No rules.</p>}
          </ul>
        </SectionCard>
        <SectionCard title={`Delegations (${results.delegations.length})`}>
          <ul className="text-sm space-y-1.5">
            {results.delegations.slice(0, 10).map((d: any) => (
              <li key={d.id} className="flex justify-between">
                <span className="truncate">{d.scope}</span>
                <StatusBadge tone={d.status === "active" ? "success" : "neutral"} label={d.status} />
              </li>
            ))}
            {results.delegations.length === 0 && <p className="text-xs text-muted-foreground">None.</p>}
          </ul>
        </SectionCard>
        <SectionCard title={`Charters (${results.charters.length})`} className="md:col-span-2">
          <ul className="text-sm space-y-1.5">
            {results.charters.slice(0, 10).map((c: any) => (
              <li key={c.id} className="flex justify-between">
                <span>{c.department?.name ?? c.department_id}</span>
                <StatusBadge tone={c.status === "approved" ? "success" : "neutral"} label={c.status} />
              </li>
            ))}
            {results.charters.length === 0 && <p className="text-xs text-muted-foreground">None.</p>}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
};

export default GovernanceSearch;

/**
 * Phase 3.5 — Strategic Decision Center home.
 */
import { Link } from "react-router-dom";
import { PageHeader, SectionCard, StatCard, StatusBadge, EmptyState } from "@/components/admin-os/ds";
import { useDecisions, type DecisionStatus } from "@/hooks/admin-os/useStrategicDecisions";
import { Gavel, ArrowRight, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_TONE: Record<DecisionStatus, "info" | "warning" | "success" | "danger" | "neutral"> = {
  draft: "neutral", discussion: "info", review: "warning", approved: "info",
  implementation: "warning", monitoring: "info", completed: "success", archived: "neutral",
};

const DecisionCenter = () => {
  const { data: decisions = [], isLoading } = useDecisions();

  const bucket = (s: DecisionStatus[]) => decisions.filter((d) => s.includes(d.status)).length;
  const active = bucket(["discussion", "review", "approved", "implementation", "monitoring"]);
  const drafts = bucket(["draft"]);
  const completed = bucket(["completed"]);
  const critical = decisions.filter((d) => d.priority === "critical").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="FOUNDER OFFICE · DECISIONS"
        title="Strategic Decision Center"
        description="Permanent record of every Founder Office strategic decision — versioned, auditable, searchable."
        actions={
          <div className="flex items-center gap-2">
            <Link to="/admin-os/executive/decisions/search">
              <Button variant="outline" size="sm"><Search className="h-4 w-4 mr-1.5" />Search</Button>
            </Link>
            <Link to="/admin-os/executive/decisions/new">
              <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New decision</Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Active decisions" value={active} />
        <StatCard label="Drafts" value={drafts} />
        <StatCard label="Completed" value={completed} />
        <StatCard label="Critical priority" value={critical} />
      </div>

      <SectionCard title="Recent decisions" padded={false}>
        {isLoading ? (
          <div className="p-8 text-sm text-muted-foreground">Loading…</div>
        ) : decisions.length === 0 ? (
          <div className="p-8"><EmptyState icon={Gavel} title="No decisions yet"
            description="Draft your first strategic decision — it will be versioned from v1." /></div>
        ) : (
          <div className="divide-y divide-border/60">
            {decisions.slice(0, 25).map((d) => (
              <Link key={d.id} to={`/admin-os/executive/decisions/${d.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40">
                <Gavel className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground">{d.decision_code}</span>
                    <span className="font-medium text-sm truncate">{d.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{d.summary ?? "—"}</p>
                </div>
                <span className="text-[11px] text-muted-foreground w-20 truncate">{d.category}</span>
                <span className="text-[11px] text-muted-foreground">v{d.current_version}</span>
                <StatusBadge tone={STATUS_TONE[d.status]} label={d.status} />
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default DecisionCenter;

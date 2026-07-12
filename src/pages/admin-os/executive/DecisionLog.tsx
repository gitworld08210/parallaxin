/**
 * Phase 3.3 — Decision Log.
 * Chronological, read-only record of every executive decision.
 */
import { Link } from "react-router-dom";
import { ArrowRight, ScrollText } from "lucide-react";
import { useDecisionLog } from "@/hooks/admin-os/useExecutiveInbox";
import { PageHeader, SectionCard, EmptyState, StatusBadge } from "@/components/admin-os/ds";

const fmtDT = (iso: string) => new Date(iso).toLocaleString();

const DECISION_TONE = (d: string) =>
  d === "approved"
    ? "success"
    : d === "rejected"
      ? "danger"
      : d === "returned" || d === "info_requested"
        ? "warning"
        : "info";

const DecisionLog = () => {
  const { data = [], isLoading } = useDecisionLog(200);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="FOUNDER OFFICE · DECISIONS"
        title="Decision Log"
        description="Every executive decision, in order. Immutable and audit-backed."
      />

      <SectionCard title="Recent Decisions">
        {isLoading ? (
          <div className="h-40 animate-pulse bg-muted/40 rounded-lg" />
        ) : data.length === 0 ? (
          <EmptyState
            title="No decisions yet"
            description="Once you approve or reject a request it will appear here."
          />
        ) : (
          <div className="divide-y divide-border/40 -mx-1">
            {data.map((d: any) => (
              <div key={d.id} className="flex items-start gap-3 px-1 py-3">
                <ScrollText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={DECISION_TONE(d.decision) as any} label={d.decision} />
                    <span className="text-sm font-semibold truncate">
                      {d.request?.title ?? "(unknown request)"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {d.request?.module ?? "—"} · {d.request?.entity_type ?? "—"} · {fmtDT(d.created_at)}
                  </p>
                  {d.reason && (
                    <p className="mt-1 text-xs text-muted-foreground border-l-2 border-border pl-2">
                      {d.reason}
                    </p>
                  )}
                </div>
                {d.request?.id && (
                  <Link
                    to={`/admin-os/executive/inbox/${d.request.id}`}
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline shrink-0"
                  >
                    View <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default DecisionLog;

/**
 * Phase 3.3 — Executive Inbox page.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox, Search, AlertOctagon, Clock, Flame } from "lucide-react";
import {
  useExecutiveInbox,
  useInboxCounts,
  useMyDelegations,
  type InboxFilters,
} from "@/hooks/admin-os/useExecutiveInbox";
import { PageHeader, SectionCard, EmptyState, StatusBadge } from "@/components/admin-os/ds";

const STATUS_TABS: Array<{ key: NonNullable<InboxFilters["status"]>; label: string }> = [
  { key: "pending", label: "Pending" },
  { key: "in_review", label: "In Review" },
  { key: "escalated", label: "Escalated" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const PRIORITY_TONE = (p: string) =>
  p === "critical" || p === "urgent" ? "danger" : p === "high" ? "warning" : "info";

const fmtWhen = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 60_000;
  if (diff < 1) return "just now";
  if (diff < 60) return `${Math.round(diff)}m ago`;
  if (diff < 60 * 24) return `${Math.round(diff / 60)}h ago`;
  return new Date(iso).toLocaleDateString();
};

const CountPill = ({
  icon: Icon,
  label,
  count,
  tone,
}: {
  icon: any;
  label: string;
  count: number;
  tone: "danger" | "warning" | "info" | "neutral";
}) => {
  const toneMap = {
    danger: "text-red-500 bg-red-500/10",
    warning: "text-amber-500 bg-amber-500/10",
    info: "text-primary bg-primary/10",
    neutral: "text-muted-foreground bg-muted",
  };
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2">
      <div className={`rounded-md p-1.5 ${toneMap[tone]}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-bold tabular-nums leading-tight">{count}</p>
      </div>
    </div>
  );
};

const ExecutiveInbox = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<InboxFilters>({ status: "pending" });
  const { data: counts } = useInboxCounts();
  const { data: rows = [], isLoading } = useExecutiveInbox(filters);
  const { data: myDelegations = [] } = useMyDelegations();

  const pendingDelegations = useMemo(
    () => myDelegations.filter((d: any) => d.status === "pending"),
    [myDelegations],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="FOUNDER OFFICE · EXECUTIVE INBOX"
        title="Executive Inbox"
        description="Every executive-level request in one prioritized queue."
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <CountPill icon={Inbox} label="Open" count={counts?.pending ?? 0} tone="info" />
        <CountPill icon={Flame} label="Critical" count={counts?.critical ?? 0} tone="danger" />
        <CountPill icon={AlertOctagon} label="Escalated" count={counts?.escalated ?? 0} tone="danger" />
        <CountPill icon={Clock} label="Overdue" count={counts?.overdue ?? 0} tone="warning" />
        <CountPill icon={Inbox} label="Delegations" count={counts?.delegated ?? 0} tone="neutral" />
      </div>

      {/* My inbound delegations */}
      {pendingDelegations.length > 0 && (
        <SectionCard
          title="Delegated to you"
          description="Reviews another founder has delegated to you."
        >
          <div className="divide-y divide-border/40 -mx-1">
            {pendingDelegations.map((d: any) => (
              <button
                key={d.id}
                onClick={() => navigate(`/admin-os/executive/inbox/${d.request_id}`)}
                className="w-full flex items-start gap-3 px-1 py-2.5 hover:bg-muted/30 rounded-md text-left transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {d.request?.title ?? "Delegated request"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {d.reason || "No reason provided"} · {fmtWhen(d.created_at)}
                  </p>
                </div>
                <StatusBadge tone="warning" label="pending" />
              </button>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 border-b border-border/60">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilters((f) => ({ ...f, status: t.key }))}
              className={`px-3 py-2 text-xs font-medium transition ${
                filters.status === t.key
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={filters.search ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value || undefined }))
              }
              placeholder="Search title, entity…"
              className="w-56 rounded-md border border-border bg-background pl-8 pr-2 py-1.5 text-xs"
            />
          </div>
          <select
            value={filters.priority ?? "all"}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                priority: (e.target.value === "all"
                  ? "all"
                  : (e.target.value as InboxFilters["priority"])),
              }))
            }
            className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
          >
            <option value="all">All priorities</option>
            <option value="critical">Critical</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={!!filters.overdueOnly}
              onChange={(e) =>
                setFilters((f) => ({ ...f, overdueOnly: e.target.checked || undefined }))
              }
            />
            Overdue
          </label>
        </div>
      </div>

      {/* Queue */}
      <SectionCard title="Approval Queue" description={`${rows.length} request${rows.length === 1 ? "" : "s"}`}>
        {isLoading ? (
          <div className="h-40 animate-pulse bg-muted/40 rounded-lg" />
        ) : rows.length === 0 ? (
          <EmptyState title="Inbox zero" description="No requests match these filters." />
        ) : (
          <div className="divide-y divide-border/40 -mx-1">
            {rows.map((r: any) => {
              const overdue = r.due_at && new Date(r.due_at) < new Date();
              return (
                <button
                  key={r.id}
                  onClick={() => navigate(`/admin-os/executive/inbox/${r.id}`)}
                  className="w-full flex items-start gap-3 px-1 py-3 hover:bg-muted/30 rounded-md text-left transition-colors"
                >
                  <StatusBadge tone={PRIORITY_TONE(r.priority) as any} label={r.priority} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{r.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {r.module} · {r.entity_type} · requested {fmtWhen(r.created_at)}
                      {r.due_at && (
                        <>
                          {" · "}
                          <span className={overdue ? "text-red-500 font-semibold" : ""}>
                            due {new Date(r.due_at).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <StatusBadge
                    tone={
                      r.status === "approved"
                        ? "success"
                        : r.status === "rejected"
                          ? "danger"
                          : r.status === "escalated"
                            ? "danger"
                            : "info"
                    }
                    label={r.status}
                  />
                </button>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default ExecutiveInbox;

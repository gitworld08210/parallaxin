import { useState } from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  useApprovals,
  useApprovalDecisions,
  useDecideApproval,
} from "@/hooks/platform/usePlatform";

const STATUS_TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
] as const;

const PageHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <header>
    <p className="text-[11px] font-bold tracking-[0.2em] text-primary">
      AURELIX · PLATFORM
    </p>
    <h1 className="mt-1 text-2xl font-bold text-foreground">{title}</h1>
    {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
  </header>
);

const StatusPill = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-600",
    approved: "bg-emerald-500/10 text-emerald-600",
    rejected: "bg-red-500/10 text-red-600",
    cancelled: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
};

const ApprovalCenter = () => {
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]["key"]>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const { data: list = [], isLoading } = useApprovals({ status });
  const { data: decisions = [] } = useApprovalDecisions(selectedId ?? undefined);
  const decide = useDecideApproval();

  const selected = list.find((r) => r.id === selectedId);

  const handleDecide = (decision: "approved" | "rejected") => {
    if (!selectedId) return;
    decide.mutate(
      { id: selectedId, decision, reason: reason || undefined },
      {
        onSuccess: () => {
          toast.success(`Approval ${decision}`);
          setReason("");
          setSelectedId(null);
        },
        onError: (e: unknown) =>
          toast.error(e instanceof Error ? e.message : "Failed"),
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval Center"
        subtitle="Every module's approvals in one queue."
      />

      <div className="flex gap-2 border-b border-border">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatus(t.key)}
            className={`px-3 py-2 text-sm font-medium transition ${
              status === t.key
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-2">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {!isLoading && list.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No {status} approvals.
            </div>
          )}
          {list.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={`w-full rounded-lg border p-3 text-left transition ${
                selectedId === r.id
                  ? "border-primary bg-primary/5"
                  : "border-border/60 bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-foreground">{r.title}</p>
                <StatusPill status={r.status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {r.module} · {r.entity_type} · {r.priority}
              </p>
            </button>
          ))}
        </div>

        <div>
          {!selected ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Select an approval to review.
            </div>
          ) : (
            <div className="space-y-4 rounded-xl border border-border/60 bg-card p-5">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {selected.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selected.description || "No description."}
                </p>
              </div>

              {status === "pending" && (
                <>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason (recommended)"
                    className="w-full rounded-md border border-border bg-background p-2 text-sm"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={decide.isPending}
                      onClick={() => handleDecide("approved")}
                      className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 className="inline h-4 w-4 mr-1" />
                      Approve
                    </button>
                    <button
                      disabled={decide.isPending}
                      onClick={() => handleDecide("rejected")}
                      className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      <XCircle className="inline h-4 w-4 mr-1" />
                      Reject
                    </button>
                  </div>
                </>
              )}

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Decision history
                </p>
                <div className="space-y-2">
                  {decisions.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No decisions recorded yet.
                    </p>
                  )}
                  {decisions.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-md border border-border/60 bg-background p-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="font-semibold">{d.decision}</span>
                        <span className="text-muted-foreground">
                          {new Date(d.created_at).toLocaleString()}
                        </span>
                      </div>
                      {d.reason && (
                        <p className="mt-1 text-muted-foreground">{d.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalCenter;

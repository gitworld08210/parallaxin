/**
 * Phase 3.3 — Executive Approval Detail.
 *
 * Full decision surface: request meta, decision panel, timeline,
 * delegations, notes, escalation controls.
 */
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RotateCcw,
  MessageSquare,
  CalendarClock,
  Flame,
  UserPlus,
  StickyNote,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  useApprovalRequest,
  useApprovalTimeline,
  useApprovalDecisions,
  useDecideRequest,
  useDelegations,
  useCreateDelegation,
  useUpdateDelegationStatus,
  useNotes,
  useAddNote,
  useEscalations,
  useManualEscalate,
  useSetPriority,
} from "@/hooks/admin-os/useExecutiveInbox";
import {
  PageHeader,
  SectionCard,
  StatusBadge,
  EmptyState,
} from "@/components/admin-os/ds";
import { useEmployeesList } from "@/hooks/admin-os/useEmployees";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

const fmtDT = (iso: string) => new Date(iso).toLocaleString();

const EVENT_ICON: Record<string, any> = {
  created: Clock,
  step: CheckCircle2,
  decision: CheckCircle2,
  delegation: UserPlus,
  escalation: Flame,
  note: StickyNote,
};

const ExecutiveApprovalDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: request, isLoading } = useApprovalRequest(id);
  const { data: timeline = [] } = useApprovalTimeline(id);
  const { data: decisions = [] } = useApprovalDecisions(id);
  const { data: delegations = [] } = useDelegations(id);
  const { data: notes = [] } = useNotes(id);
  const { data: escalations = [] } = useEscalations(id);
  const { data: employees = [] } = useEmployeesList();

  const decide = useDecideRequest();
  const createDelegation = useCreateDelegation();
  const updateDelegation = useUpdateDelegationStatus();
  const addNote = useAddNote();
  const escalate = useManualEscalate();
  const setPriority = useSetPriority();

  const [reason, setReason] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteShared, setNoteShared] = useState(false);
  const [delegateTo, setDelegateTo] = useState("");
  const [delegateReason, setDelegateReason] = useState("");
  const [escalationReason, setEscalationReason] = useState("");
  const [requesterName, setRequesterName] = useState<string | null>(null);

  // Fetch requester profile
  useEffect(() => {
    if (!request?.requested_by) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("user_id", request.requested_by!)
        .maybeSingle();
      setRequesterName((data as any)?.display_name ?? (data as any)?.username ?? null);
    })();
  }, [request?.requested_by]);

  if (isLoading || !request) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-40 bg-muted animate-pulse rounded" />
        <div className="h-40 bg-muted/50 animate-pulse rounded-xl" />
      </div>
    );
  }

  const isOpen = ["pending", "in_review", "escalated"].includes(request.status);

  const submitDecision = (
    decision: "approved" | "rejected" | "returned" | "info_requested" | "scheduled_discussion",
  ) => {
    if (!id) return;
    if (!reason.trim()) {
      toast.error("Every executive decision requires a reason.");
      return;
    }
    if (decision === "approved" || decision === "rejected") {
      const confirmed = window.confirm(
        `Confirm you want to ${decision === "approved" ? "APPROVE" : "REJECT"} this request. This is immutable.`,
      );
      if (!confirmed) return;
    }
    decide.mutate(
      { id, decision, reason },
      {
        onSuccess: () => {
          toast.success(`Decision recorded: ${decision}`);
          setReason("");
        },
        onError: (e: any) => toast.error(e.message || "Failed"),
      },
    );
  };

  const submitDelegate = () => {
    if (!id || !delegateTo) {
      toast.error("Pick a delegate.");
      return;
    }
    createDelegation.mutate(
      { request_id: id, delegated_to: delegateTo, reason: delegateReason || undefined },
      {
        onSuccess: () => {
          toast.success("Delegation created");
          setDelegateTo("");
          setDelegateReason("");
        },
        onError: (e: any) => toast.error(e.message || "Failed"),
      },
    );
  };

  const submitNote = () => {
    if (!id || !noteBody.trim()) return;
    addNote.mutate(
      { request_id: id, body: noteBody, visibility: noteShared ? "shared" : "founder_office" },
      {
        onSuccess: () => {
          setNoteBody("");
          toast.success("Note added");
        },
      },
    );
  };

  const submitEscalate = () => {
    if (!id || !escalationReason.trim()) {
      toast.error("Escalation reason required.");
      return;
    }
    escalate.mutate(
      { request_id: id, reason: escalationReason },
      {
        onSuccess: () => {
          toast.success("Escalation logged");
          setEscalationReason("");
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/admin-os/executive/inbox")}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Inbox
      </button>

      <PageHeader
        eyebrow={`FOUNDER OFFICE · ${request.module.toUpperCase()}`}
        title={request.title}
        description={request.description ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge
              tone={
                request.priority === "critical" || request.priority === "urgent"
                  ? "danger"
                  : request.priority === "high"
                    ? "warning"
                    : "info"
              }
              label={request.priority}
            />
            <StatusBadge
              tone={
                request.status === "approved"
                  ? "success"
                  : request.status === "rejected"
                    ? "danger"
                    : request.status === "escalated"
                      ? "danger"
                      : "info"
              }
              label={request.status}
            />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* LEFT COLUMN */}
        <div className="space-y-4">
          {/* Meta */}
          <SectionCard title="Request">
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-muted-foreground">Entity</dt>
                <dd className="font-mono">{request.entity_type}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Module</dt>
                <dd className="font-mono">{request.module}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Requester</dt>
                <dd>{requesterName ?? request.requested_by ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd>{fmtDT(request.created_at)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Due</dt>
                <dd>{request.due_at ? fmtDT(request.due_at) : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Current step</dt>
                <dd>{request.current_step}</dd>
              </div>
            </dl>
            {request.payload && Object.keys(request.payload as any).length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Payload
                </p>
                <pre className="text-[11px] bg-muted/40 rounded p-2 overflow-x-auto max-h-40">
                  {JSON.stringify(request.payload, null, 2)}
                </pre>
              </div>
            )}
          </SectionCard>

          {/* Decision Panel */}
          {isOpen && (
            <SectionCard
              title="Executive Decision"
              description="Every executive decision requires a reason and is immutable."
            >
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for your decision…"
                rows={3}
                className="w-full rounded-md border border-border bg-background p-2 text-sm"
              />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                <button
                  disabled={decide.isPending}
                  onClick={() => submitDecision("approved")}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-3 py-2 text-xs font-semibold text-white"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                </button>
                <button
                  disabled={decide.isPending}
                  onClick={() => submitDecision("rejected")}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-red-600 hover:bg-red-700 disabled:opacity-50 px-3 py-2 text-xs font-semibold text-white"
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </button>
                <button
                  disabled={decide.isPending}
                  onClick={() => submitDecision("returned")}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-card hover:bg-muted px-3 py-2 text-xs font-semibold"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Return for Revision
                </button>
                <button
                  disabled={decide.isPending}
                  onClick={() => submitDecision("info_requested")}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-card hover:bg-muted px-3 py-2 text-xs font-semibold"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Request Info
                </button>
                <button
                  disabled={decide.isPending}
                  onClick={() => submitDecision("scheduled_discussion")}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-card hover:bg-muted px-3 py-2 text-xs font-semibold"
                >
                  <CalendarClock className="h-3.5 w-3.5" /> Schedule Discussion
                </button>
                <button
                  disabled={setPriority.isPending || request.priority === "critical"}
                  onClick={() => setPriority.mutate({ id: request.id, priority: "critical" })}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md border border-red-500/40 text-red-500 hover:bg-red-500/10 disabled:opacity-50 px-3 py-2 text-xs font-semibold"
                >
                  <Flame className="h-3.5 w-3.5" /> Mark Urgent
                </button>
              </div>
            </SectionCard>
          )}

          {/* Timeline */}
          <SectionCard title="Approval Timeline" description="Every event tied to this request">
            {timeline.length === 0 ? (
              <EmptyState title="No timeline entries" description="Timeline is empty." />
            ) : (
              <ol className="relative border-l border-border/60 ml-2 space-y-4">
                {timeline.map((t, i) => {
                  const Icon = EVENT_ICON[t.event_kind] ?? Clock;
                  return (
                    <li key={i} className="ml-4">
                      <span className="absolute -left-2 rounded-full bg-primary/10 text-primary p-1">
                        <Icon className="h-3 w-3" />
                      </span>
                      <p className="text-xs font-semibold">{t.summary}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {t.event_kind} · {fmtDT(t.event_at)}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </SectionCard>

          {/* Decision History */}
          <SectionCard title="Decision History">
            {decisions.length === 0 ? (
              <EmptyState title="No decisions" description="No executive decisions yet." />
            ) : (
              <div className="space-y-2">
                {decisions.map((d: any) => (
                  <div key={d.id} className="rounded-md border border-border/60 p-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{d.decision}</span>
                      <span className="text-muted-foreground">{fmtDT(d.created_at)}</span>
                    </div>
                    {d.reason && (
                      <p className="text-muted-foreground mt-1">{d.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          {/* Delegations */}
          <SectionCard title="Delegation" description="Delegate this review to another founder">
            {isOpen && (
              <div className="space-y-2 pb-3 border-b border-border/40">
                <select
                  value={delegateTo}
                  onChange={(e) => setDelegateTo(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                >
                  <option value="">Select delegate…</option>
                  {employees
                    .filter((e: any) => e.user_id)
                    .map((e: any) => (
                      <option key={e.id} value={e.user_id}>
                        {e.full_name}
                      </option>
                    ))}
                </select>
                <input
                  value={delegateReason}
                  onChange={(e) => setDelegateReason(e.target.value)}
                  placeholder="Reason (optional)"
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                />
                <button
                  onClick={submitDelegate}
                  disabled={createDelegation.isPending}
                  className="w-full rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  Delegate
                </button>
              </div>
            )}

            {delegations.length === 0 ? (
              <p className="text-xs text-muted-foreground pt-3">No delegations.</p>
            ) : (
              <div className="pt-3 space-y-2">
                {delegations.map((d: any) => (
                  <div key={d.id} className="rounded-md border border-border/60 p-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono truncate">→ {d.delegated_to}</span>
                      <StatusBadge
                        tone={
                          d.status === "accepted"
                            ? "success"
                            : d.status === "declined" || d.status === "revoked"
                              ? "danger"
                              : "warning"
                        }
                        label={d.status}
                      />
                    </div>
                    {d.reason && <p className="text-muted-foreground mt-1">{d.reason}</p>}
                    {d.status === "pending" && (
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={() =>
                            updateDelegation.mutate({
                              id: d.id,
                              request_id: id!,
                              status: "accepted",
                            })
                          }
                          className="flex-1 rounded bg-emerald-600 text-white px-2 py-1 text-[10px] font-semibold"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() =>
                            updateDelegation.mutate({
                              id: d.id,
                              request_id: id!,
                              status: "declined",
                            })
                          }
                          className="flex-1 rounded bg-red-600 text-white px-2 py-1 text-[10px] font-semibold"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() =>
                            updateDelegation.mutate({
                              id: d.id,
                              request_id: id!,
                              status: "revoked",
                            })
                          }
                          className="flex-1 rounded border border-border px-2 py-1 text-[10px] font-semibold"
                        >
                          Revoke
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-3">
              Delegation never transfers final accountability.
            </p>
          </SectionCard>

          {/* Notes */}
          <SectionCard title="Executive Notes" description="Private to Founder Office">
            <div className="space-y-2 pb-3 border-b border-border/40">
              <textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Add an executive note…"
                rows={2}
                className="w-full rounded-md border border-border bg-background p-2 text-xs"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-[11px]">
                  <input
                    type="checkbox"
                    checked={noteShared}
                    onChange={(e) => setNoteShared(e.target.checked)}
                  />
                  Share with requester
                </label>
                <button
                  onClick={submitNote}
                  disabled={addNote.isPending || !noteBody.trim()}
                  className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  Add Note
                </button>
              </div>
            </div>
            {notes.length === 0 ? (
              <p className="text-xs text-muted-foreground pt-3">No notes yet.</p>
            ) : (
              <div className="pt-3 space-y-2">
                {notes.map((n: any) => (
                  <div key={n.id} className="rounded-md border border-border/60 p-2.5 text-xs">
                    <p>{n.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {n.visibility} · {fmtDT(n.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Escalations */}
          <SectionCard title="Escalations">
            {isOpen && (
              <div className="space-y-2 pb-3 border-b border-border/40">
                <input
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  placeholder="Escalation reason"
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                />
                <button
                  onClick={submitEscalate}
                  disabled={escalate.isPending}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-red-500/40 text-red-500 hover:bg-red-500/10 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  <ShieldAlert className="h-3.5 w-3.5" /> Escalate
                </button>
              </div>
            )}
            {escalations.length === 0 ? (
              <p className="text-xs text-muted-foreground pt-3">No escalations logged.</p>
            ) : (
              <div className="pt-3 space-y-2">
                {escalations.map((e: any) => (
                  <div
                    key={e.id}
                    className="rounded-md border border-red-500/20 bg-red-500/5 p-2.5 text-xs"
                  >
                    <p className="font-medium">{e.reason}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {e.triggered_by} · {fmtDT(e.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveApprovalDetail;

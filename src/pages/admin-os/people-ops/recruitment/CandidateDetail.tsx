import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Plus } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  useCandidate,
  useCandidateTimeline,
  useApplications,
  useCreateApplication,
  useUpdateApplication,
  useHiringRequests,
  type CandidateStage,
} from "@/hooks/admin-os/useRecruitment";

const stages: CandidateStage[] = [
  "applied", "screening", "hr_interview", "technical_interview",
  "manager_interview", "founder_interview", "final_review", "offer", "hired", "rejected", "withdrawn",
];

const CandidateDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_RECRUITMENT_MANAGE);

  const { data: cand, isLoading } = useCandidate(id);
  const { data: apps } = useApplications({ candidate_id: id });
  const { data: timeline } = useCandidateTimeline(id);
  const { data: openRequests } = useHiringRequests({ status: "approved" });
  const createApp = useCreateApplication();
  const updateApp = useUpdateApplication();

  const [linkOpen, setLinkOpen] = useState(false);
  const [chosenReq, setChosenReq] = useState("");

  if (!hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_RECRUITMENT_VIEW) && !canManage)
    return <Navigate to="/admin-os/no-access" replace />;
  if (isLoading) return <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!cand) return <div className="p-10 text-center text-sm text-muted-foreground">Not found.</div>;

  const link = async () => {
    if (!chosenReq) return;
    try {
      await createApp.mutateAsync({ candidate_id: cand.id, hiring_request_id: chosenReq });
      toast.success("Application created");
      setLinkOpen(false);
      setChosenReq("");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const moveStage = async (appId: string, stage: CandidateStage) => {
    try {
      await updateApp.mutateAsync({ id: appId, patch: { current_stage: stage } });
      toast.success(`Moved to ${stage}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <Link to="/admin-os/people-ops/recruitment/candidates" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Link>

      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
            {cand.full_name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold">{cand.full_name}</h1>
            <p className="text-xs text-muted-foreground">
              {cand.candidate_number} · {cand.email ?? "—"} · {cand.phone ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">{cand.headline ?? ""}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2 flex-wrap text-[11px]">
          <span className="px-2 py-0.5 rounded-full border border-border">Stage: {cand.current_stage}</span>
          <span className="px-2 py-0.5 rounded-full border border-border">Status: {cand.status}</span>
          {cand.source && <span className="px-2 py-0.5 rounded-full border border-border">Source: {cand.source}</span>}
          {cand.resume_url && (
            <a href={cand.resume_url} target="_blank" rel="noreferrer" className="px-2 py-0.5 rounded-full border border-primary/30 text-primary">
              Resume ↗
            </a>
          )}
        </div>
      </div>

      {/* Applications */}
      <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Applications</h2>
          {canManage && (
            <button onClick={() => setLinkOpen((o) => !o)}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-muted">
              <Plus className="h-3 w-3" /> Link to hiring request
            </button>
          )}
        </div>

        {linkOpen && (
          <div className="flex gap-2">
            <select value={chosenReq} onChange={(e) => setChosenReq(e.target.value)}
              className="flex-1 h-9 px-3 rounded-lg bg-background border border-border/60 text-sm">
              <option value="">Choose an approved request…</option>
              {openRequests?.map((r: any) => <option key={r.id} value={r.id}>{r.role_title} ({r.request_number})</option>)}
            </select>
            <button onClick={link} disabled={!chosenReq || createApp.isPending}
              className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold">Link</button>
          </div>
        )}

        {apps && apps.length > 0 ? (
          <div className="divide-y divide-border/60">
            {apps.map((a: any) => (
              <div key={a.id} className="py-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{a.hiring_request?.role_title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {a.hiring_request?.request_number} · stage {a.current_stage} · {a.status}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <Link to={`/admin-os/people-ops/recruitment/applications/${a.id}`}
                      className="rounded-md border border-border px-2 py-1 text-[11px] hover:bg-muted">Open pipeline</Link>
                    {canManage && (
                      <select value={a.current_stage}
                        onChange={(e) => moveStage(a.id, e.target.value as CandidateStage)}
                        className="h-7 px-2 rounded-md border border-border text-[11px] bg-background">
                        {stages.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No applications yet.</p>
        )}
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="text-sm font-semibold mb-2">Candidate Timeline</h2>
        {timeline && timeline.length > 0 ? (
          <ol className="space-y-2">
            {timeline.map((e) => (
              <li key={e.id} className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold">{e.event_type.replace(/_/g, " ")}</p>
                  <p className="text-[11px] text-muted-foreground">{e.notes}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(e.event_at).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-muted-foreground">No events yet.</p>
        )}
      </div>
    </div>
  );
};

export default CandidateDetail;

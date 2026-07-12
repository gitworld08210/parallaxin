import { useState } from "react";
import { Navigate, useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Plus } from "lucide-react";
import { z } from "zod";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  useApplications,
  useInterviewRounds,
  useScheduleInterview,
  useUpdateInterview,
  useInterviewFeedback,
  useSubmitFeedback,
  type CandidateStage,
} from "@/hooks/admin-os/useRecruitment";

const roundStages: CandidateStage[] = [
  "screening", "hr_interview", "technical_interview", "manager_interview", "founder_interview", "final_review",
];

const fbSchema = z.object({
  technical_rating: z.number().min(1).max(5).optional(),
  communication_rating: z.number().min(1).max(5).optional(),
  problem_solving_rating: z.number().min(1).max(5).optional(),
  culture_fit_rating: z.number().min(1).max(5).optional(),
  overall_rating: z.number().min(1).max(5).optional(),
  comments: z.string().trim().max(2000).optional(),
  recommendation: z.enum(["strong_hire", "hire", "no_hire", "strong_no_hire"]),
});

const RoundCard = ({ round, canInterview }: { round: any; canInterview: boolean }) => {
  const { data: feedback } = useInterviewFeedback(round.id);
  const submit = useSubmitFeedback();
  const update = useUpdateInterview();
  const [showFb, setShowFb] = useState(false);
  const [fb, setFb] = useState({
    technical_rating: 3, communication_rating: 3, problem_solving_rating: 3, culture_fit_rating: 3, overall_rating: 3,
    comments: "", recommendation: "hire" as "strong_hire" | "hire" | "no_hire" | "strong_no_hire",
  });

  const send = async () => {
    const parsed = fbSchema.safeParse(fb);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Invalid input"); return; }
    try {
      await submit.mutateAsync({ round_id: round.id, ...parsed.data });
      await update.mutateAsync({ id: round.id, patch: { status: "completed", decision:
        fb.recommendation === "strong_hire" || fb.recommendation === "hire" ? "pass" : "reject" } });
      toast.success("Feedback submitted");
      setShowFb(false);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-semibold">{round.stage.replace(/_/g, " ")} · round {round.sequence}</p>
          <p className="text-[11px] text-muted-foreground">
            {round.scheduled_at ? new Date(round.scheduled_at).toLocaleString() : "Unscheduled"} · {round.status} · decision: {round.decision}
          </p>
        </div>
        {canInterview && round.status !== "completed" && (
          <button onClick={() => setShowFb((s) => !s)}
            className="rounded-md border border-border px-2 py-1 text-[11px] hover:bg-muted">
            {showFb ? "Cancel" : "Submit feedback"}
          </button>
        )}
      </div>

      {showFb && canInterview && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(["technical_rating", "communication_rating", "problem_solving_rating", "culture_fit_rating", "overall_rating"] as const).map((k) => (
            <div key={k}>
              <label className="text-[11px] font-medium">{k.replace(/_/g, " ")}</label>
              <input type="number" min={1} max={5} value={fb[k]} onChange={(e) => setFb({ ...fb, [k]: Number(e.target.value) })}
                className="mt-0.5 w-full h-8 px-2 rounded-md bg-background border border-border/60 text-sm" />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="text-[11px] font-medium">Recommendation</label>
            <select value={fb.recommendation} onChange={(e) => setFb({ ...fb, recommendation: e.target.value as any })}
              className="mt-0.5 w-full h-8 px-2 rounded-md bg-background border border-border/60 text-sm">
              {["strong_hire", "hire", "no_hire", "strong_no_hire"].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] font-medium">Comments</label>
            <textarea rows={3} value={fb.comments} onChange={(e) => setFb({ ...fb, comments: e.target.value })}
              className="mt-0.5 w-full px-2 py-1.5 rounded-md bg-background border border-border/60 text-sm" />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button onClick={send} disabled={submit.isPending}
              className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold">
              Submit (immutable)
            </button>
          </div>
        </div>
      )}

      {feedback && feedback.length > 0 && (
        <div className="mt-2 space-y-1">
          {feedback.map((f) => (
            <div key={f.id} className="rounded-md border border-border/60 p-2 text-[11px]">
              <p><b>Rec:</b> {f.recommendation} · overall {f.overall_rating ?? "—"}/5</p>
              {f.comments && <p className="text-muted-foreground">{f.comments}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const InterviewPipeline = () => {
  const { applicationId } = useParams<{ applicationId?: string }>();
  const { hasPermission } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_RECRUITMENT_MANAGE);
  const canInterview = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_RECRUITMENT_INTERVIEW) || canManage;

  const { data: apps } = useApplications();
  const { data: rounds } = useInterviewRounds(applicationId);
  const schedule = useScheduleInterview();

  const [stage, setStage] = useState<CandidateStage>("hr_interview");
  const [when, setWhen] = useState("");

  if (!hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_RECRUITMENT_VIEW) && !canManage && !canInterview)
    return <Navigate to="/admin-os/no-access" replace />;

  if (!applicationId) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">PEOPLE OPS · INTERVIEW PIPELINE</p>
          <h1 className="text-xl font-bold">Pick an application</h1>
        </div>
        <div className="rounded-xl border border-border/60 bg-card divide-y divide-border/60">
          {apps?.map((a: any) => (
            <Link key={a.id} to={`/admin-os/people-ops/recruitment/applications/${a.id}`}
              className="flex items-center justify-between p-3 hover:bg-muted/40">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{a.candidate?.full_name} → {a.hiring_request?.role_title}</p>
                <p className="text-[11px] text-muted-foreground">{a.current_stage} · {a.status}</p>
              </div>
              <span className="text-[11px] text-muted-foreground">Open →</span>
            </Link>
          ))}
          {(!apps || apps.length === 0) && (
            <div className="p-10 text-center text-sm text-muted-foreground">No active applications.</div>
          )}
        </div>
      </div>
    );
  }

  const add = async () => {
    if (!applicationId) return;
    const nextSeq = (rounds?.length ?? 0) + 1;
    try {
      await schedule.mutateAsync({
        application_id: applicationId,
        stage,
        sequence: nextSeq,
        scheduled_at: when || null,
        status: "scheduled",
      });
      toast.success("Round scheduled");
      setWhen("");
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      <Link to="/admin-os/people-ops/recruitment/pipeline" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All pipelines
      </Link>
      <div>
        <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">PEOPLE OPS · INTERVIEW ROUNDS</p>
        <h1 className="text-xl font-bold">Interview Pipeline</h1>
      </div>

      {canManage && (
        <div className="rounded-xl border border-border/60 bg-card p-3 flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-[11px] font-medium">Stage</label>
            <select value={stage} onChange={(e) => setStage(e.target.value as CandidateStage)}
              className="mt-1 h-9 px-3 rounded-lg bg-background border border-border/60 text-sm">
              {roundStages.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium">Scheduled at</label>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
              className="mt-1 h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <button onClick={add} disabled={schedule.isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold">
            <Plus className="h-3.5 w-3.5" /> Schedule round
          </button>
        </div>
      )}

      <div className="space-y-2">
        {rounds && rounds.length > 0 ? (
          rounds.map((r) => <RoundCard key={r.id} round={r} canInterview={canInterview} />)
        ) : (
          <div className="p-6 text-center text-xs text-muted-foreground rounded-lg border border-border/60 border-dashed">
            No interview rounds yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewPipeline;

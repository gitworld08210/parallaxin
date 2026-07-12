import { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  useReviews,
  useReviewRatings,
  useSubmitRating,
  useFinalizeReview,
  useEnsureReview,
  usePerformanceCycles,
  type ReviewerRole,
  type ReviewStage,
  type PerformanceReview,
} from "@/hooks/admin-os/usePerformance";
import { useEmployeesList } from "@/hooks/admin-os/useEmployees";
import {
  PageHeader,
  SectionCard,
  DataTable,
  EmptyState,
  LoadingSkeleton,
  StatusBadge,
  type DataTableColumn,
} from "@/components/admin-os/ds";

const STAGE_TONE: Record<ReviewStage, "info" | "warning" | "success" | "neutral"> = {
  self: "info",
  team_lead: "info",
  department_head: "warning",
  hr: "warning",
  finalized: "success",
};

const NEXT_STAGE: Record<ReviewerRole, ReviewStage> = {
  self: "team_lead",
  team_lead: "department_head",
  department_head: "hr",
  hr: "hr", // finalize handled separately
};

const ReviewCenter = () => {
  const { hasPermission, employee } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PERFORMANCE_MANAGE);
  const canReview = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PERFORMANCE_REVIEW);
  const canView =
    hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PERFORMANCE_VIEW) || canManage || canReview;

  const cycles = usePerformanceCycles();
  const employees = useEmployeesList({});
  const reviews = useReviews();
  const ensure = useEnsureReview();
  const submitRating = useSubmitRating();
  const finalize = useFinalizeReview();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => (reviews.data ?? []).find((r) => r.id === selectedId) ?? null,
    [reviews.data, selectedId],
  );
  const ratings = useReviewRatings(selectedId ?? undefined);

  const [starterEmp, setStarterEmp] = useState("");
  const [starterCycle, setStarterCycle] = useState("");

  const [ratingRole, setRatingRole] = useState<ReviewerRole>("self");
  const [overall, setOverall] = useState(3);
  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [comments, setComments] = useState("");

  const [finalRating, setFinalRating] = useState(3);
  const [finalSummary, setFinalSummary] = useState("");

  if (!canView) return <Navigate to="/admin-os/no-access" replace />;

  const cols: DataTableColumn<PerformanceReview>[] = [
    { key: "emp", header: "Employee", cell: (r) => r.employee?.full_name ?? "—" },
    { key: "cycle", header: "Cycle", cell: (r) => r.cycle?.name ?? "—" },
    {
      key: "stage",
      header: "Stage",
      cell: (r) => <StatusBadge tone={STAGE_TONE[r.current_stage]} label={r.current_stage.replace("_", " ")} />,
    },
    { key: "rating", header: "Rating", cell: (r) => r.overall_rating ?? "—" },
    {
      key: "final",
      header: "Finalized",
      cell: (r) => (r.finalized ? new Date(r.finalized_at!).toLocaleDateString() : "—"),
    },
  ];

  const startReview = async () => {
    if (!starterEmp || !starterCycle) return toast.error("Employee & cycle required");
    try {
      const r = await ensure.mutateAsync({ employee_id: starterEmp, cycle_id: starterCycle });
      toast.success("Review ready");
      setSelectedId(r.id);
      reviews.refetch();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const canSubmitSelf = selected && employee?.id === selected.employee_id;
  const canSubmitOther = canReview || canManage;

  const doSubmit = async () => {
    if (!selected) return;
    if (ratingRole === "self" && !canSubmitSelf) return toast.error("Only the employee can submit self review");
    if (ratingRole !== "self" && !canSubmitOther) return toast.error("Permission required");
    try {
      await submitRating.mutateAsync({
        review_id: selected.id,
        reviewer_role: ratingRole,
        overall_rating: overall,
        strengths,
        weaknesses,
        improvement_suggestions: suggestions,
        comments,
        advanceStage: ratingRole === "hr" ? undefined : NEXT_STAGE[ratingRole],
      });
      toast.success("Rating submitted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const doFinalize = async () => {
    if (!selected) return;
    try {
      await finalize.mutateAsync({ review_id: selected.id, overall_rating: finalRating, summary: finalSummary });
      toast.success("Review finalized · passport updated");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People Ops · Performance"
        title="Review Center"
        description="Multi-stage review workflow: self → team lead → dept head → HR → finalized."
      />

      {(canReview || canManage) && (
        <SectionCard title="Start / open a review">
          <div className="grid gap-3 md:grid-cols-3">
            <select
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={starterEmp}
              onChange={(e) => setStarterEmp(e.target.value)}
            >
              <option value="">Select employee…</option>
              {(employees.data ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={starterCycle}
              onChange={(e) => setStarterCycle(e.target.value)}
            >
              <option value="">Select cycle…</option>
              {(cycles.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              onClick={startReview}
              disabled={ensure.isPending}
            >
              Open review
            </button>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Reviews">
        {reviews.error ? (
          <EmptyState title="Failed to load" description={(reviews.error as Error).message} />
        ) : reviews.isLoading ? (
          <LoadingSkeleton rows={4} />
        ) : (reviews.data ?? []).length === 0 ? (
          <EmptyState title="No reviews" description="Start the first review above." />
        ) : (
          <DataTable
            columns={cols}
            rows={reviews.data ?? []}
            rowKey={(r: PerformanceReview) => r.id}
            onRowClick={(r) => setSelectedId(r.id)}
          />
        )}
      </SectionCard>

      {selected && (
        <SectionCard
          title={`Review · ${selected.employee?.full_name ?? ""}`}
          description={`Cycle: ${selected.cycle?.name ?? "—"} · Stage: ${selected.current_stage}`}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Submitted ratings</h3>
              {ratings.isLoading ? (
                <LoadingSkeleton rows={2} />
              ) : (ratings.data ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No ratings yet.</p>
              ) : (
                <ul className="space-y-2">
                  {(ratings.data ?? []).map((r) => (
                    <li key={r.id} className="rounded-lg border border-border/60 bg-background p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase">{r.reviewer_role.replace("_", " ")}</span>
                        <span className="text-sm font-bold">{r.overall_rating}/5</span>
                      </div>
                      {r.strengths && <p className="text-xs mt-1"><b>Strengths:</b> {r.strengths}</p>}
                      {r.weaknesses && <p className="text-xs mt-1"><b>Weaknesses:</b> {r.weaknesses}</p>}
                      {r.improvement_suggestions && (
                        <p className="text-xs mt-1"><b>Suggestions:</b> {r.improvement_suggestions}</p>
                      )}
                      {r.comments && <p className="text-xs mt-1 text-muted-foreground">{r.comments}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">Submit rating</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs">Reviewer role</label>
                  <select
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    value={ratingRole}
                    onChange={(e) => setRatingRole(e.target.value as ReviewerRole)}
                  >
                    <option value="self">Self</option>
                    <option value="team_lead">Team Lead</option>
                    <option value="department_head">Department Head</option>
                    <option value="hr">HR</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs">Overall (0-5)</label>
                  <input
                    type="number"
                    step={0.1}
                    min={0}
                    max={5}
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    value={overall}
                    onChange={(e) => setOverall(Number(e.target.value))}
                  />
                </div>
              </div>
              <textarea
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                rows={2}
                placeholder="Strengths"
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
              />
              <textarea
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                rows={2}
                placeholder="Weaknesses"
                value={weaknesses}
                onChange={(e) => setWeaknesses(e.target.value)}
              />
              <textarea
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                rows={2}
                placeholder="Improvement suggestions"
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
              />
              <textarea
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                rows={2}
                placeholder="Reviewer comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
              <button
                className="w-full rounded-md bg-primary py-2 text-xs font-semibold text-primary-foreground"
                onClick={doSubmit}
                disabled={submitRating.isPending}
              >
                Submit rating
              </button>

              {(canManage || canReview) && !selected.finalized && (
                <div className="mt-3 rounded-lg border border-border p-3 space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">Finalize (HR validation)</h4>
                  <input
                    type="number"
                    step={0.1}
                    min={0}
                    max={5}
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    value={finalRating}
                    onChange={(e) => setFinalRating(Number(e.target.value))}
                    placeholder="Final overall rating"
                  />
                  <textarea
                    rows={2}
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    placeholder="Final summary (added to Employee Passport)"
                    value={finalSummary}
                    onChange={(e) => setFinalSummary(e.target.value)}
                  />
                  <button
                    className="w-full rounded-md bg-emerald-600 py-2 text-xs font-semibold text-white"
                    onClick={doFinalize}
                    disabled={finalize.isPending}
                  >
                    Finalize review
                  </button>
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
};

export default ReviewCenter;

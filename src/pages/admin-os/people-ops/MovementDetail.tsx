/**
 * Movement Detail — Phase 2.4.
 *
 * View, approve/reject each step, apply the movement, and inspect
 * source→target diff.
 */
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, PlayCircle, Ban } from "lucide-react";
import { toast } from "sonner";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  useMovement, useDecideApproval, useApplyMovement, useCancelMovement,
} from "@/hooks/admin-os/useMovements";
import {
  PageHeader, SectionCard, StatusBadge, LoadingSkeleton, PermissionDenied, EmptyState,
} from "@/components/admin-os/ds";
import { Button } from "@/components/ui/button";

const TONE: Record<string, any> = {
  draft: "neutral", pending_approval: "pending", approved: "info",
  rejected: "rejected", applied: "success", expired: "neutral", cancelled: "cancelled",
};

const DECISION_TONE: Record<string, any> = {
  pending: "pending", approved: "success", rejected: "rejected", skipped: "neutral",
};

const fmtDate = (v?: string | null) => v ? new Date(v).toLocaleDateString() : "—";

const MovementDetail = () => {
  const { id = "" } = useParams();
  const { hasPermission, employee } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_MOVEMENTS_MANAGE)
    || hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_EMPLOYEES_MANAGE)
    || hasPermission(ADMIN_PERMISSIONS.FOUNDER_OFFICE_ACCESS);
  const canApply = canManage || hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_MOVEMENTS_APPLY);

  const { data, isLoading, error } = useMovement(id);
  const decide = useDecideApproval();
  const apply = useApplyMovement();
  const cancel = useCancelMovement();

  if (isLoading) return <LoadingSkeleton rows={6} />;
  if (error) return <div className="p-6 text-danger">{(error as Error).message}</div>;
  if (!data?.movement) return <Navigate to="/admin-os/people-ops/movements" replace />;

  const m: any = data.movement;
  const approvals = data.approvals ?? [];
  const nextStep = approvals.find((a: any) => a.decision === "pending");
  const canDecide = !!nextStep && (canManage || (employee?.user_id ? true : false));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="MOVEMENT"
        title={`${m.kind.replace(/_/g, " ").toUpperCase()} · ${m.employee?.full_name ?? "—"}`}
        description={`Requested ${fmtDate(m.created_at)} · Effective ${fmtDate(m.effective_date)}`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/admin-os/people-ops/movements"><ArrowLeft className="h-3.5 w-3.5" /> Back</Link>
            </Button>
            {canApply && m.status === "approved" && (
              <Button size="sm" onClick={() => apply.mutate(m.id, {
                onSuccess: () => toast.success("Movement applied"),
                onError: (e: any) => toast.error(e.message),
              })}>
                <PlayCircle className="h-3.5 w-3.5" /> Apply now
              </Button>
            )}
            {canManage && ["draft", "pending_approval", "approved"].includes(m.status) && (
              <Button size="sm" variant="outline" onClick={() => cancel.mutate(m.id, {
                onSuccess: () => toast.success("Cancelled"),
              })}>
                <Ban className="h-3.5 w-3.5" /> Cancel
              </Button>
            )}
          </div>
        }
      />

      <SectionCard>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Employee" value={`${m.employee?.full_name} · ${m.employee?.employee_number}`} />
          <Field label="Status" value={<StatusBadge tone={TONE[m.status] ?? "neutral"} label={m.status.replace(/_/g, " ")} />} />
          <Field label="Kind" value={m.kind.replace(/_/g, " ")} />
          <Field label="Reason" value={m.reason ?? "—"} />
          <Field label="Justification" value={m.business_justification ?? "—"} />
          <Field label="Applied at" value={fmtDate(m.applied_at)} />
        </div>
      </SectionCard>

      <SectionCard title="Source → Target">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Source</p>
            <p>Department: {m.employee?.department?.name ?? "—"}</p>
            <p>Role: {m.employee?.role?.name ?? "—"}</p>
            <p>Manager: {m.employee?.reporting_manager?.full_name ?? "—"}</p>
            <p>Status: {m.employee?.employment_status}</p>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs font-semibold uppercase text-primary mb-2">Target</p>
            <p>Department: {m.target_department?.name ?? "—"}</p>
            <p>Role: {m.target_role?.name ?? "—"}</p>
            <p>Level: {m.target_level ?? "—"}</p>
            <p>Manager: {m.target_manager?.full_name ?? "—"}</p>
            <p>Team: {m.target_team_name ?? "—"}</p>
            <p>End date: {fmtDate(m.end_date)}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Approval chain">
        {approvals.length === 0 ? (
          <EmptyState title="No approval steps" />
        ) : (
          <ol className="space-y-2">
            {approvals.map((a: any) => (
              <li key={a.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold w-6 text-center rounded bg-muted">{a.step_order}</span>
                  <div>
                    <p className="text-sm font-medium uppercase tracking-wide">{a.role_key.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.decided_at ? `Decided ${fmtDate(a.decided_at)}` : "Awaiting decision"}
                      {a.note ? ` · ${a.note}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge tone={DECISION_TONE[a.decision] ?? "neutral"} label={a.decision} />
                  {canDecide && a.id === nextStep?.id && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => decide.mutate({
                        approval_id: a.id, decision: "rejected", movement_id: m.id,
                      }, { onSuccess: () => toast.success("Rejected") })}>
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </Button>
                      <Button size="sm" onClick={() => decide.mutate({
                        approval_id: a.id, decision: "approved", movement_id: m.id,
                      }, { onSuccess: () => toast.success("Approved") })}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    <div className="text-sm mt-0.5">{value}</div>
  </div>
);

export default MovementDetail;

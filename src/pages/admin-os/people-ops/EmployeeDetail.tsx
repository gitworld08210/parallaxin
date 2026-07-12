import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Shield, Calendar, Mail, Hash, Building2 } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import {
  useEmployeeDetail,
  useEmployeeAuditTrail,
  useTransitionEmployeeStatus,
} from "@/hooks/admin-os/useEmployees";
import {
  ADMIN_PERMISSIONS,
  EMPLOYMENT_STATUS_LABELS,
} from "@/features/admin-os/permissions";
import { toast } from "sonner";

const STATUS_TRANSITIONS: Record<string, string[]> = {
  candidate: ["offer_sent", "archived"],
  offer_sent: ["offer_accepted", "archived"],
  offer_accepted: ["pre_onboarding", "archived"],
  pre_onboarding: ["joining_today", "archived"],
  joining_today: ["active", "archived"],
  active: ["on_leave", "suspended", "resigned"],
  on_leave: ["active", "suspended", "resigned"],
  suspended: ["active", "resigned", "exited"],
  resigned: ["exited"],
  exited: ["archived"],
  archived: [],
};

const InfoRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
    <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
    <div className="flex-1 min-w-0 flex justify-between gap-3 items-center">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-right">{value ?? "—"}</span>
    </div>
  </div>
);

const EmployeeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useEmployee();
  const { data: emp, isLoading, error } = useEmployeeDetail(id);
  const { data: audit } = useEmployeeAuditTrail(id);
  const transition = useTransitionEmployeeStatus();
  const [reason, setReason] = useState("");
  const [nextStatus, setNextStatus] = useState<string | null>(null);

  if (!hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_EMPLOYEES_VIEW))
    return <Navigate to="/admin-os/no-access" replace />;

  const canManageBase = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_EMPLOYEES_MANAGE);
  const canFounderOverride = hasPermission(
    ADMIN_PERMISSIONS.FOUNDER_OFFICE_OVERRIDES,
  );

  if (isLoading)
    return <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>;
  if (error)
    return (
      <div className="p-10 text-center text-sm text-destructive">
        {(error as Error).message}
      </div>
    );
  if (!emp)
    return <div className="p-10 text-center text-sm text-muted-foreground">Not found.</div>;

  // Founders & co-founders are protected: only the Founder Office can
  // change their role, department, or lifecycle status.
  const isProtectedPrincipal =
    emp.user_type === "founder" || emp.user_type === "co_founder";
  const canManage = canManageBase && (!isProtectedPrincipal || canFounderOverride);

  const options = canManage ? STATUS_TRANSITIONS[emp.employment_status] ?? [] : [];

  const doTransition = async () => {
    if (!nextStatus || !reason.trim()) {
      toast.error("Reason is required for lifecycle transitions");
      return;
    }
    try {
      await transition.mutateAsync({
        id: emp.id,
        from_status: emp.employment_status,
        to_status: nextStatus,
        reason: reason.trim(),
      });
      toast.success(`Status changed to ${EMPLOYMENT_STATUS_LABELS[nextStatus] ?? nextStatus}`);
      setReason("");
      setNextStatus(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <Link
        to="/admin-os/people-ops"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to directory
      </Link>

      {/* Header card */}
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-lg font-bold overflow-hidden">
            {emp.photo_url ? (
              <img src={emp.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              emp.full_name.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
              EMPLOYEE PASSPORT
            </p>
            <h1 className="text-2xl font-bold">{emp.full_name}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {emp.role?.name ?? "—"} · {emp.department?.name ?? "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/admin-os/people-ops/${emp.id}/passport`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted"
            >
              <Shield className="h-3.5 w-3.5" /> Passport
            </Link>
            {canManage && (
              <Link
                to={`/admin-os/people-ops/${emp.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-secondary text-secondary-foreground px-3 py-1.5 text-xs font-semibold hover:bg-secondary/80"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Link>
            )}
          </div>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-x-6 gap-y-0">
          <InfoRow icon={Hash} label="Employee ID" value={emp.employee_number} />
          <InfoRow icon={Mail} label="Company email" value={emp.company_email} />
          <InfoRow icon={Building2} label="Department" value={emp.department?.name} />
          <InfoRow icon={Shield} label="Role" value={emp.role?.name} />
          <InfoRow icon={Hash} label="Level" value={emp.level} />
          <InfoRow
            icon={Shield}
            label="Status"
            value={EMPLOYMENT_STATUS_LABELS[emp.employment_status]}
          />
          <InfoRow icon={Calendar} label="Joining date" value={emp.joining_date} />
          <InfoRow icon={Calendar} label="Exit date" value={emp.exit_date} />
          <InfoRow icon={Shield} label="User type" value={emp.user_type} />
          <InfoRow
            icon={Shield}
            label="Reporting manager"
            value={emp.reporting_manager?.full_name}
          />
        </div>
      </div>

      {/* Lifecycle transition */}
      {canManage && options.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <h2 className="text-sm font-bold">Lifecycle Transition</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Every transition requires a reason and is logged immutably.
          </p>
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {options.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setNextStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    nextStatus === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border/60 hover:border-primary/50"
                  }`}
                >
                  → {EMPLOYMENT_STATUS_LABELS[s] ?? s}
                </button>
              ))}
            </div>
            {nextStatus && (
              <>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for this transition (mandatory)"
                  rows={3}
                  className="w-full rounded-lg bg-background border border-border/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="flex gap-2">
                  <button
                    onClick={doTransition}
                    disabled={transition.isPending}
                    className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
                  >
                    {transition.isPending ? "Applying…" : "Confirm transition"}
                  </button>
                  <button
                    onClick={() => {
                      setNextStatus(null);
                      setReason("");
                    }}
                    className="rounded-lg bg-secondary text-secondary-foreground px-4 py-2 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Audit trail */}
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <h2 className="text-sm font-bold">Audit Trail</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Immutable log of every change to this employee record.
        </p>
        <div className="mt-4 divide-y divide-border/40">
          {(!audit || audit.length === 0) && (
            <p className="text-xs text-muted-foreground py-4">No audit entries yet.</p>
          )}
          {audit?.map((a) => (
            <div key={a.id} className="py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold">{a.action}</p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {a.module}
                </p>
                {a.after && (a.after as any).reason && (
                  <p className="text-[11px] text-muted-foreground mt-1 italic">
                    "{(a.after as any).reason}"
                  </p>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {new Date(a.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetailPage;

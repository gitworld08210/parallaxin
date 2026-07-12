import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, AlertTriangle } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import {
  useCreateEmployee,
  useDepartments,
  useEmployeeDetail,
  useRoles,
  useUpdateEmployee,
} from "@/hooks/admin-os/useEmployees";
import { useAppointments } from "@/hooks/admin-os/useAppointments";
import {
  ADMIN_PERMISSIONS,
  EMPLOYMENT_STATUS_LABELS,
} from "@/features/admin-os/permissions";
import { toast } from "sonner";

const USER_TYPES = ["founder", "co_founder", "executive", "employee", "contractor", "temporary"];

interface Props {
  mode: "create" | "edit";
}

const EmployeeForm = ({ mode }: Props) => {
  const { hasPermission, employee } = useEmployee();
  const nav = useNavigate();
  const params = useParams<{ id: string }>();
  const { data: existing } = useEmployeeDetail(mode === "edit" ? params.id : undefined);
  const { data: departments } = useDepartments();
  const { data: roles } = useRoles();
  const { data: appointments } = useAppointments();
  const create = useCreateEmployee();
  const update = useUpdateEmployee();

  const callerRoleKey = (employee as any)?.role?.key;
  const isFounder = callerRoleKey === "founder" || callerRoleKey === "co_founder";
  const hrHeadActive = (appointments ?? []).some(
    (a) => a.slot_key === "hr_head" && !a.revoked_at,
  );
  const hrLocked = mode === "create" && !isFounder && !hrHeadActive;

  const [form, setForm] = useState({
    full_name: "",
    company_email: "",
    employee_number: "",
    department_id: "",
    role_id: "",
    user_type: "employee",
    employment_status: "pre_onboarding",
    level: "",
    joining_date: "",
    reporting_manager_id: "",
  });

  useEffect(() => {
    if (mode === "edit" && existing) {
      setForm({
        full_name: existing.full_name,
        company_email: existing.company_email,
        employee_number: existing.employee_number,
        department_id: existing.department?.id ?? "",
        role_id: existing.role?.id ?? "",
        user_type: existing.user_type,
        employment_status: existing.employment_status,
        level: existing.level ?? "",
        joining_date: existing.joining_date ?? "",
        reporting_manager_id: existing.reporting_manager_id ?? "",
      });
    }
  }, [mode, existing]);

  if (!hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_EMPLOYEES_MANAGE))
    return <Navigate to="/admin-os/no-access" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hrLocked) {
      toast.error("Head of People Operations must be appointed by the Founder Office before hiring employees.");
      return;
    }
    try {
      if (mode === "create") {
        // employee_number is auto-generated server-side; omit if empty
        const payload: any = { ...form };
        if (!payload.employee_number) delete payload.employee_number;
        const created = await create.mutateAsync({
          ...payload,
          level: form.level || null,
          joining_date: form.joining_date || null,
          reporting_manager_id: form.reporting_manager_id || null,
        });
        toast.success(`${created.full_name} created`);
        nav(`/admin-os/people-ops/${created.id}`);
      } else if (existing) {
        await update.mutateAsync({
          id: existing.id,
          before: existing as any,
          patch: {
            full_name: form.full_name,
            company_email: form.company_email,
            department_id: form.department_id,
            role_id: form.role_id,
            level: form.level || null,
            joining_date: form.joining_date || null,
            reporting_manager_id: form.reporting_manager_id || null,
          },
        });
        toast.success("Employee updated");
        nav(`/admin-os/people-ops/${existing.id}`);
      }
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const field = (label: string, node: React.ReactNode) => (
    <label className="block">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <div className="mt-1">{node}</div>
    </label>
  );

  const inp =
    "w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        to={mode === "edit" && existing ? `/admin-os/people-ops/${existing.id}` : "/admin-os/people-ops"}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Link>

      <div>
        <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
          PEOPLE OPS
        </p>
        <h1 className="text-2xl font-bold">
          {mode === "create" ? "New Employee" : "Edit Employee"}
        </h1>
      </div>

      {hrLocked && (
        <div className="rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                Head of People Operations not yet appointed
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Only the Founder Office can hire employees before the Head of People Operations is
                appointed. Ask a founder to appoint a Head of People Operations from{" "}
                <Link
                  to="/admin-os/founder-office/appointments"
                  className="text-primary font-semibold underline"
                >
                  Founder Office → Executive Appointments
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          {field(
            "Full name",
            <input
              required
              className={inp}
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />,
          )}
          {field(
            "Company email",
            <input
              required
              type="email"
              className={inp}
              value={form.company_email}
              onChange={(e) => setForm({ ...form, company_email: e.target.value })}
            />,
          )}
          {field(
            "Employee ID",
            <input
              className={`${inp} bg-muted/40 text-muted-foreground`}
              value={mode === "edit" ? form.employee_number : "Auto-generated (AURE###)"}
              disabled
              readOnly
            />,
          )}
          {field(
            "Level",
            <input
              className={inp}
              placeholder="e.g. L3"
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
            />,
          )}
          {field(
            "Department",
            <select
              required
              className={inp}
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value })}
            >
              <option value="">Select…</option>
              {departments?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>,
          )}
          {field(
            "Role",
            <select
              required
              className={inp}
              value={form.role_id}
              onChange={(e) => setForm({ ...form, role_id: e.target.value })}
            >
              <option value="">Select…</option>
              {roles?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>,
          )}
          {field(
            "User type",
            <select
              required
              className={inp}
              value={form.user_type}
              onChange={(e) => setForm({ ...form, user_type: e.target.value })}
            >
              {USER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>,
          )}
          {mode === "create" &&
            field(
              "Initial status",
              <select
                required
                className={inp}
                value={form.employment_status}
                onChange={(e) =>
                  setForm({ ...form, employment_status: e.target.value })
                }
              >
                {[
                  "candidate",
                  "offer_sent",
                  "offer_accepted",
                  "pre_onboarding",
                  "joining_today",
                ].map((s) => (
                  <option key={s} value={s}>
                    {EMPLOYMENT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>,
            )}
          {field(
            "Joining date",
            <input
              type="date"
              className={inp}
              value={form.joining_date}
              onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
            />,
          )}
        </div>

        <div className="pt-2 flex gap-2">
          <button
            type="submit"
            disabled={create.isPending || update.isPending || hrLocked}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {create.isPending || update.isPending
              ? "Saving…"
              : mode === "create"
                ? "Create employee"
                : "Save changes"}
          </button>
          <Link
            to="/admin-os/people-ops"
            className="rounded-lg bg-secondary text-secondary-foreground px-4 py-2 text-xs font-semibold"
          >
            Cancel
          </Link>
        </div>

        {mode === "create" && (
          <p className="text-[11px] text-muted-foreground pt-2">
            After creation, the employee must be linked to a login account by HR. Password
            change and 2FA are enforced on first login per Phase 1.3.
          </p>
        )}
      </form>
    </div>
  );
};

export default EmployeeForm;

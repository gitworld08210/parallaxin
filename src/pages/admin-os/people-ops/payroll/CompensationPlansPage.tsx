import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Building2, Plus } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import { useCompPlans, useSavePlan, type CompType } from "@/hooks/admin-os/usePayroll";

const TYPES: { v: CompType; l: string }[] = [
  { v: "monthly_salary", l: "Monthly Salary" },
  { v: "hourly", l: "Hourly" },
  { v: "intern_stipend", l: "Intern Stipend" },
  { v: "contract", l: "Contract" },
  { v: "project_based", l: "Project Based" },
];

const CompensationPlansPage = () => {
  const { hasPermission } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_COMPENSATION_MANAGE);
  const canView = canManage || hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PAYROLL_VIEW);
  if (!canView) return <Navigate to="/admin-os/no-access" replace />;

  const { data: plans, isLoading } = useCompPlans();
  const save = useSavePlan();
  const [form, setForm] = useState({ name: "", comp_type: "monthly_salary" as CompType, currency: "INR", description: "" });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            PAYROLL · COMPENSATION PLANS
          </p>
          <h1 className="text-2xl font-bold">Compensation Plans</h1>
        </div>
      </div>

      {canManage && (
        <div className="rounded-xl border border-border/60 bg-card p-4 grid gap-2 md:grid-cols-4">
          <input placeholder="Name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          <select value={form.comp_type}
            onChange={(e) => setForm({ ...form, comp_type: e.target.value as CompType })}
            className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm">
            {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
          <input placeholder="Currency" value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
            className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          <div className="flex gap-2">
            <input placeholder="Description" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm flex-1" />
            <button
              disabled={!form.name || save.isPending}
              onClick={() => save.mutate(form, { onSuccess: () => setForm({ name: "", comp_type: "monthly_salary", currency: "INR", description: "" }) })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3.5 h-9 text-xs font-semibold hover:bg-primary/90 disabled:opacity-50">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !plans || plans.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No plans yet.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {plans.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{p.description ?? "—"}</p>
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-muted">
                  {p.comp_type.replace(/_/g, " ")}
                </span>
                <span className="text-xs font-mono">{p.currency}</span>
                {canManage && (
                  <button
                    onClick={() => save.mutate({ id: p.id, name: p.name, comp_type: p.comp_type, is_active: !p.is_active })}
                    className="text-[11px] px-2 py-1 rounded border border-border hover:bg-muted">
                    {p.is_active ? "Disable" : "Enable"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompensationPlansPage;

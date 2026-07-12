import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Gift, Plus, UserPlus } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import { useEmployeesList } from "@/hooks/admin-os/useEmployees";
import {
  useBenefits, useEmployeeBenefits, useEnrollBenefit, useSaveBenefit,
} from "@/hooks/admin-os/usePayroll";

const CATEGORIES = ["Medical","Life","Food","Transport","Remote work","Other"];

const BenefitsCenter = () => {
  const { hasPermission } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_BENEFITS_MANAGE);
  const canView = canManage || hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PAYROLL_VIEW);
  if (!canView) return <Navigate to="/admin-os/no-access" replace />;

  const { data: benefits, isLoading } = useBenefits();
  const { data: employees } = useEmployeesList({});
  const save = useSaveBenefit();
  const enroll = useEnrollBenefit();

  const [form, setForm] = useState({ name: "", category: "Medical", monthly_cost: 0, description: "" });
  const [empId, setEmpId] = useState("");
  const { data: enrollments } = useEmployeeBenefits(empId || undefined);

  const [enrollForm, setEnrollForm] = useState({
    benefit_id: "", enrolled_from: new Date().toISOString().slice(0, 10),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Gift className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            PAYROLL · BENEFITS
          </p>
          <h1 className="text-2xl font-bold">Benefits</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          {canManage && (
            <div className="rounded-xl border border-border/60 bg-card p-4 grid gap-2 md:grid-cols-4">
              <input placeholder="Name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm md:col-span-2" />
              <select value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" min={0} placeholder="Monthly cost" value={form.monthly_cost}
                onChange={(e) => setForm({ ...form, monthly_cost: Number(e.target.value) })}
                className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
              <input placeholder="Description" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm md:col-span-3" />
              <button
                disabled={!form.name || save.isPending}
                onClick={() => save.mutate(form, { onSuccess: () => setForm({ name: "", category: "Medical", monthly_cost: 0, description: "" }) })}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3.5 h-9 text-xs font-semibold hover:bg-primary/90 disabled:opacity-50">
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
          )}
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60 text-xs font-bold tracking-[0.15em] text-muted-foreground">
              CATALOG
            </div>
            {isLoading ? (
              <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
            ) : !benefits || benefits.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">No benefits.</div>
            ) : (
              <div className="divide-y divide-border/60">
                {benefits.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{b.name}</p>
                      <p className="text-[11px] text-muted-foreground">{b.category} · {b.description ?? ""}</p>
                    </div>
                    <p className="text-sm font-semibold">{Number(b.monthly_cost).toLocaleString()}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${b.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-muted"}`}>
                      {b.is_active ? "active" : "inactive"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
          <p className="text-xs font-bold tracking-[0.15em] text-muted-foreground">EMPLOYEE ENROLLMENTS</p>
          <select value={empId} onChange={(e) => setEmpId(e.target.value)}
            className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm w-full">
            <option value="">Select employee</option>
            {employees?.map((e) => (
              <option key={e.id} value={e.id}>{e.full_name}</option>
            ))}
          </select>

          {empId && canManage && (
            <div className="grid gap-2 md:grid-cols-3">
              <select value={enrollForm.benefit_id}
                onChange={(e) => setEnrollForm({ ...enrollForm, benefit_id: e.target.value })}
                className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm md:col-span-2">
                <option value="">Select benefit</option>
                {benefits?.filter((b) => b.is_active).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <input type="date" value={enrollForm.enrolled_from}
                onChange={(e) => setEnrollForm({ ...enrollForm, enrolled_from: e.target.value })}
                className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
              <button
                disabled={!enrollForm.benefit_id || enroll.isPending}
                onClick={() => enroll.mutate({
                  employee_id: empId,
                  benefit_id: enrollForm.benefit_id,
                  enrolled_from: enrollForm.enrolled_from,
                }, { onSuccess: () => setEnrollForm({ ...enrollForm, benefit_id: "" }) })}
                className="md:col-span-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3.5 h-9 text-xs font-semibold hover:bg-primary/90 disabled:opacity-50">
                <UserPlus className="h-3.5 w-3.5" /> Enroll
              </button>
            </div>
          )}

          {empId && (
            <div className="divide-y divide-border/60 border rounded-lg border-border/60">
              {!enrollments || enrollments.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No enrollments yet.</div>
              ) : enrollments.map((e: any) => (
                <div key={e.id} className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{e.benefit?.name ?? "—"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      from {e.enrolled_from}{e.enrolled_to ? ` to ${e.enrolled_to}` : ""}
                    </p>
                  </div>
                  <p className="text-xs font-semibold">{Number(e.benefit?.monthly_cost ?? 0).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BenefitsCenter;

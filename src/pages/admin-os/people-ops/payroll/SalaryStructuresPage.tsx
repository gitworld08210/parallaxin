import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Plus, Wallet } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import { useEmployeesList } from "@/hooks/admin-os/useEmployees";
import {
  useActiveSalaries, useCompPlans, useSalaryStructures, useSaveSalaryStructure,
} from "@/hooks/admin-os/usePayroll";

const SalaryStructuresPage = () => {
  const { hasPermission } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_COMPENSATION_MANAGE);
  const canView = canManage || hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PAYROLL_VIEW);
  if (!canView) return <Navigate to="/admin-os/no-access" replace />;

  const { data: employees } = useEmployeesList({});
  const { data: plans } = useCompPlans();
  const { data: active, isLoading } = useActiveSalaries();
  const save = useSaveSalaryStructure();

  const [empId, setEmpId] = useState<string>("");
  const { data: history } = useSalaryStructures(empId || undefined);

  const [form, setForm] = useState({
    plan_id: "", currency: "INR",
    basic: 0, house_allowance: 0, transport_allowance: 0,
    medical_allowance: 0, special_allowance: 0,
    effective_from: new Date().toISOString().slice(0, 10),
    status: "active" as const, notes: "",
  });

  const preview = useMemo(
    () => form.basic + form.house_allowance + form.transport_allowance + form.medical_allowance + form.special_allowance,
    [form],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            PAYROLL · SALARY STRUCTURES
          </p>
          <h1 className="text-2xl font-bold">Salary Structures</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 text-xs font-bold tracking-[0.15em] text-muted-foreground">
            ACTIVE STRUCTURES
          </div>
          {isLoading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : !active || active.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">None yet.</div>
          ) : (
            <div className="divide-y divide-border/60 max-h-[60vh] overflow-auto">
              {active.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => setEmpId(s.employee_id)}
                  className={`w-full text-left flex items-center gap-3 p-3 hover:bg-muted/40 ${empId === s.employee_id ? "bg-muted/40" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{s.employee?.full_name ?? "—"}</p>
                    <p className="text-[11px] text-muted-foreground">from {s.effective_from}</p>
                  </div>
                  <p className="text-sm font-semibold">{s.currency} {Number(s.gross_monthly).toLocaleString()}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {canManage ? (
          <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
            <p className="text-xs font-bold tracking-[0.15em] text-muted-foreground">NEW / UPDATE STRUCTURE</p>
            <select value={empId} onChange={(e) => setEmpId(e.target.value)}
              className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm w-full">
              <option value="">Select employee</option>
              {employees?.map((e) => (
                <option key={e.id} value={e.id}>{e.full_name} · {e.employee_number}</option>
              ))}
            </select>
            <select value={form.plan_id}
              onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
              className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm w-full">
              <option value="">No plan</option>
              {plans?.filter((p) => p.is_active).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              {(["basic","house_allowance","transport_allowance","medical_allowance","special_allowance"] as const).map((k) => (
                <label key={k} className="flex flex-col text-xs gap-1">
                  <span className="text-muted-foreground">{k.replace(/_/g, " ")}</span>
                  <input type="number" min={0} value={(form as any)[k]}
                    onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })}
                    className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
                </label>
              ))}
              <label className="flex flex-col text-xs gap-1">
                <span className="text-muted-foreground">Effective from</span>
                <input type="date" value={form.effective_from}
                  onChange={(e) => setForm({ ...form, effective_from: e.target.value })}
                  className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
              </label>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Gross preview:</p>
              <p className="text-sm font-bold">{form.currency} {preview.toLocaleString()}</p>
            </div>
            <button
              disabled={!empId || preview === 0 || save.isPending}
              onClick={() => save.mutate(
                { ...form, plan_id: form.plan_id || null, employee_id: empId },
                { onSuccess: () => setForm({ ...form, notes: "" }) },
              )}
              className="w-full inline-flex justify-center items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3.5 h-9 text-xs font-semibold hover:bg-primary/90 disabled:opacity-50">
              <Plus className="h-3.5 w-3.5" /> Save structure
            </button>

            {history && history.length > 0 && (
              <div className="pt-3 border-t border-border/60">
                <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground mb-2">HISTORY</p>
                <ul className="space-y-1">
                  {history.map((h) => (
                    <li key={h.id} className="text-xs flex justify-between border-b border-border/40 py-1">
                      <span>{h.effective_from} · {h.status}</span>
                      <span className="font-semibold">{h.currency} {Number(h.gross_monthly).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-card p-4 text-sm text-muted-foreground">
            You have read-only access.
          </div>
        )}
      </div>
    </div>
  );
};

export default SalaryStructuresPage;

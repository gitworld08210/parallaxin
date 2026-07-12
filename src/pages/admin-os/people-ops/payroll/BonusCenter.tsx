import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Award, Plus } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import { useEmployeesList } from "@/hooks/admin-os/useEmployees";
import {
  useBonuses, useDecideBonus, useSaveBonus, type BonusType,
} from "@/hooks/admin-os/usePayroll";

const TYPES: BonusType[] = ["performance","festival","joining","retention","referral","spot_award","custom"];

const BonusCenter = () => {
  const { hasPermission } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_BONUS_MANAGE);
  const canView = canManage || hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PAYROLL_VIEW);
  if (!canView) return <Navigate to="/admin-os/no-access" replace />;

  const { data: bonuses, isLoading } = useBonuses();
  const { data: employees } = useEmployeesList({});
  const save = useSaveBonus();
  const decide = useDecideBonus();
  const [form, setForm] = useState({
    employee_id: "", bonus_type: "performance" as BonusType,
    amount: 0, reason: "",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Award className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            PAYROLL · BONUSES & INCENTIVES
          </p>
          <h1 className="text-2xl font-bold">Bonuses</h1>
        </div>
      </div>

      {canManage && (
        <div className="rounded-xl border border-border/60 bg-card p-4 grid gap-2 md:grid-cols-5">
          <select value={form.employee_id}
            onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
            className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm md:col-span-2">
            <option value="">Select employee</option>
            {employees?.map((e) => (
              <option key={e.id} value={e.id}>{e.full_name}</option>
            ))}
          </select>
          <select value={form.bonus_type}
            onChange={(e) => setForm({ ...form, bonus_type: e.target.value as BonusType })}
            className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm">
            {TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
          <input type="number" min={0} value={form.amount} placeholder="Amount"
            onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          <button
            disabled={!form.employee_id || !form.amount || !form.reason || save.isPending}
            onClick={() => save.mutate(form, { onSuccess: () => setForm({ ...form, amount: 0, reason: "" }) })}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3.5 h-9 text-xs font-semibold hover:bg-primary/90 disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
          <input placeholder="Reason" value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm md:col-span-5" />
        </div>
      )}

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !bonuses || bonuses.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No bonuses.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {bonuses.map((b: any) => (
              <div key={b.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="flex-1 min-w-[240px]">
                  <p className="text-sm font-semibold">
                    {b.employee?.full_name ?? "—"}
                    <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full border bg-muted">{b.bonus_type}</span>
                    <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full border bg-muted">{b.status}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">{b.reason}</p>
                </div>
                <p className="text-sm font-semibold">{b.currency} {Number(b.amount).toLocaleString()}</p>
                {canManage && b.status === "draft" && (
                  <button onClick={() => decide.mutate({ id: b.id, decision: "approved" })}
                    className="text-[11px] px-2 py-1 rounded border border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10">
                    Approve
                  </button>
                )}
                {canManage && b.status === "approved" && (
                  <button onClick={() => decide.mutate({ id: b.id, decision: "paid" })}
                    className="text-[11px] px-2 py-1 rounded border border-primary/40 text-primary hover:bg-primary/10">
                    Mark paid
                  </button>
                )}
                {canManage && (b.status === "draft" || b.status === "approved") && (
                  <button onClick={() => decide.mutate({ id: b.id, decision: "rejected" })}
                    className="text-[11px] px-2 py-1 rounded border border-red-500/40 text-red-500 hover:bg-red-500/10">
                    Reject
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

export default BonusCenter;

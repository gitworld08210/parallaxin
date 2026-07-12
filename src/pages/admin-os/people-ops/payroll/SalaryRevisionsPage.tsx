import { useState } from "react";
import { Navigate } from "react-router-dom";
import { FileSpreadsheet, Plus } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import { useEmployeesList } from "@/hooks/admin-os/useEmployees";
import {
  useCreateRevision, useReviewRevision, useSalaryRevisions, type RevStatus,
} from "@/hooks/admin-os/usePayroll";

const NEXT: Partial<Record<RevStatus, RevStatus>> = {
  pending_hr: "pending_finance",
  pending_finance: "pending_founder",
  pending_founder: "approved",
};

const SalaryRevisionsPage = () => {
  const { hasPermission } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_COMPENSATION_MANAGE);
  const canView = canManage || hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PAYROLL_VIEW);
  if (!canView) return <Navigate to="/admin-os/no-access" replace />;

  const { data: revisions, isLoading } = useSalaryRevisions();
  const { data: employees } = useEmployeesList({});
  const create = useCreateRevision();
  const review = useReviewRevision();

  const [form, setForm] = useState({
    employee_id: "", reason: "", proposed_gross: 0,
    effective_date: new Date().toISOString().slice(0, 10),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <FileSpreadsheet className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            PAYROLL · SALARY REVISIONS
          </p>
          <h1 className="text-2xl font-bold">Salary Revisions</h1>
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
          <input type="number" min={0} placeholder="Proposed gross" value={form.proposed_gross}
            onChange={(e) => setForm({ ...form, proposed_gross: Number(e.target.value) })}
            className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          <input type="date" value={form.effective_date}
            onChange={(e) => setForm({ ...form, effective_date: e.target.value })}
            className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          <button
            disabled={!form.employee_id || !form.reason || create.isPending}
            onClick={() => create.mutate(form, { onSuccess: () =>
              setForm({ employee_id: "", reason: "", proposed_gross: 0, effective_date: form.effective_date })
            })}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3.5 h-9 text-xs font-semibold hover:bg-primary/90 disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" /> Request
          </button>
          <input placeholder="Reason" value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm md:col-span-5" />
        </div>
      )}

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !revisions || revisions.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No revisions.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {revisions.map((r: any) => {
              const next = NEXT[r.status as RevStatus];
              return (
                <div key={r.id} className="flex flex-wrap items-center gap-3 p-3">
                  <div className="flex-1 min-w-[240px]">
                    <p className="text-sm font-semibold">
                      {r.employee?.full_name ?? "—"}
                      <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full border bg-muted">
                        {r.status.replace(/_/g, " ")}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">{r.reason}</p>
                    <p className="text-[11px] text-muted-foreground">effective {r.effective_date}</p>
                  </div>
                  <p className="text-sm font-semibold">
                    {r.proposed_gross ? Number(r.proposed_gross).toLocaleString() : "—"}
                  </p>
                  {canManage && next && (
                    <button onClick={() => review.mutate({ id: r.id, next })}
                      className="text-[11px] px-2 py-1 rounded border border-border hover:bg-muted">
                      Advance
                    </button>
                  )}
                  {canManage && r.status !== "approved" && r.status !== "rejected" && (
                    <button onClick={() => review.mutate({ id: r.id, next: "rejected", rejection_reason: "Rejected" })}
                      className="text-[11px] px-2 py-1 rounded border border-red-500/40 text-red-500 hover:bg-red-500/10">
                      Reject
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SalaryRevisionsPage;

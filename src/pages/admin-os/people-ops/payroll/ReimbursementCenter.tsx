import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Plus, Receipt } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  useReimbursements, useReviewReimbursement, useSubmitReimbursement,
  type ReimbStatus,
} from "@/hooks/admin-os/usePayroll";

const NEXT: Partial<Record<ReimbStatus, ReimbStatus>> = {
  pending_manager: "pending_finance",
  pending_finance: "approved",
  approved: "paid",
};

const CATEGORIES = ["Travel","Meals","Software","Equipment","Training","Client","Other"];

const ReimbursementCenter = () => {
  const { hasPermission } = useEmployee();
  const { employee } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_REIMBURSEMENT_MANAGE);
  const canView = canManage || hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PAYROLL_VIEW);
  if (!canView && !employee) return <Navigate to="/admin-os/no-access" replace />;

  const { data, isLoading } = useReimbursements();
  const submit = useSubmitReimbursement();
  const review = useReviewReimbursement();

  const [form, setForm] = useState({
    category: "Travel", amount: 0, description: "",
    expense_date: new Date().toISOString().slice(0, 10),
    receipt_url: "",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Receipt className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            PAYROLL · REIMBURSEMENTS
          </p>
          <h1 className="text-2xl font-bold">Reimbursement Center</h1>
        </div>
      </div>

      {employee && (
        <div className="rounded-xl border border-border/60 bg-card p-4 grid gap-2 md:grid-cols-5">
          <select value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="number" min={0} placeholder="Amount" value={form.amount}
            onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          <input type="date" value={form.expense_date}
            onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
            className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          <input placeholder="Receipt URL (optional)" value={form.receipt_url}
            onChange={(e) => setForm({ ...form, receipt_url: e.target.value })}
            className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm md:col-span-2" />
          <input placeholder="Description" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm md:col-span-4" />
          <button
            disabled={!form.amount || !form.description || submit.isPending}
            onClick={() => submit.mutate(
              { ...form, employee_id: employee.id, receipt_url: form.receipt_url || null },
              { onSuccess: () => setForm({ ...form, amount: 0, description: "", receipt_url: "" }) },
            )}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3.5 h-9 text-xs font-semibold hover:bg-primary/90 disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" /> Submit
          </button>
        </div>
      )}

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !data || data.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No claims.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {data.map((r: any) => {
              const next = NEXT[r.status as ReimbStatus];
              return (
                <div key={r.id} className="flex flex-wrap items-center gap-3 p-3">
                  <div className="flex-1 min-w-[240px]">
                    <p className="text-sm font-semibold">
                      {r.employee?.full_name ?? "—"}
                      <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full border bg-muted">{r.category}</span>
                      <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full border bg-muted">
                        {r.status.replace(/_/g, " ")}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.description} · {r.expense_date}
                    </p>
                    {r.receipt_url && (
                      <a href={r.receipt_url} target="_blank" rel="noreferrer"
                        className="text-[11px] text-primary hover:underline">Receipt</a>
                    )}
                  </div>
                  <p className="text-sm font-semibold">{r.currency} {Number(r.amount).toLocaleString()}</p>
                  {canManage && next && (
                    <button onClick={() => review.mutate({ id: r.id, next })}
                      className="text-[11px] px-2 py-1 rounded border border-border hover:bg-muted">
                      → {next.replace(/_/g, " ")}
                    </button>
                  )}
                  {canManage && r.status !== "approved" && r.status !== "paid" && r.status !== "rejected" && (
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

export default ReimbursementCenter;

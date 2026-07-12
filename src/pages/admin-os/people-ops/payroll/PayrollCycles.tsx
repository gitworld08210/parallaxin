import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Calendar, Plus } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import { useCreateCycle, usePayrollCycles } from "@/hooks/admin-os/usePayroll";

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  finance_review: "bg-sky-500/10 text-sky-500 border-sky-500/20",
  hr_review: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  founder_review: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  approved: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  released: "bg-emerald-600/20 text-emerald-500 border-emerald-500/30",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
};

const PayrollCycles = () => {
  const { hasPermission } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PAYROLL_MANAGE);
  const canView = canManage || hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PAYROLL_VIEW);
  if (!canView) return <Navigate to="/admin-os/no-access" replace />;

  const { data: cycles, isLoading } = usePayrollCycles();
  const createCycle = useCreateCycle();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [notes, setNotes] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
              PAYROLL · CYCLES
            </p>
            <h1 className="text-2xl font-bold">Payroll Cycles</h1>
          </div>
        </div>
      </div>

      {canManage && (
        <div className="rounded-xl border border-border/60 bg-card p-4 flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-xs gap-1">
            <span className="text-muted-foreground">Period (month)</span>
            <input
              type="month" value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm"
            />
          </label>
          <label className="flex flex-col text-xs gap-1 flex-1 min-w-[240px]">
            <span className="text-muted-foreground">Notes</span>
            <input
              type="text" value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm"
            />
          </label>
          <button
            disabled={createCycle.isPending}
            onClick={() =>
              createCycle.mutate({
                period_month: `${month}-01`,
                notes: notes || undefined,
              }, { onSuccess: () => setNotes("") })
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3.5 h-9 text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> New cycle
          </button>
        </div>
      )}

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !cycles || cycles.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No payroll cycles yet.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {cycles.map((c) => {
              const totals = (c.totals ?? {}) as any;
              return (
                <Link key={c.id} to={c.id}
                  className="flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{c.period_month}</p>
                      <span className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColor[c.status] ?? ""}`}>
                        {c.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.notes ?? "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {c.currency} {Number(totals.net_pay ?? 0).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {Number(totals.employees ?? 0)} employees
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PayrollCycles;

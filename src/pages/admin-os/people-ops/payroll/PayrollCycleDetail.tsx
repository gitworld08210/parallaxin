import { Navigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, PlayCircle, CheckCircle2, Rocket } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  useAdvanceCycle, useGenerateCycle, usePayrollCycle, usePayrollItems,
  type CycleStatus,
} from "@/hooks/admin-os/usePayroll";

const NEXT: Partial<Record<CycleStatus, CycleStatus>> = {
  finance_review: "hr_review",
  hr_review: "founder_review",
  founder_review: "approved",
  approved: "released",
};

const PayrollCycleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PAYROLL_MANAGE);
  const canView = canManage || hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PAYROLL_VIEW);
  if (!canView) return <Navigate to="/admin-os/no-access" replace />;

  const { data: cycle, isLoading } = usePayrollCycle(id);
  const { data: items } = usePayrollItems(id);
  const generate = useGenerateCycle();
  const advance = useAdvanceCycle();

  if (isLoading || !cycle) {
    return <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const totals = (cycle.totals ?? {}) as any;
  const next = NEXT[cycle.status as CycleStatus];

  return (
    <div className="space-y-6">
      <Link to="/admin-os/people-ops/payroll/cycles"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All cycles
      </Link>

      <div className="rounded-xl border border-border/60 bg-card p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
              PAYROLL CYCLE
            </p>
            <h1 className="text-2xl font-bold">{cycle.period_month}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Status: <span className="font-semibold">{cycle.status.replace(/_/g, " ")}</span>
            </p>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              {cycle.status === "draft" && (
                <button
                  disabled={generate.isPending}
                  onClick={() => generate.mutate(cycle.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3.5 h-9 text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
                >
                  <PlayCircle className="h-3.5 w-3.5" /> Generate payroll
                </button>
              )}
              {next && (
                <button
                  disabled={advance.isPending}
                  onClick={() => advance.mutate({ id: cycle.id, next })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 h-9 text-xs font-semibold hover:bg-muted disabled:opacity-50"
                >
                  {next === "released" ? <Rocket className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Advance to {next.replace(/_/g, " ")}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <Stat label="Employees" value={Number(totals.employees ?? items?.length ?? 0)} />
          <Stat label="Gross" value={items?.reduce((s, i) => s + Number(i.gross), 0) ?? 0} />
          <Stat label="Deductions" value={items?.reduce((s, i) => s + Number(i.deductions_total), 0) ?? 0} />
          <Stat label="Net payout" value={Number(totals.net_pay ?? items?.reduce((s, i) => s + Number(i.net_pay), 0) ?? 0)} />
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60 text-xs font-bold tracking-[0.15em] text-muted-foreground">
          PAYROLL ITEMS
        </div>
        {!items || items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No items yet. Generate payroll to snapshot active salary structures.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {items.map((i: any) => (
              <div key={i.id} className="flex items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {i.employee?.full_name ?? "—"}
                    <span className="ml-2 text-[10px] text-muted-foreground font-mono">
                      {i.employee?.employee_number}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Worked {i.worked_days}d · Leave {i.leave_days}d · LOP {i.loss_of_pay_days}d
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{cycle.currency} {Number(i.net_pay).toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground">
                    G {Number(i.gross).toLocaleString()} · D {Number(i.deductions_total).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg border border-border/60 p-3">
    <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground">{label.toUpperCase()}</p>
    <p className="mt-1 text-lg font-bold">{Number(value).toLocaleString()}</p>
  </div>
);

export default PayrollCycleDetail;

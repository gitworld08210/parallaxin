import { Link, Navigate } from "react-router-dom";
import {
  Award, Banknote, Building2, Calendar, CircleDollarSign, FileSpreadsheet,
  Gift, HandCoins, Receipt, Wallet,
} from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import { usePayrollCycles } from "@/hooks/admin-os/usePayroll";

const PayrollIndex = () => {
  const { hasPermission } = useEmployee();
  const { data: cycles } = usePayrollCycles();

  const canView = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PAYROLL_VIEW)
    || hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PAYROLL_MANAGE);

  if (!canView) return <Navigate to="/admin-os/no-access" replace />;

  const latest = cycles?.[0];
  const totalNet = Number((latest?.totals as any)?.net_pay ?? 0);
  const empCount = Number((latest?.totals as any)?.employees ?? 0);

  const tiles = [
    { to: "cycles", label: "Payroll Cycles", icon: Calendar, desc: "Monthly runs & approvals" },
    { to: "salaries", label: "Salary Structures", icon: Wallet, desc: "Per-employee comp breakdowns" },
    { to: "plans", label: "Compensation Plans", icon: Building2, desc: "Salary / hourly / stipend models" },
    { to: "revisions", label: "Salary Revisions", icon: FileSpreadsheet, desc: "Change requests & workflow" },
    { to: "bonuses", label: "Bonuses", icon: Award, desc: "Performance, festival, retention" },
    { to: "benefits", label: "Benefits", icon: Gift, desc: "Catalog & enrollments" },
    { to: "reimbursements", label: "Reimbursements", icon: Receipt, desc: "Expense claims workflow" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <CircleDollarSign className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            PEOPLE OPS · PAYROLL & COMPENSATION
          </p>
          <h1 className="text-2xl font-bold">Payroll</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground">LATEST CYCLE</p>
          <p className="mt-1 text-lg font-bold">{latest?.period_month ?? "—"}</p>
          <p className="text-[11px] text-muted-foreground">{latest?.status ?? "no runs yet"}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground">EMPLOYEES</p>
          <p className="mt-1 text-2xl font-bold">{empCount}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground">NET PAYOUT</p>
          <p className="mt-1 text-2xl font-bold flex items-center gap-1">
            <HandCoins className="h-4 w-4 text-muted-foreground" />
            {totalNet.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground">TOTAL CYCLES</p>
          <p className="mt-1 text-2xl font-bold">{cycles?.length ?? 0}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="group rounded-xl border border-border/60 bg-card p-4 hover:border-primary/40 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <t.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t.label}</p>
                <p className="text-xs text-muted-foreground truncate">{t.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default PayrollIndex;

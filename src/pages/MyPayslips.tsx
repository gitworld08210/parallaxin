import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Wallet as WalletIcon } from "lucide-react";
import { useMyPayslips } from "@/hooks/admin-os/usePayroll";

const MyPayslips = () => {
  const nav = useNavigate();
  const { data, isLoading } = useMyPayslips();
  const items = data?.items ?? [];
  const emp = data?.employee;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 backdrop-blur bg-background/80 border-b border-border/60">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 h-14">
          <button onClick={() => nav(-1)} className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">WALLET</p>
            <h1 className="text-base font-bold">My Payslips</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {emp && (
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">EMPLOYEE</p>
            <p className="mt-1 text-lg font-bold">{emp.full_name}</p>
            <p className="text-xs text-muted-foreground">
              {emp.employee_number} · {emp.department?.name ?? "—"} · {emp.role?.name ?? "—"}
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading payslips…</div>
        ) : !emp ? (
          <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
            <WalletIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-semibold">No employee record</p>
            <p className="text-xs text-muted-foreground mt-1">
              You aren't linked to an employee profile yet. Contact People Ops.
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-semibold">No payslips yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Payslips appear here once payroll is released.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((i) => (
              <Link
                key={i.id}
                to={`/wallet/payslips/${i.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 hover:border-primary/40 hover:bg-muted/30"
              >
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{i.cycle?.period_month}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Released {i.cycle?.released_at ? new Date(i.cycle.released_at).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">
                    {i.cycle?.currency} {Number(i.net_pay).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">NET PAY</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPayslips;

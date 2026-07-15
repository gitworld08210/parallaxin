import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { useMyPayslip } from "@/hooks/admin-os/usePayroll";

const money = (currency: string | undefined, n: number) =>
  `${currency ?? ""} ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`.trim();

const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <div className={`flex items-center justify-between py-2 ${bold ? "border-t border-border/80 mt-1" : ""}`}>
    <span className={`text-xs ${bold ? "font-bold" : "text-muted-foreground"}`}>{label}</span>
    <span className={`text-sm font-mono ${bold ? "font-bold" : ""}`}>{value}</span>
  </div>
);

const PayslipDetail = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const nav = useNavigate();
  const { data, isLoading } = useMyPayslip(itemId);

  if (isLoading) return <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!data) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        Payslip not found or not yet released.{" "}
        <Link to="/wallet/payslips" className="underline">Back to payslips</Link>
      </div>
    );
  }

  const { employee: emp, item } = data;
  const snap = (item.structure_snapshot ?? {}) as any;
  const currency = item.cycle?.currency ?? snap.currency ?? "";
  const earnings = [
    { label: "Basic", value: Number(snap.basic ?? 0) },
    { label: "House allowance", value: Number(snap.house_allowance ?? 0) },
    { label: "Transport allowance", value: Number(snap.transport_allowance ?? 0) },
    { label: "Medical allowance", value: Number(snap.medical_allowance ?? 0) },
    { label: "Special allowance", value: Number(snap.special_allowance ?? 0) },
    ...(Array.isArray(snap.other_allowances)
      ? (snap.other_allowances as any[]).map((o) => ({ label: o?.label ?? "Allowance", value: Number(o?.amount ?? 0) }))
      : []),
  ].filter((e) => e.value !== 0);

  const deductions: { label: string; value: number }[] = Array.isArray(snap.deductions)
    ? (snap.deductions as any[]).map((d) => ({ label: d?.label ?? "Deduction", value: Number(d?.amount ?? 0) }))
    : [];

  const grossTotal = Number(item.gross ?? 0);
  const dedTotal = Number(item.deductions_total ?? 0);
  const net = Number(item.net_pay ?? 0);

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <div className="sticky top-0 z-10 backdrop-blur bg-background/80 border-b border-border/60 print:hidden">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 h-14">
          <button onClick={() => nav(-1)} className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">PAYSLIP</p>
            <h1 className="text-base font-bold">{item.cycle?.period_month}</h1>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 h-9 text-xs font-semibold hover:bg-primary/90"
          >
            <Printer className="h-3.5 w-3.5" /> Print / Save PDF
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 print:py-4 space-y-4">
        <div className="rounded-2xl border border-border/60 bg-card p-6 print:border-black">
          <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">PARALLAX AI</p>
              <h2 className="text-lg font-bold">Payslip · {item.cycle?.period_month}</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Released {item.cycle?.released_at ? new Date(item.cycle.released_at).toLocaleDateString() : "—"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">NET PAY</p>
              <p className="text-2xl font-bold">{money(currency, net)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 text-xs">
            <div>
              <p className="font-semibold">{emp.full_name}</p>
              <p className="text-muted-foreground">{emp.employee_number}</p>
              <p className="text-muted-foreground">{emp.company_email}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Department</p>
              <p className="font-semibold">{emp.department?.name ?? "—"}</p>
              <p className="text-muted-foreground mt-1">Role</p>
              <p className="font-semibold">{emp.role?.name ?? "—"}{emp.level ? ` · ${emp.level}` : ""}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5 text-xs">
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground">WORKED</p>
              <p className="mt-1 text-base font-bold">{item.worked_days}d</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground">LEAVE</p>
              <p className="mt-1 text-base font-bold">{item.leave_days}d</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground">LOP</p>
              <p className="mt-1 text-base font-bold">{item.loss_of_pay_days}d</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 mt-6">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground mb-1">EARNINGS</p>
              {earnings.length === 0 ? (
                <p className="text-xs text-muted-foreground">No breakdown available</p>
              ) : (
                earnings.map((e, i) => <Row key={i} label={e.label} value={money(currency, e.value)} />)
              )}
              {Number(item.bonuses_total) > 0 && (
                <Row label="Bonuses" value={money(currency, Number(item.bonuses_total))} />
              )}
              {Number(item.reimbursements_total) > 0 && (
                <Row label="Reimbursements" value={money(currency, Number(item.reimbursements_total))} />
              )}
              <Row label="Gross" value={money(currency, grossTotal)} bold />
            </div>

            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground mb-1">DEDUCTIONS</p>
              {deductions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No deductions</p>
              ) : (
                deductions.map((d, i) => <Row key={i} label={d.label} value={money(currency, d.value)} />)
              )}
              <Row label="Total deductions" value={money(currency, dedTotal)} bold />
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-primary/5 border border-primary/20 p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">NET PAYABLE</p>
              <p className="text-2xl font-bold">{money(currency, net)}</p>
            </div>
            <Download className="h-6 w-6 text-primary opacity-60" />
          </div>

          <p className="text-[10px] text-muted-foreground text-center mt-4">
            This is a system-generated payslip and does not require a signature.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PayslipDetail;

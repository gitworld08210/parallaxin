import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowLeft,
  Crown,
  UserPlus,
  Download,
  CheckCircle2,
  Circle,
  Mail,
  UserMinus,
} from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import {
  EXECUTIVE_SLOTS,
  useAppointments,
  useRevokeAppointment,
  getSignedLetterUrl,
  type ExecutiveSlot,
  type AppointResult,
} from "@/hooks/admin-os/useAppointments";
import { AppointmentModal } from "./AppointmentModal";
import { AppointmentResultDialog } from "./AppointmentResultDialog";
import { toast } from "sonner";

const AppointmentsPanel = () => {
  const { employee } = useEmployee();
  const { data: appointments, isLoading: appointmentsLoading } = useAppointments();
  const revoke = useRevokeAppointment();
  const [openSlot, setOpenSlot] = useState<ExecutiveSlot | null>(null);
  const [result, setResult] = useState<{ result: AppointResult; label: string; email: string } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<any | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [alsoSuspend, setAlsoSuspend] = useState(true);

  if (!employee || appointmentsLoading)
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const roleKey = (employee as any)?.role?.key;
  const isFounder = roleKey === "founder" || roleKey === "co_founder";

  // Also allow whoever currently holds the Operations Head or HR Head
  // appointment — they can appoint downstream members.
  const holdsOpsOrHr = (appointments ?? []).some(
    (a) =>
      !a.revoked_at &&
      a.employee_id === (employee as any).id &&
      (a.slot_key === "coo" || a.slot_key === "hr_head"),
  );

  if (!isFounder && !holdsOpsOrHr) return <Navigate to="/admin-os/no-access" replace />;

  const activeBySlot = new Map<string, any>();
  (appointments ?? []).filter((a) => !a.revoked_at).forEach((a) => activeBySlot.set(a.slot_key, a));

  const filled = activeBySlot.size;
  const total = EXECUTIVE_SLOTS.length;

  const downloadLetter = async (path: string) => {
    const url = await getSignedLetterUrl(path);
    if (url) window.open(url, "_blank");
    else toast.error("Could not generate download link");
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <Link
        to="/admin-os/founder-office"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Founder Office
      </Link>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
              FOUNDER OFFICE · EXECUTIVE APPOINTMENTS
            </p>
            <h1 className="text-2xl font-bold">Appoint your C-Suite</h1>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">
            {filled}
            <span className="text-muted-foreground text-sm font-normal"> / {total}</span>
          </p>
          <p className="text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
            Positions filled
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
        <p className="text-xs">
          <span className="font-semibold text-primary">One-click appointment.</span> System
          auto-generates a unique <span className="font-mono">AURE###</span> employee ID and
          creates the account. A branded PDF joining letter — with the temporary password inside —
          is generated for you to download and email to the appointee yourself.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {EXECUTIVE_SLOTS.map((slot) => {
          const active = activeBySlot.get(slot.key);
          const isFilled = !!active;
          return (
            <div
              key={slot.key}
              className={`rounded-2xl border p-4 transition ${
                isFilled
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-border/60 bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground">
                    {slot.department.toUpperCase()}
                  </p>
                  <h3 className="text-sm font-bold mt-0.5 truncate">{slot.label}</h3>
                </div>
                {isFilled ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </div>

              {isFilled ? (
                <div className="mt-3 space-y-2">
                  <div>
                    <p className="text-sm font-semibold">{active.employee?.full_name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {active.employee?.employee_number}
                    </p>
                  </div>
                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    <p className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {active.personal_email}
                    </p>
                    {active.employee?.joining_date && (
                      <p>
                        Joined{" "}
                        {new Date(active.employee.joining_date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {active.pdf_path && (
                      <button
                        onClick={() => downloadLetter(active.pdf_path)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                      >
                        <Download className="h-3 w-3" /> Download letter
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setRevokeTarget({ appointment: active, slot });
                        setRevokeReason("");
                        setAlsoSuspend(true);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive hover:underline"
                    >
                      <UserMinus className="h-3 w-3" /> Revoke
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">
                    {slot.description}
                  </p>
                  <button
                    onClick={() => setOpenSlot(slot)}
                    className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold hover:bg-primary/90"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Appoint
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {openSlot && (
        <AppointmentModal
          slot={openSlot}
          onClose={() => setOpenSlot(null)}
          onSuccess={(r, email) => {
            setOpenSlot(null);
            setResult({ result: r, label: openSlot.label, email });
          }}
        />
      )}

      {result && (
        <AppointmentResultDialog
          result={result.result}
          slotLabel={result.label}
          personalEmail={result.email}
          onClose={() => setResult(null)}
        />
      )}

      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-5 space-y-4">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
                REVOKE APPOINTMENT
              </p>
              <h2 className="text-lg font-bold mt-1">{revokeTarget.slot.label}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {revokeTarget.appointment.employee?.full_name} ·{" "}
                {revokeTarget.appointment.employee?.employee_number}
              </p>
            </div>
            <textarea
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              rows={3}
              placeholder="Reason for revoking this appointment (mandatory)"
              className="w-full rounded-lg bg-background border border-border/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={alsoSuspend}
                onChange={(e) => setAlsoSuspend(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Also suspend the employee account. They will lose access to all Admin OS
                permissions immediately. Use the employee page later to resign / exit.
              </span>
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setRevokeTarget(null)}
                className="rounded-lg bg-secondary text-secondary-foreground px-3 py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={revoke.isPending || !revokeReason.trim()}
                onClick={async () => {
                  try {
                    await revoke.mutateAsync({
                      appointment_id: revokeTarget.appointment.id,
                      employee_id: revokeTarget.appointment.employee_id,
                      slot_label: revokeTarget.slot.label,
                      reason: revokeReason.trim(),
                      suspend_employee: alsoSuspend,
                    });
                    toast.success(
                      `${revokeTarget.slot.label} appointment revoked${alsoSuspend ? " · employee suspended" : ""}`,
                    );
                    setRevokeTarget(null);
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
                className="rounded-lg bg-destructive text-destructive-foreground px-3 py-2 text-xs font-semibold disabled:opacity-50"
              >
                {revoke.isPending ? "Revoking…" : "Confirm revoke"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPanel;

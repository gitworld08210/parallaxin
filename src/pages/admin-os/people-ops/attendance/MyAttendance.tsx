import { useMemo } from "react";
import { toast } from "sonner";
import { LogIn, LogOut } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import {
  useMyAttendance,
  useCheckIn,
  useCheckOut,
  useEmployeeShifts,
} from "@/hooks/admin-os/useAttendance";

const statusColor: Record<string, string> = {
  present: "bg-emerald-500/10 text-emerald-600",
  wfh: "bg-sky-500/10 text-sky-600",
  late: "bg-amber-500/10 text-amber-600",
  half_day: "bg-amber-500/10 text-amber-600",
  business_travel: "bg-purple-500/10 text-purple-600",
  training: "bg-purple-500/10 text-purple-600",
  leave: "bg-primary/10 text-primary",
  absent: "bg-red-500/10 text-red-600",
  weekend: "bg-muted text-muted-foreground",
  holiday: "bg-muted text-muted-foreground",
};

const MyAttendance = () => {
  const { employee } = useEmployee();
  const today = new Date().toISOString().slice(0, 10);
  const from = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);

  const { data: records, isLoading } = useMyAttendance(employee?.id, from, today);
  const { data: shifts } = useEmployeeShifts(employee?.id);
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  if (!employee) {
    return <div className="p-10 text-center text-sm text-muted-foreground">No linked employee record.</div>;
  }

  const todayRow = records?.find((r) => r.work_date === today);
  const currentShift = shifts?.find((s) => !s.effective_to || s.effective_to >= today);

  const doCheckIn = async (status: "present" | "wfh" | "business_travel" | "training" = "present") => {
    try {
      await checkIn.mutateAsync({ employee_id: employee.id, status, shift_id: currentShift?.shift_id ?? null });
      toast.success("Checked in");
    } catch (e) { toast.error((e as Error).message); }
  };
  const doCheckOut = async () => {
    if (!todayRow) return;
    try {
      await checkOut.mutateAsync(todayRow.id);
      toast.success("Checked out");
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">PEOPLE OPS · MY ATTENDANCE</p>
        <h1 className="text-xl font-bold">Attendance ledger</h1>
        {currentShift?.shift && (
          <p className="text-xs text-muted-foreground mt-1">
            Shift: {currentShift.shift.name} ({currentShift.shift.start_time?.slice(0, 5)} — {currentShift.shift.end_time?.slice(0, 5)})
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Today · {today}</p>
            {todayRow ? (
              <p className="text-sm font-semibold mt-1">
                Status: {todayRow.status}
                {todayRow.check_in_at && ` · In ${new Date(todayRow.check_in_at).toLocaleTimeString()}`}
                {todayRow.check_out_at && ` · Out ${new Date(todayRow.check_out_at).toLocaleTimeString()}`}
                {todayRow.hours_worked != null && ` · ${todayRow.hours_worked}h`}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">Not checked in yet.</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {!todayRow?.check_in_at && (
              <>
                <button onClick={() => doCheckIn("present")}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold">
                  <LogIn className="h-3.5 w-3.5" /> Check in
                </button>
                <button onClick={() => doCheckIn("wfh")}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">WFH</button>
                <button onClick={() => doCheckIn("business_travel")}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">Travel</button>
              </>
            )}
            {todayRow?.check_in_at && !todayRow?.check_out_at && (
              <button onClick={doCheckOut}
                className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold">
                <LogOut className="h-3.5 w-3.5" /> Check out
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="px-4 py-2 border-b border-border/60 text-xs font-semibold text-muted-foreground">
          Last 30 days
        </div>
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !records || records.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No records yet.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {records.map((r) => (
              <div key={r.id} className="p-3 flex items-center gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{r.work_date}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor[r.status] ?? "bg-muted"}`}>{r.status}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {r.check_in_at ? `In ${new Date(r.check_in_at).toLocaleTimeString()}` : "—"}
                    {r.check_out_at ? ` · Out ${new Date(r.check_out_at).toLocaleTimeString()}` : ""}
                    {r.hours_worked != null ? ` · ${r.hours_worked}h` : ""}
                    {r.notes ? ` · ${r.notes}` : ""}
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

export default MyAttendance;

import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import { useAttendanceForDate, useWorkforceAvailability } from "@/hooks/admin-os/useAttendance";

const WorkforceAvailability = () => {
  const { hasPermission } = useEmployee();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { data: avail } = useWorkforceAvailability(date);
  const { data: dayRecords, isLoading } = useAttendanceForDate(date);

  if (!hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_ATTENDANCE_VIEW) &&
      !hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_ATTENDANCE_MANAGE))
    return <Navigate to="/admin-os/no-access" replace />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">PEOPLE OPS · AVAILABILITY</p>
          <h1 className="text-xl font-bold">Workforce Availability</h1>
        </div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
      </div>

      {avail && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          <div className="rounded-xl border border-border/60 bg-card p-3">
            <p className="text-[10px] font-bold tracking-wider text-muted-foreground">TOTAL</p>
            <p className="text-xl font-bold">{avail.total}</p>
          </div>
          {(["present", "wfh", "business_travel", "training", "leave", "absent", "unmarked"] as const).map((k) => (
            <div key={k} className="rounded-xl border border-border/60 bg-card p-3">
              <p className="text-[10px] font-bold tracking-wider text-muted-foreground">{k.toUpperCase()}</p>
              <p className="text-xl font-bold">{avail.buckets[k] ?? 0}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="px-4 py-2 border-b border-border/60 text-xs font-semibold text-muted-foreground">
          Records for {date}
        </div>
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !dayRecords || dayRecords.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No records for this date.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {dayRecords.map((r: any) => (
              <div key={r.id} className="p-3 flex items-center gap-3 flex-wrap">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden">
                  {r.employee?.photo_url
                    ? <img src={r.employee.photo_url} alt="" className="h-full w-full object-cover" />
                    : r.employee?.full_name?.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{r.employee?.full_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {r.status}
                    {r.check_in_at && ` · In ${new Date(r.check_in_at).toLocaleTimeString()}`}
                    {r.check_out_at && ` · Out ${new Date(r.check_out_at).toLocaleTimeString()}`}
                    {r.hours_worked != null && ` · ${r.hours_worked}h`}
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

export default WorkforceAvailability;

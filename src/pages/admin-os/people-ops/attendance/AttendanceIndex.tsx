import { Link, Navigate } from "react-router-dom";
import { CalendarClock, CalendarDays, Clock, ListChecks, Plane, Timer, Users } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import { useWorkforceAvailability } from "@/hooks/admin-os/useAttendance";

const AttendanceIndex = () => {
  const { hasPermission } = useEmployee();
  const today = new Date().toISOString().slice(0, 10);
  const { data: avail } = useWorkforceAvailability(today);

  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_ATTENDANCE_MANAGE);
  const canView = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_ATTENDANCE_VIEW) || canManage;

  if (!canView && !hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_EMPLOYEES_VIEW))
    return <Navigate to="/admin-os/no-access" replace />;

  const tiles = [
    { to: "my", label: "My Attendance", icon: Clock, desc: "Check in/out, corrections" },
    { to: "leave", label: "Leave Center", icon: Plane, desc: "Requests, balances, approvals" },
    { to: "shifts", label: "Shifts", icon: Timer, desc: "Schedules & assignments" },
    { to: "holidays", label: "Holidays", icon: CalendarDays, desc: "Company & department calendar" },
    { to: "corrections", label: "Corrections", icon: ListChecks, desc: "Review attendance disputes" },
    { to: "availability", label: "Workforce Availability", icon: Users, desc: "Present, remote, leave breakdown" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            PEOPLE OPS · WORKFORCE TIME
          </p>
          <h1 className="text-2xl font-bold">Attendance & Leave</h1>
        </div>
      </div>

      {avail && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground">TOTAL ACTIVE</p>
            <p className="mt-1 text-2xl font-bold">{avail.total}</p>
          </div>
          {(["present", "wfh", "leave", "unmarked"] as const).map((k) => (
            <div key={k} className="rounded-xl border border-border/60 bg-card p-4">
              <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground">{k.toUpperCase()}</p>
              <p className="mt-1 text-2xl font-bold">{avail.buckets[k] ?? 0}</p>
            </div>
          ))}
        </div>
      )}

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

export default AttendanceIndex;

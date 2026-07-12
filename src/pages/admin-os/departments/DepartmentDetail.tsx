import { useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Users, Crown, Activity } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { useDepartmentDetail } from "@/hooks/admin-os/useDepartmentsData";
import {
  ADMIN_PERMISSIONS,
  EMPLOYMENT_STATUS_LABELS,
} from "@/features/admin-os/permissions";

const DepartmentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useEmployee();
  const { data, isLoading, error } = useDepartmentDetail(id);

  if (!hasPermission(ADMIN_PERMISSIONS.ADMIN_OS_ACCESS))
    return <Navigate to="/admin-os/no-access" replace />;

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    (data?.members ?? []).forEach((m: any) => {
      const key = m.role?.name ?? "Unassigned";
      (map[key] ??= []).push(m);
    });
    return Object.entries(map).sort(
      (a, b) =>
        ((a[1][0]?.role?.priority ?? 999) as number) -
        ((b[1][0]?.role?.priority ?? 999) as number),
    );
  }, [data?.members]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (data?.members ?? []).forEach((m: any) => {
      counts[m.employment_status] = (counts[m.employment_status] ?? 0) + 1;
    });
    return counts;
  }, [data?.members]);

  if (isLoading)
    return <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>;
  if (error)
    return (
      <div className="p-10 text-center text-sm text-destructive">
        {(error as Error).message}
      </div>
    );
  if (!data?.department)
    return <div className="p-10 text-center text-sm text-muted-foreground">Not found.</div>;

  const d = data.department;
  const active = statusCounts.active ?? 0;
  const total = data.members.length;
  const canManagePeople = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_EMPLOYEES_VIEW);

  return (
    <div className="space-y-6 max-w-5xl">
      <Link
        to="/admin-os/departments"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All departments
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
              DEPARTMENT
            </p>
            <h1 className="text-2xl font-bold">{d.name}</h1>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{d.key}</p>
            {d.description && (
              <p className="text-sm text-muted-foreground mt-3 max-w-2xl">
                {d.description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-[10px] font-bold tracking-wider text-muted-foreground">
              TOTAL
            </p>
            <p className="mt-1 text-xl font-bold">{total}</p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-[10px] font-bold tracking-wider text-muted-foreground">
              ACTIVE
            </p>
            <p className="mt-1 text-xl font-bold text-emerald-500">{active}</p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-[10px] font-bold tracking-wider text-muted-foreground">
              ON LEAVE
            </p>
            <p className="mt-1 text-xl font-bold text-amber-500">
              {statusCounts.on_leave ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-[10px] font-bold tracking-wider text-muted-foreground">
              SUSPENDED
            </p>
            <p className="mt-1 text-xl font-bold text-red-500">
              {statusCounts.suspended ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* Members grouped by role */}
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <h2 className="text-sm font-bold">Members</h2>
          <span className="text-[11px] text-muted-foreground">({total})</span>
        </div>

        {grouped.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No members yet.</p>
        ) : (
          <div className="mt-4 space-y-5">
            {grouped.map(([roleName, members]) => (
              <div key={roleName}>
                <div className="flex items-center gap-2 mb-2">
                  {roleName.toLowerCase().includes("head") && (
                    <Crown className="h-3 w-3 text-amber-500" />
                  )}
                  <p className="text-[10px] font-bold tracking-wider text-muted-foreground">
                    {roleName.toUpperCase()} · {members.length}
                  </p>
                </div>
                <div className="divide-y divide-border/40">
                  {members.map((m: any) => {
                    const Row = canManagePeople ? Link : "div";
                    return (
                      <Row
                        key={m.id}
                        // @ts-ignore
                        to={canManagePeople ? `/admin-os/people-ops/${m.id}` : undefined}
                        className="flex items-center gap-3 py-2.5 hover:bg-muted/30 -mx-2 px-2 rounded transition-colors"
                      >
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden">
                          {m.photo_url ? (
                            <img
                              src={m.photo_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            m.full_name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate">{m.full_name}</p>
                          <p className="text-[11px] text-muted-foreground truncate font-mono">
                            {m.employee_number} · {m.company_email}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {EMPLOYMENT_STATUS_LABELS[m.employment_status] ??
                            m.employment_status}
                        </span>
                      </Row>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Governance footer */}
      <div className="rounded-2xl border border-dashed border-border p-5 bg-muted/20">
        <div className="flex items-start gap-3">
          <Activity className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <div className="text-[11px] text-muted-foreground">
            Only <span className="font-semibold text-foreground">Founder Office</span>{" "}
            can create, rename, merge, split or archive departments. Every change is
            logged immutably in the Audit Center.
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentDetail;

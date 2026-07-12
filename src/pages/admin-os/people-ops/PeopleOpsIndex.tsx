import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Plus, Search, Users } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import {
  useEmployeesList,
  useDepartments,
  type EmployeeFilters,
} from "@/hooks/admin-os/useEmployees";
import {
  EMPLOYMENT_STATUS_LABELS,
  ADMIN_PERMISSIONS,
} from "@/features/admin-os/permissions";

const StatusPill = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    on_leave: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    joining_today: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    suspended: "bg-red-500/10 text-red-500 border-red-500/20",
    exited: "bg-muted text-muted-foreground border-border",
    archived: "bg-muted text-muted-foreground border-border",
  };
  const cls = map[status] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      {EMPLOYMENT_STATUS_LABELS[status] ?? status}
    </span>
  );
};

const PeopleOpsIndex = () => {
  const { hasPermission } = useEmployee();
  const [filters, setFilters] = useState<EmployeeFilters>({});
  const { data: employees, isLoading, error } = useEmployeesList(filters);
  const { data: departments } = useDepartments();

  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_EMPLOYEES_MANAGE);

  if (!hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_EMPLOYEES_VIEW))
    return <Navigate to="/admin-os/no-access" replace />;

  const counts = useMemo(() => {
    const total = employees?.length ?? 0;
    const active = employees?.filter((e) => e.employment_status === "active").length ?? 0;
    const onboarding = employees?.filter((e) =>
      ["pre_onboarding", "joining_today", "offer_sent", "offer_accepted"].includes(
        e.employment_status,
      ),
    ).length ?? 0;
    return { total, active, onboarding };
  }, [employees]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
              PEOPLE OPS · EMPLOYEE DIRECTORY
            </p>
            <h1 className="text-2xl font-bold">Employees</h1>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/admin-os/people-ops/reporting"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-muted"
            >
              Reporting structure
            </Link>
            <Link
              to="/admin-os/people-ops/documents"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-muted"
            >
              Documents
            </Link>
            <Link
              to="/admin-os/people-ops/onboarding"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-muted"
            >
              Onboarding queue
            </Link>
            <Link
              to="/admin-os/people-ops/movements"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-muted"
            >
              Movements
            </Link>
            <Link
              to="/admin-os/people-ops/onboarding/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3.5 py-2 text-xs font-semibold hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" /> Start onboarding
            </Link>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: counts.total },
          { label: "Active", value: counts.active },
          { label: "In Onboarding", value: counts.onboarding },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/60 bg-card p-4">
            <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground">
              {s.label.toUpperCase()}
            </p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border/60 bg-card p-3 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, email, ID"
            value={filters.search ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={filters.status ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
          className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm"
        >
          <option value="">All statuses</option>
          {Object.entries(EMPLOYMENT_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={filters.departmentId ?? ""}
          onChange={(e) =>
            setFilters((f) => ({ ...f, departmentId: e.target.value || undefined }))
          }
          className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm"
        >
          <option value="">All departments</option>
          {departments?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Loading employees…
          </div>
        ) : error ? (
          <div className="p-10 text-center text-sm text-destructive">
            {(error as Error).message}
          </div>
        ) : !employees || employees.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No employees match your filters.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {employees.map((e) => (
              <Link
                key={e.id}
                to={`/admin-os/people-ops/${e.id}`}
                className="flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors"
              >
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                  {e.photo_url ? (
                    <img src={e.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    e.full_name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{e.full_name}</p>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {e.employee_number}
                    </span>
                    <StatusPill status={e.employment_status} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {e.company_email}
                  </p>
                </div>
                <div className="hidden sm:block text-right min-w-0">
                  <p className="text-xs font-medium truncate">
                    {e.department?.name ?? "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {e.role?.name ?? "—"} {e.level ? `· L${e.level}` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PeopleOpsIndex;

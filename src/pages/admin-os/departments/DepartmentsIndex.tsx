import { Link, Navigate } from "react-router-dom";
import { Building2, Users, ArrowRight } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { useDepartmentsOverview } from "@/hooks/admin-os/useDepartmentsData";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";

const StatusPill = ({ status }: { status: string | null }) => {
  const s = status ?? "active";
  const map: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    under_setup: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    maintenance: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    suspended: "bg-red-500/10 text-red-500 border-red-500/20",
    archived: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full border ${map[s] ?? map.active}`}
    >
      {s.replace("_", " ")}
    </span>
  );
};

const DepartmentsIndex = () => {
  const { hasPermission } = useEmployee();
  const { data: depts, isLoading, error } = useDepartmentsOverview();

  if (!hasPermission(ADMIN_PERMISSIONS.ADMIN_OS_ACCESS))
    return <Navigate to="/admin-os/no-access" replace />;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            GOVERNANCE · DEPARTMENTS
          </p>
          <h1 className="text-2xl font-bold">All Departments</h1>
        </div>
      </div>

      {isLoading ? (
        <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : error ? (
        <div className="p-10 text-center text-sm text-destructive">
          {(error as Error).message}
        </div>
      ) : !depts?.length ? (
        <div className="p-10 text-center text-sm text-muted-foreground rounded-xl border border-border/60 bg-card">
          No departments defined.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {depts.map((d) => (
            <Link
              key={d.id}
              to={`/admin-os/departments/${d.id}`}
              className="group rounded-2xl border border-border/60 bg-card p-5 hover:border-primary/40 hover:bg-card/80 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-mono text-muted-foreground">{d.key}</p>
                  <h3 className="text-base font-bold truncate">{d.name}</h3>
                </div>
                <StatusPill status={d.status} />
              </div>
              {d.description && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                  {d.description}
                </p>
              )}
              <div className="mt-4 flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-semibold">{d.activeCount}</span>
                  <span className="text-muted-foreground">active</span>
                </div>
                <span className="text-muted-foreground">
                  {d.totalCount} total
                </span>
                {d.onLeaveCount > 0 && (
                  <span className="text-amber-500">{d.onLeaveCount} on leave</span>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground truncate">
                  Head: <span className="text-foreground">{d.headName ?? "Unassigned"}</span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default DepartmentsIndex;

/**
 * Movement Center — Phase 2.4.
 *
 * Central console for every workforce movement request across Aurelix.
 */
import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight, Filter, Plus, Route } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import { useMovementList, type MovementKind, type MovementStatus } from "@/hooks/admin-os/useMovements";
import {
  PageHeader, SectionCard, StatCard, StatusBadge, EmptyState,
  LoadingSkeleton, PermissionDenied, Toolbar, DataTable,
} from "@/components/admin-os/ds";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const STATUS_TONE: Record<MovementStatus, any> = {
  draft: "neutral",
  pending_approval: "pending",
  approved: "info",
  rejected: "rejected",
  applied: "success",
  expired: "neutral",
  cancelled: "cancelled",
};

const KINDS: MovementKind[] = [
  "department_transfer","team_transfer","manager_change","promotion","demotion",
  "temporary_assignment","cross_department_assignment","acting_assignment",
  "leave","suspension","reinstatement","resignation","exit","rejoin",
  "workload_transfer","knowledge_transfer",
];

const MovementCenter = () => {
  const { hasPermission } = useEmployee();
  const [kind, setKind] = useState<MovementKind | "all">("all");
  const [status, setStatus] = useState<MovementStatus | "all">("all");

  const canView = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_MOVEMENTS_VIEW)
    || hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_EMPLOYEES_VIEW)
    || hasPermission(ADMIN_PERMISSIONS.FOUNDER_OFFICE_ACCESS);
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_MOVEMENTS_MANAGE)
    || hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_EMPLOYEES_MANAGE)
    || hasPermission(ADMIN_PERMISSIONS.FOUNDER_OFFICE_ACCESS);

  const { data, isLoading, error } = useMovementList({
    kind: kind === "all" ? undefined : kind,
    status: status === "all" ? undefined : status,
  });

  const stats = useMemo(() => {
    const rows = data ?? [];
    return {
      total: rows.length,
      pending: rows.filter((r) => r.status === "pending_approval").length,
      approved: rows.filter((r) => r.status === "approved").length,
      applied: rows.filter((r) => r.status === "applied").length,
    };
  }, [data]);

  if (!canView) return <PermissionDenied />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="PEOPLE OPS · MOVEMENT CENTER"
        title="Workforce movements"
        description="Transfers, promotions, leaves, assignments and exits — every change flows through here."
        actions={canManage && (
          <Button asChild size="sm">
            <Link to="/admin-os/people-ops/movements/new">
              <Plus className="h-3.5 w-3.5" /> New movement
            </Link>
          </Button>
        )}
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={stats.total} icon={Route} />
        <StatCard label="Awaiting approval" value={stats.pending} />
        <StatCard label="Approved" value={stats.approved} />
        <StatCard label="Applied" value={stats.applied} />
      </div>

      <SectionCard>
        <Toolbar>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={kind} onValueChange={(v) => setKind(v as any)}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Kind" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All kinds</SelectItem>
                {KINDS.map((k) => <SelectItem key={k} value={k}>{k.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.keys(STATUS_TONE).map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Toolbar>

        {isLoading ? <LoadingSkeleton rows={6} /> : error ? (
          <p className="text-danger text-sm p-4">{(error as Error).message}</p>
        ) : !data?.length ? (
          <EmptyState icon={Route} title="No movements yet" description="Create the first workforce movement to get started." />
        ) : (
          <DataTable
            data={data as any[]}
            columns={[
              {
                key: "employee",
                header: "Employee",
                render: (r) => (
                  <div>
                    <p className="font-medium text-sm">{r.employee?.full_name ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground">{r.employee?.employee_number}</p>
                  </div>
                ),
              },
              { key: "kind", header: "Kind", render: (r) => <span className="text-xs uppercase tracking-wide">{r.kind.replace(/_/g, " ")}</span> },
              { key: "status", header: "Status", render: (r) => <StatusBadge tone={STATUS_TONE[r.status as MovementStatus] ?? "neutral"} label={r.status.replace(/_/g, " ")} /> },
              { key: "effective_date", header: "Effective", render: (r) => r.effective_date ?? "—" },
              {
                key: "actions",
                header: "",
                render: (r) => (
                  <Button asChild size="sm" variant="ghost">
                    <Link to={`/admin-os/people-ops/movements/${r.id}`}>Open <ArrowRight className="h-3.5 w-3.5" /></Link>
                  </Button>
                ),
              },
            ]}
          />
        )}
      </SectionCard>
    </div>
  );
};

export default MovementCenter;

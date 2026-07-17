import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { supabase } from "@/integrations/supabase/client";
import {
  ADMIN_MODULES,
  SECTION_LABELS,
  type AdminModule,
} from "@/features/admin-os/modules.config";
import { EMPLOYMENT_STATUS_LABELS } from "@/features/admin-os/permissions";

const AdminOSDashboard = () => {
  const { employee, hasPermission, permissions } = useEmployee();
  const { data: intake } = useQuery({
    queryKey: ["admin-os", "intake-overview"],
    queryFn: async () => {
      const [verification, trust, payouts, assignments] = await Promise.all([
        supabase.from("ver_applications").select("id", { count: "exact", head: true }).in("status", ["pending", "under_review", "info_required"]),
        supabase.from("ts_cases" as any).select("id", { count: "exact", head: true }).in("status", ["new", "triage", "investigating", "pending_review"]),
        supabase.from("payout_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("platform_assignments").select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);
      return {
        verification: verification.count ?? 0,
        trust: trust.count ?? 0,
        payouts: payouts.count ?? 0,
        assignments: assignments.count ?? 0,
      };
    },
  });

  const visible = ADMIN_MODULES.filter(
    (m) => m.slug !== "overview" && hasPermission(m.permission),
  );
  const grouped: Record<AdminModule["section"], AdminModule[]> = {
    core: [],
    operations: [],
    platform: [],
    governance: [],
  };
  visible.forEach((m) => grouped[m.section].push(m));

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8">
        <p className="text-[11px] font-bold tracking-[0.2em] text-primary">
          AURELIX · ADMIN OS
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">
          Welcome{employee?.full_name ? `, ${employee.full_name.split(" ")[0]}` : ""}.
        </h1>
        <p className="mt-2 max-w-2xl text-sm sm:text-base text-muted-foreground">
          This is the internal operating platform for Aurelix. Every module is
          role-based, audited, and permission-gated. Server-side authorization
          is the source of truth — the UI just follows.
        </p>

        {employee && (
          <div className="mt-6 grid gap-3 sm:grid-cols-4 max-w-3xl">
            <Stat label="Employee" value={employee.employee_number} />
            <Stat
              label="Role"
              value={employee.role?.name ?? "—"}
              sub={employee.department?.name ?? undefined}
            />
            <Stat
              label="Status"
              value={
                EMPLOYMENT_STATUS_LABELS[employee.employment_status] ??
                employee.employment_status
              }
            />
            <Stat label="Access" value={`${permissions.size} permissions`} />
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-lg font-bold tracking-tight">Admin OS Intake</h2>
          <p className="text-xs text-muted-foreground">Live department routing</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Verification" value={`${intake?.verification ?? 0} open`} />
          <Stat label="Trust & Safety" value={`${intake?.trust ?? 0} open`} />
          <Stat label="Creator Payouts" value={`${intake?.payouts ?? 0} pending`} />
          <Stat label="Assignments" value={`${intake?.assignments ?? 0} open`} />
        </div>
      </section>

      {/* Modules */}
      {(["operations", "platform", "governance"] as const).map((section) => {
        const items = grouped[section];
        if (!items.length) return null;
        return (
          <section key={section}>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="text-lg font-bold tracking-tight">
                {SECTION_LABELS[section]}
              </h2>
              <p className="text-xs text-muted-foreground">
                {items.length} module{items.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((m) => {
                const Icon = m.icon;
                const to =
                  m.slug === "overview" ? "/admin-os" : `/admin-os/${m.slug}`;
                return (
                  <Link
                    key={m.slug}
                    to={to}
                    className="group rounded-2xl border border-border/60 bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="rounded-xl bg-primary/10 p-2.5 text-primary group-hover:bg-primary/15">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-semibold tracking-wider text-muted-foreground/70">
                        PHASE {m.phase}
                      </span>
                    </div>
                    <h3 className="mt-4 text-base font-semibold">{m.label}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {m.tagline}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      {!visible.length && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            You have Admin OS access but no module permissions yet. Ask Founder
            Office or People Ops to assign your role's permissions.
          </p>
        </div>
      )}
    </div>
  );
};

const Stat = ({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) => (
  <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-3">
    <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
      {label}
    </p>
    <p className="mt-1 text-sm font-semibold truncate">{value}</p>
    {sub && <p className="text-[11px] text-muted-foreground truncate">{sub}</p>}
  </div>
);

export default AdminOSDashboard;

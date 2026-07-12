import { useState } from "react";
import { Navigate } from "react-router-dom";
import { ScrollText, Search, Filter, Download } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import {
  useAuditLogs,
  useAuditModules,
  type AuditFilters,
} from "@/hooks/admin-os/useFounderOffice";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";

const AuditCenter = () => {
  const { hasPermission } = useEmployee();
  const [filters, setFilters] = useState<AuditFilters>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data: logs, isLoading, error } = useAuditLogs(filters);
  const { data: modules } = useAuditModules();

  if (!hasPermission(ADMIN_PERMISSIONS.SECURITY_AUDIT_VIEW))
    return <Navigate to="/admin-os/no-access" replace />;

  const exportCsv = () => {
    if (!logs?.length) return;
    const header = [
      "created_at",
      "module",
      "action",
      "target_type",
      "target_id",
      "actor_user_id",
      "ip",
    ];
    const rows = logs.map((l: any) =>
      header
        .map((k) => JSON.stringify(l[k] ?? ""))
        .join(","),
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <ScrollText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
              GOVERNANCE · AUDIT CENTER
            </p>
            <h1 className="text-2xl font-bold">Every action, every actor</h1>
          </div>
        </div>
        <button
          onClick={exportCsv}
          disabled={!logs?.length}
          className="inline-flex items-center gap-1.5 rounded-lg bg-secondary text-secondary-foreground px-3 py-2 text-xs font-semibold hover:bg-secondary/80 disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border/60 bg-card p-3 grid sm:grid-cols-2 md:grid-cols-5 gap-2">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            placeholder="Search target ID or type"
            value={filters.search ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border/60 text-sm"
          />
        </div>
        <select
          value={filters.module ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, module: e.target.value || undefined }))}
          className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm"
        >
          <option value="">All modules</option>
          {modules?.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filters.from ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value || undefined }))}
          className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm"
        />
        <input
          type="date"
          value={filters.to ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value || undefined }))}
          className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm"
        />
      </div>

      {/* Logs */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="p-10 text-center text-sm text-destructive">
            {(error as Error).message}
          </div>
        ) : !logs?.length ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No audit entries match your filters.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {logs.map((l: any) => (
              <div key={l.id}>
                <button
                  onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                  className="w-full flex items-start gap-3 p-3 hover:bg-muted/40 transition-colors text-left"
                >
                  <Filter className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{l.action}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                        {l.module}
                      </span>
                      {l.target_type && (
                        <span className="text-[10px] text-muted-foreground">
                          {l.target_type}
                        </span>
                      )}
                    </div>
                    {l.target_id && (
                      <p className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">
                        {l.target_id}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString()}
                  </span>
                </button>
                {expanded === l.id && (
                  <div className="px-3 pb-4 pl-10 space-y-2 bg-muted/20">
                    {l.before && (
                      <div>
                        <p className="text-[10px] font-bold tracking-wider text-muted-foreground">
                          BEFORE
                        </p>
                        <pre className="text-[10px] font-mono bg-background border border-border/60 rounded p-2 overflow-x-auto max-h-48">
                          {JSON.stringify(l.before, null, 2)}
                        </pre>
                      </div>
                    )}
                    {l.after && (
                      <div>
                        <p className="text-[10px] font-bold tracking-wider text-muted-foreground">
                          AFTER
                        </p>
                        <pre className="text-[10px] font-mono bg-background border border-border/60 rounded p-2 overflow-x-auto max-h-48">
                          {JSON.stringify(l.after, null, 2)}
                        </pre>
                      </div>
                    )}
                    <div className="flex gap-4 text-[10px] text-muted-foreground font-mono">
                      {l.actor_user_id && <span>actor: {l.actor_user_id}</span>}
                      {l.ip && <span>ip: {l.ip}</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditCenter;

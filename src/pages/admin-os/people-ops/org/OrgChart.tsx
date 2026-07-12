import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ChevronRight, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { useDepartments } from "@/hooks/admin-os/useEmployees";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  LoadingSkeleton,
} from "@/components/admin-os/ds";

interface Node {
  id: string;
  full_name: string;
  employee_number: string;
  photo_url: string | null;
  reporting_manager_id: string | null;
  department_id: string | null;
  department_name: string | null;
  role_name: string | null;
  role_priority: number | null;
  children: Node[];
}

const useOrgTree = () =>
  useQuery({
    queryKey: ["admin-os", "org", "tree"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select(
          `id, full_name, employee_number, photo_url, reporting_manager_id, department_id,
           department:admin_departments!employees_department_id_fkey(name),
           role:admin_roles!employees_role_id_fkey(name, priority)`,
        )
        .in("employment_status", ["active", "on_leave", "joining_today"] as any)
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

function buildTree(rows: any[]): Node[] {
  const map = new Map<string, Node>();
  rows.forEach((r) =>
    map.set(r.id, {
      id: r.id,
      full_name: r.full_name,
      employee_number: r.employee_number,
      photo_url: r.photo_url,
      reporting_manager_id: r.reporting_manager_id,
      department_id: r.department_id,
      department_name: r.department?.name ?? null,
      role_name: r.role?.name ?? null,
      role_priority: r.role?.priority ?? null,
      children: [],
    }),
  );
  const roots: Node[] = [];
  map.forEach((n) => {
    if (n.reporting_manager_id && map.has(n.reporting_manager_id))
      map.get(n.reporting_manager_id)!.children.push(n);
    else roots.push(n);
  });
  const sort = (arr: Node[]) => {
    arr.sort(
      (a, b) => (a.role_priority ?? 999) - (b.role_priority ?? 999) ||
        a.full_name.localeCompare(b.full_name),
    );
    arr.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

function TreeNode({
  node,
  depth = 0,
  defaultOpen,
}: {
  node: Node;
  depth?: number;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || depth < 2);
  const hasChildren = node.children.length > 0;
  return (
    <div>
      <div
        className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40"
        style={{ paddingLeft: 8 + depth * 20 }}
      >
        <button
          type="button"
          onClick={() => hasChildren && setOpen((o) => !o)}
          className={`h-5 w-5 shrink-0 transition-transform ${
            hasChildren ? "text-muted-foreground hover:text-foreground" : "opacity-0"
          } ${open ? "rotate-90" : ""}`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-primary/10 text-[10px] font-bold text-primary flex items-center justify-center">
          {node.photo_url ? (
            <img src={node.photo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            node.full_name.slice(0, 2).toUpperCase()
          )}
        </div>
        <Link
          to={`/admin-os/people-ops/${node.id}`}
          className="min-w-0 flex-1 flex items-baseline gap-2"
        >
          <span className="truncate text-sm font-medium">{node.full_name}</span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {node.employee_number}
          </span>
        </Link>
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="truncate max-w-[160px]">{node.role_name ?? "—"}</span>
          <span className="truncate max-w-[160px]">{node.department_name ?? "—"}</span>
          {hasChildren && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
              {node.children.length}
            </span>
          )}
        </div>
      </div>
      {open && hasChildren && (
        <div className="border-l border-border/60 ml-[18px]">
          {node.children.map((c) => (
            <TreeNode key={c.id} node={c} depth={depth + 1} defaultOpen={defaultOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

const OrgChart = () => {
  const { hasPermission } = useEmployee();
  const { data: rows, isLoading, error } = useOrgTree();
  const { data: departments } = useDepartments();
  const [search, setSearch] = useState("");
  const [deptId, setDeptId] = useState("");
  const [expandAll, setExpandAll] = useState(false);

  if (!hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_ORG_VIEW))
    return <Navigate to="/admin-os/no-access" replace />;

  const tree = useMemo(() => (rows ? buildTree(rows) : []), [rows]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const match = (n: Node): boolean =>
      (!deptId || n.department_id === deptId) &&
      (!q ||
        n.full_name.toLowerCase().includes(q) ||
        n.employee_number.toLowerCase().includes(q) ||
        n.role_name?.toLowerCase().includes(q) ||
        n.department_name?.toLowerCase().includes(q));
    const filter = (nodes: Node[]): Node[] =>
      nodes
        .map((n) => ({ ...n, children: filter(n.children) }))
        .filter((n) => match(n) || n.children.length > 0);
    return filter(tree);
  }, [tree, search, deptId]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People Ops · Organization"
        title="Organization Chart"
        description="Company-wide reporting hierarchy generated from live employee data."
        actions={
          <Link
            to="/admin-os/people-ops/org"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back to Organization
          </Link>
        }
      />

      <SectionCard>
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, ID, role, department…"
              className="w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={deptId}
            onChange={(e) => setDeptId(e.target.value)}
            className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm"
          >
            <option value="">All departments</option>
            {departments?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setExpandAll((v) => !v)}
            className="h-9 px-3 rounded-lg border border-border/60 bg-background text-xs font-semibold hover:bg-muted"
            key={String(expandAll)}
          >
            {expandAll ? "Collapse all" : "Expand all"}
          </button>
        </div>
        {isLoading ? (
          <LoadingSkeleton rows={8} />
        ) : error ? (
          <EmptyState title="Could not load org chart" description={(error as Error).message} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No matches"
            description="Try clearing your filters."
            icon={Building2}
          />
        ) : (
          <div className="max-h-[75vh] overflow-y-auto">
            {filtered.map((n) => (
              <TreeNode key={n.id} node={n} defaultOpen={expandAll} />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default OrgChart;

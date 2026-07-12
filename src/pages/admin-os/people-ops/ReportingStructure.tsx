import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ChevronRight, Network } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { useEmployeesList } from "@/hooks/admin-os/useEmployees";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import { PageHeader, SectionCard, EmptyState, LoadingSkeleton } from "@/components/admin-os/ds";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Node {
  id: string;
  employee_number: string;
  full_name: string;
  company_email: string;
  photo_url: string | null;
  employment_status: string;
  reporting_manager_id: string | null;
  department_name: string | null;
  role_name: string | null;
  level: string | null;
  children: Node[];
}

const useReportingTree = () =>
  useQuery({
    queryKey: ["admin-os", "reporting-tree"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select(
          `id, employee_number, full_name, company_email, photo_url, employment_status,
           reporting_manager_id, level,
           department:admin_departments!employees_department_id_fkey(name),
           role:admin_roles!employees_role_id_fkey(name)`,
        )
        .not("employment_status", "in", "(exited,archived)")
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

function buildTree(rows: any[]): Node[] {
  const map = new Map<string, Node>();
  rows.forEach((r) =>
    map.set(r.id, {
      id: r.id,
      employee_number: r.employee_number,
      full_name: r.full_name,
      company_email: r.company_email,
      photo_url: r.photo_url,
      employment_status: r.employment_status,
      reporting_manager_id: r.reporting_manager_id,
      department_name: r.department?.name ?? null,
      role_name: r.role?.name ?? null,
      level: r.level,
      children: [],
    }),
  );
  const roots: Node[] = [];
  map.forEach((n) => {
    if (n.reporting_manager_id && map.has(n.reporting_manager_id)) {
      map.get(n.reporting_manager_id)!.children.push(n);
    } else {
      roots.push(n);
    }
  });
  const sort = (arr: Node[]) => {
    arr.sort((a, b) => a.full_name.localeCompare(b.full_name));
    arr.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

function TreeNode({ node, depth = 0 }: { node: Node; depth?: number }) {
  const [open, setOpen] = useState(depth < 1);
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
          className={`h-5 w-5 shrink-0 rounded transition-transform ${
            hasChildren ? "text-muted-foreground hover:text-foreground" : "opacity-0"
          } ${open ? "rotate-90" : ""}`}
          aria-label={open ? "Collapse" : "Expand"}
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
            <TreeNode key={c.id} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

const ReportingStructure = () => {
  const { hasPermission } = useEmployee();
  const { data: rows, isLoading, error } = useReportingTree();
  const { data: employees } = useEmployeesList({});
  const [search, setSearch] = useState("");

  if (!hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_EMPLOYEES_VIEW))
    return <Navigate to="/admin-os/no-access" replace />;

  const tree = useMemo(() => (rows ? buildTree(rows) : []), [rows]);

  const filteredTree = useMemo(() => {
    if (!search.trim()) return tree;
    const q = search.trim().toLowerCase();
    const filter = (nodes: Node[]): Node[] =>
      nodes
        .map((n) => ({ ...n, children: filter(n.children) }))
        .filter(
          (n) =>
            n.full_name.toLowerCase().includes(q) ||
            n.employee_number.toLowerCase().includes(q) ||
            n.department_name?.toLowerCase().includes(q) ||
            n.role_name?.toLowerCase().includes(q) ||
            n.children.length > 0,
        );
    return filter(tree);
  }, [tree, search]);

  const stats = useMemo(() => {
    const total = employees?.length ?? 0;
    const managers = new Set<string>();
    rows?.forEach((r: any) => r.reporting_manager_id && managers.add(r.reporting_manager_id));
    const orphaned = rows?.filter((r: any) => !r.reporting_manager_id).length ?? 0;
    return { total, managers: managers.size, orphaned };
  }, [employees, rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People Ops · Reporting"
        title="Reporting Structure"
        description="Manager hierarchy across active employees. Click a name to open the profile."
      />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active employees", value: stats.total },
          { label: "Managers", value: stats.managers },
          { label: "No manager assigned", value: stats.orphaned },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/60 bg-card p-4">
            <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
              {s.label}
            </p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <SectionCard
        title="Org Tree"
        description="Expandable tree grouped by reporting relationship"
      >
        <div className="mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, ID, role, department…"
            className="w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        {isLoading ? (
          <LoadingSkeleton rows={6} />
        ) : error ? (
          <p className="p-6 text-sm text-destructive">{(error as Error).message}</p>
        ) : filteredTree.length === 0 ? (
          <EmptyState
            title="No matches"
            description="Adjust your search to see the reporting tree."
          />
        ) : (
          <div className="max-h-[70vh] overflow-y-auto">
            {filteredTree.map((n) => (
              <TreeNode key={n.id} node={n} />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default ReportingStructure;

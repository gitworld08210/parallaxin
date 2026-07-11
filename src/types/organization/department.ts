// Department domain types. Mirrors the `organization_departments` row.
export type DepartmentId = string;

export interface Department {
  id: DepartmentId;
  organization_id: string;
  parent_department_id: string | null;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DepartmentNode extends Department {
  children: DepartmentNode[];
}

export interface CreateDepartmentInput {
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  parentDepartmentId?: string | null;
}

export interface UpdateDepartmentInput {
  name?: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  parentDepartmentId?: string | null;
}

/** Build a nested tree from a flat department list. */
export const buildDepartmentTree = (rows: Department[]): DepartmentNode[] => {
  const byId = new Map<string, DepartmentNode>();
  rows.forEach((r) => byId.set(r.id, { ...r, children: [] }));
  const roots: DepartmentNode[] = [];
  byId.forEach((node) => {
    if (node.parent_department_id && byId.has(node.parent_department_id)) {
      byId.get(node.parent_department_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
};

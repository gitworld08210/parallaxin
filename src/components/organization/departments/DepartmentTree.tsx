import { DepartmentCard } from "./DepartmentCard";
import type { DepartmentNode } from "@/types/organization/department";

interface DepartmentTreeProps {
  nodes: DepartmentNode[];
  membersByDepartmentId?: Record<string, number>;
  onEdit?: (node: DepartmentNode) => void;
  depth?: number;
}

/**
 * Recursive nested renderer for departments. Uses `DepartmentCard` for each
 * node and indents children so the hierarchy is obvious.
 */
export const DepartmentTree = ({ nodes, membersByDepartmentId, onEdit, depth = 0 }: DepartmentTreeProps) => {
  if (nodes.length === 0) return null;
  return (
    <div className="space-y-3" style={{ paddingLeft: depth === 0 ? 0 : 20 }}>
      {nodes.map((node) => (
        <div key={node.id} className="space-y-3">
          <DepartmentCard
            node={node}
            memberCount={membersByDepartmentId?.[node.id] ?? 0}
            onEdit={onEdit}
          />
          {node.children.length > 0 && (
            <div className="border-l pl-4">
              <DepartmentTree
                nodes={node.children}
                membersByDepartmentId={membersByDepartmentId}
                onEdit={onEdit}
                depth={depth + 1}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DepartmentTree;

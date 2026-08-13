import { useMemo, useState } from "react";
import { Building2, Loader2, Plus, ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";
import {
  useDepartmentMemberCounts,
  useOrganizationDepartments,
} from "@/hooks/organization/useOrganizationDepartments";
import { DepartmentFormModal, DepartmentTree } from "@/components/organization/departments";
import { ORG_PERMISSIONS } from "@/features/organization/permissions.registry";
import type { Department } from "@/types/organization/department";

export default function OrganizationDepartments() {
  const { hasPermission } = useOrganizationContext();
  const { departments, tree, loading, error } = useOrganizationDepartments();
  const { counts } = useDepartmentMemberCounts();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);

  const canView = hasPermission(ORG_PERMISSIONS.DEPARTMENTS_VIEW);
  const canCreate = hasPermission(ORG_PERMISSIONS.DEPARTMENTS_CREATE);

  const filteredTree = useMemo(() => {
    if (!search.trim()) return tree;
    const q = search.trim().toLowerCase();
    const filterNodes = (nodes: typeof tree): typeof tree =>
      nodes.map((n) => ({ ...n, children: filterNodes(n.children) })).filter(
          (n) => n.name.toLowerCase().includes(q) || n.children.length > 0);
    return filterNodes(tree);
  }, [tree, search]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (d: Department) => {
    setEditing(d);
    setModalOpen(true);
  };

  if (!canView) {
    return (
      <div className="p-4 md:p-8">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access restricted</AlertTitle>
          <AlertDescription>
            You don't have permission to view departments in this organization.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8" data-page="OrganizationDepartments">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Departments</h1>
          <p className="text-sm text-muted-foreground">
            Group teams and sub-teams. Members inherit a department for reporting.
          </p>
        </div>
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> New department
          </Button>
        )}
      </header>

      <div className="max-w-sm">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search departments"
        />
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn't load departments</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : departments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="rounded-full bg-muted p-3">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-base font-semibold">No departments yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first department to organize your team.
              </p>
            </div>
            {canCreate && (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> New department
              </Button>
            )}
          </CardContent>
        </Card>
      ) : filteredTree.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No departments match "{search}".
          </CardContent>
        </Card>
      ) : (
        <DepartmentTree
          nodes={filteredTree}
          membersByDepartmentId={counts}
          onEdit={openEdit}
        />
      )}

      <DepartmentFormModal
        open={modalOpen}
        onOpenChange={(v) => {
          setModalOpen(v);
          if (!v) setEditing(null);
        }}
        department={editing}
      />
    </div>
  );
}

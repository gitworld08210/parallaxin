// useOrganizationDepartments — real query + mutations for departments.
// All Supabase access flows through department.service.ts.
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useOrganizationContext } from "@/contexts/OrganizationProvider";
import { departmentService } from "@/services/organization/department.service";
import { orgKeys } from "@/services/organization/queryKeys";
import {
  buildDepartmentTree,
  type CreateDepartmentInput,
  type Department,
  type DepartmentNode,
  type UpdateDepartmentInput,
} from "@/types/organization/department";

/** List every department in the current org + a nested tree view. */
export const useOrganizationDepartments = () => {
  const { organizationId } = useOrganizationContext();
  const query = useQuery({
    queryKey: organizationId ? orgKeys.departments(organizationId) : ["organization", "__none__", "departments"],
    queryFn: () => departmentService.list(organizationId!),
    enabled: !!organizationId,
    staleTime: 30_000,
  });
  const departments: Department[] = query.data ?? [];
  const tree: DepartmentNode[] = useMemo(() => buildDepartmentTree(departments), [departments]);
  return {
    departments,
    tree,
    loading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
};

/** Load a single department by id (scoped to the current org). */
export const useDepartment = (departmentId: string | null | undefined) => {
  const { organizationId } = useOrganizationContext();
  const query = useQuery({
    queryKey:
      organizationId && departmentId
        ? orgKeys.department(organizationId, departmentId)
        : ["organization", "__none__", "department", departmentId ?? "__none__"],
    queryFn: () => departmentService.getById(departmentId!),
    enabled: !!organizationId && !!departmentId,
    staleTime: 30_000,
  });
  return {
    department: query.data ?? null,
    loading: query.isLoading,
    error: query.error as Error | null,
  };
};

/** Aggregated member counts keyed by department id. */
export const useDepartmentMemberCounts = () => {
  const { organizationId } = useOrganizationContext();
  const query = useQuery({
    queryKey: organizationId
      ? orgKeys.departmentMemberCounts(organizationId)
      : ["organization", "__none__", "departments", "member-counts"],
    queryFn: () => departmentService.memberCountsByDepartment(organizationId!),
    enabled: !!organizationId,
    staleTime: 30_000,
  });
  return {
    counts: query.data ?? {},
    loading: query.isLoading,
    error: query.error as Error | null,
  };
};

/** Mutation bundle for department CRUD + member assignment. */
export const useDepartmentMutations = () => {
  const { organizationId } = useOrganizationContext();
  const qc = useQueryClient();

  const invalidate = () => {
    if (!organizationId) return;
    qc.invalidateQueries({ queryKey: orgKeys.departments(organizationId) });
  };

  const create = useMutation({
    mutationFn: (input: CreateDepartmentInput) => {
      if (!organizationId) throw new Error("No organization");
      return departmentService.create(organizationId, input);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Department created");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create department"),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateDepartmentInput }) =>
      departmentService.update(id, patch),
    onSuccess: (_data, vars) => {
      if (organizationId) {
        qc.invalidateQueries({ queryKey: orgKeys.departments(organizationId) });
        qc.invalidateQueries({ queryKey: orgKeys.department(organizationId, vars.id) });
      }
      toast.success("Department updated");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update department"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => departmentService.remove(id),
    onSuccess: () => {
      invalidate();
      // A removed department detaches members, so member data can change too.
      if (organizationId) qc.invalidateQueries({ queryKey: orgKeys.members(organizationId) });
      toast.success("Department deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete department"),
  });

  const assignMember = useMutation({
    mutationFn: ({ memberId, departmentId }: { memberId: string; departmentId: string }) =>
      departmentService.assignMember(memberId, departmentId),
    onSuccess: (_d, vars) => {
      invalidate();
      if (organizationId) {
        qc.invalidateQueries({ queryKey: orgKeys.member(organizationId, vars.memberId) });
        qc.invalidateQueries({ queryKey: orgKeys.members(organizationId) });
      }
    },
    onError: (e: Error) => toast.error(e.message || "Failed to assign department"),
  });

  const removeMember = useMutation({
    mutationFn: ({ memberId }: { memberId: string }) => departmentService.removeMember(memberId),
    onSuccess: (_d, vars) => {
      invalidate();
      if (organizationId) {
        qc.invalidateQueries({ queryKey: orgKeys.member(organizationId, vars.memberId) });
        qc.invalidateQueries({ queryKey: orgKeys.members(organizationId) });
      }
    },
    onError: (e: Error) => toast.error(e.message || "Failed to clear department"),
  });

  return { create, update, remove, assignMember, removeMember };
};

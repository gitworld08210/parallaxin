// useOrganizationMembers — paginated member list + mutations (change role,
// remove, transfer ownership) with optimistic React Query updates.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";
import { memberService } from "@/services/organization/member.service";
import { orgKeys } from "@/services/organization/queryKeys";
import type { MemberPage } from "@/services/organization/member.service";
import type { MemberWithProfile } from "@/types/organization/member";

interface UseOrganizationMembersOptions {
  page?: number;
  pageSize?: number;
  search?: string;
}

const EMPTY_PAGE: MemberPage = {
  members: [],
  total: 0,
  page: 0,
  pageSize: 12,
  hasMore: false,
};

/** Paginated members list, keyed on org + page + pageSize + search. */
export const useOrganizationMembers = ({
  page = 0,
  pageSize = 12,
  search = "",
}: UseOrganizationMembersOptions = {}) => {
  const { organizationId } = useOrganizationContext();
  const query = useQuery({
    queryKey: organizationId
      ? orgKeys.membersPage(organizationId, page, pageSize, search)
      : ["organization", "__none__", "members", "page"],
    queryFn: () => memberService.listPage(organizationId!, { page, pageSize, search }),
    enabled: !!organizationId,
    staleTime: 30_000,
  });

  return {
    members: query.data?.members ?? [],
    total: query.data?.total ?? 0,
    page,
    pageSize,
    hasMore: query.data?.hasMore ?? false,
    loading: query.isLoading,
    fetching: query.isFetching,
    error: query.error as Error | null,
    refetch: query.refetch,
    raw: query.data ?? EMPTY_PAGE,
  };
};

/** Single-member details for the member profile card. */
export const useOrganizationMember = (memberId: string | undefined) => {
  const { organizationId } = useOrganizationContext();
  const query = useQuery({
    queryKey:
      organizationId && memberId
        ? orgKeys.member(organizationId, memberId)
        : ["organization", "__none__", "member"],
    queryFn: () => memberService.getById(organizationId!, memberId!),
    enabled: !!organizationId && !!memberId,
    staleTime: 30_000,
  });
  return {
    member: query.data ?? null,
    loading: query.isLoading,
    error: query.error as Error | null,
  };
};

/** Mutations for members. Optimistic where safe; always invalidate on settle. */
export const useMemberMutations = () => {
  const { organizationId } = useOrganizationContext();
  const qc = useQueryClient();

  const invalidateMembers = () => {
    if (!organizationId) return;
    qc.invalidateQueries({ queryKey: ["organization", organizationId, "members"] });
    qc.invalidateQueries({ queryKey: orgKeys.recentMembers(organizationId) });
    qc.invalidateQueries({ queryKey: orgKeys.dashboard(organizationId) });
    qc.invalidateQueries({ queryKey: orgKeys.detail(organizationId) });
  };

  const changeRole = useMutation({
    mutationFn: ({ memberId, roleId }: { memberId: string; roleId: string }) =>
      memberService.changeRole(organizationId!, memberId, roleId),
    onMutate: async ({ memberId, roleId }) => {
      if (!organizationId) return;
      const roles = qc.getQueryData<{ id: string; name: string }[]>(
        orgKeys.roles(organizationId));
      const roleName = roles?.find((r) => r.id === roleId)?.name ?? null;
      const affected = qc.getQueriesData<MemberPage>({
        queryKey: ["organization", organizationId, "members", "page"],
      });
      const snapshot = affected.map(([key, val]) => [key, val] as const);
      affected.forEach(([key, val]) => {
        if (!val) return;
        qc.setQueryData<MemberPage>(key, {
          ...val,
          members: val.members.map((m) =>
            m.id === memberId ? { ...m, role_names: roleName ? [roleName] : m.role_names } : m,
          ),
        });
      });
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshot.forEach(([key, val]) => qc.setQueryData(key, val));
    },
    onSettled: invalidateMembers,
  });

  const remove = useMutation({
    mutationFn: ({ memberId }: { memberId: string }) =>
      memberService.remove(organizationId!, memberId),
    onMutate: async ({ memberId }) => {
      if (!organizationId) return;
      const affected = qc.getQueriesData<MemberPage>({
        queryKey: ["organization", organizationId, "members", "page"],
      });
      const snapshot = affected.map(([key, val]) => [key, val] as const);
      affected.forEach(([key, val]) => {
        if (!val) return;
        qc.setQueryData<MemberPage>(key, {
          ...val,
          members: val.members.filter((m: MemberWithProfile) => m.id !== memberId),
          total: Math.max(0, val.total - 1),
        });
      });
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshot.forEach(([key, val]) => qc.setQueryData(key, val));
    },
    onSettled: invalidateMembers,
  });

  const transferOwnership = useMutation({
    mutationFn: ({ newOwnerUserId }: { newOwnerUserId: string }) =>
      memberService.transferOwnership(organizationId!, newOwnerUserId),
    onSettled: () => {
      invalidateMembers();
      if (organizationId) qc.invalidateQueries({ queryKey: orgKeys.workspaces("*") });
    },
  });

  return { changeRole, remove, transferOwnership };
};

/** Convenience for search/page state used by MembersList. */
export const useMembersListState = (initial?: UseOrganizationMembersOptions) => {
  const [page, setPage] = useState(initial?.page ?? 0);
  const [pageSize, setPageSize] = useState(initial?.pageSize ?? 12);
  const [search, setSearch] = useState(initial?.search ?? "");
  return { page, setPage, pageSize, setPageSize, search, setSearch };
};

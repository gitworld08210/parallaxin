// useOrganizationInvites — pending invites for the current org + incoming
// invites for the signed-in user, plus mutations (invite / accept / decline /
// cancel). Every mutation runs via a permission-checked RPC.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthProvider";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { inviteService } from "@/services/organization/invite.service";
import { orgKeys } from "@/services/organization/queryKeys";
import type { InviteWithMeta } from "@/types/organization/invite";

/** Pending invites for the current organization (admin view). */
export const useOrganizationInvites = () => {
  const { organizationId } = useOrganizationContext();
  const query = useQuery({
    queryKey: organizationId ? orgKeys.invites(organizationId) : ["organization", "__none__", "invites"],
    queryFn: () => inviteService.listPending(organizationId!),
    enabled: !!organizationId,
    staleTime: 30_000,
  });
  return {
    invites: query.data ?? [],
    loading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
};

/**
 * Pending invites addressed to the signed-in user (accept/decline UI).
 * Username is read from public.profiles via useCurrentProfile — never from
 * auth.user_metadata, which is not populated in this project.
 */
export const useIncomingInvites = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useCurrentProfile();
  const ready = !!user?.id && !profileLoading;

  const query = useQuery({
    queryKey: user?.id
      ? [...orgKeys.incomingInvites(user.id), profile?.username ?? null]
      : ["organization", "incoming-invites", "__anon__"],
    queryFn: () =>
      inviteService.listIncomingForUser({
        username: profile?.username ?? null,
        email: user?.email ?? null,
      }),
    enabled: ready,
    staleTime: 30_000,
  });
  return {
    invites: query.data ?? [],
    loading: profileLoading || query.isLoading,
    error: query.error as Error | null,
  };
};

/** Mutations for invites with optimistic cache updates. */
export const useInviteMutations = () => {
  const { organizationId } = useOrganizationContext();
  const { user } = useAuth();
  const qc = useQueryClient();

  const invalidatePending = () => {
    if (organizationId) qc.invalidateQueries({ queryKey: orgKeys.invites(organizationId) });
  };
  const invalidateIncoming = () => {
    if (user?.id) qc.invalidateQueries({ queryKey: orgKeys.incomingInvites(user.id) });
  };

  const invite = useMutation({
    mutationFn: ({
      email,
      username,
      roleId,
    }: {
      email?: string;
      username?: string;
      roleId?: string | null;
    }) => inviteService.invite(organizationId!, { email, username, roleId }),
    onSettled: invalidatePending,
  });

  const cancel = useMutation({
    mutationFn: ({ inviteId }: { inviteId: string }) => inviteService.cancel(inviteId),
    onMutate: async ({ inviteId }) => {
      if (!organizationId) return;
      const key = orgKeys.invites(organizationId);
      const prev = qc.getQueryData<InviteWithMeta[]>(key);
      if (prev) qc.setQueryData<InviteWithMeta[]>(key, prev.filter((i) => i.id !== inviteId));
      return { prev, key };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev && ctx.key) qc.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: invalidatePending,
  });

  const accept = useMutation({
    mutationFn: ({ token }: { token: string }) => inviteService.accept(token),
    onSettled: () => {
      invalidateIncoming();
      invalidatePending();
      if (user?.id) qc.invalidateQueries({ queryKey: orgKeys.workspaces(user.id) });
    },
  });

  const decline = useMutation({
    mutationFn: ({ token }: { token: string }) => inviteService.decline(token),
    onMutate: async ({ token }) => {
      if (!user?.id) return;
      const key = orgKeys.incomingInvites(user.id);
      const prev = qc.getQueryData<InviteWithMeta[]>(key);
      if (prev)
        qc.setQueryData<InviteWithMeta[]>(key, prev.filter((i) => i.invite_token !== token));
      return { prev, key };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev && ctx.key) qc.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: invalidateIncoming,
  });

  return { invite, cancel, accept, decline };
};

/**
 * Standalone accept/decline mutations for surfaces that live OUTSIDE an
 * OrganizationProvider (Notifications, global menus). Does not depend on the
 * organization context; invalidates the current user's incoming-invites list
 * and workspaces list on success.
 */
export const useIncomingInviteActions = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const invalidate = () => {
    if (!user?.id) return;
    qc.invalidateQueries({ queryKey: orgKeys.incomingInvites(user.id) });
    qc.invalidateQueries({ queryKey: orgKeys.workspaces(user.id) });
    qc.invalidateQueries({ queryKey: orgKeys.userMemberships(user.id) });
  };

  const accept = useMutation({
    mutationFn: ({ token }: { token: string }) => inviteService.accept(token),
    onMutate: async ({ token }) => {
      if (!user?.id) return;
      const key = orgKeys.incomingInvites(user.id);
      const prev = qc.getQueryData<InviteWithMeta[]>(key);
      if (prev)
        qc.setQueryData<InviteWithMeta[]>(key, prev.filter((i) => i.invite_token !== token));
      return { prev, key };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev && ctx.key) qc.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: invalidate,
  });

  const decline = useMutation({
    mutationFn: ({ token }: { token: string }) => inviteService.decline(token),
    onMutate: async ({ token }) => {
      if (!user?.id) return;
      const key = orgKeys.incomingInvites(user.id);
      const prev = qc.getQueryData<InviteWithMeta[]>(key);
      if (prev)
        qc.setQueryData<InviteWithMeta[]>(key, prev.filter((i) => i.invite_token !== token));
      return { prev, key };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev && ctx.key) qc.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: invalidate,
  });

  return { accept, decline };
};

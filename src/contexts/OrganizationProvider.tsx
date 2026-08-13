/**
 * OrganizationProvider — single source of truth for the current organization
 * context. Resolves the organization from the URL slug (or falls back to the
 * signed-in user's first workspace), loads membership + permissions, and
 * exposes helpers every /organization/* page uses via `useOrganization()`.
 *
 * Contract:
 *  - No page inside /organization/* may query Supabase for the "current org".
 *    Always read `useOrganization()`. Mutations still go through services.
 *  - Server-side authorization is the source of truth. `hasPermission()` is a
 *    UI convenience; RLS/RPCs must independently enforce permissions.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthProvider";
import { organizationService } from "@/services/organization/organization.service";
import { orgKeys } from "@/services/organization/queryKeys";
import type {
  Organization,
  OrganizationMembership,
  WorkspaceSummary,
} from "@/types/organization/organization";
import type { OrgPermissionKey } from "@/features/organization/permissions.registry";

type OrgContextValue = {
  organizationId: string | null;
  organization: Organization | null;
  membership: OrganizationMembership | null;
  role: { isOwner: boolean; roleNames: string[] };
  permissions: ReadonlySet<string>;
  workspaces: WorkspaceSummary[];
  loading: boolean;
  error: Error | null;
  hasPermission: (key: OrgPermissionKey | string) => boolean;
  switchOrganization: (slugOrId: string) => void;
  refreshOrganization: () => Promise<void>;
};

const OrganizationContext = createContext<OrgContextValue | undefined>(undefined);

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 1. User's available workspaces (drives the default fallback + switcher).
  const workspacesQuery = useQuery({
    queryKey: orgKeys.workspaces(user?.id ?? "__anon__"),
    queryFn: () => organizationService.listWorkspacesForUser(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });
  const workspaces = workspacesQuery.data ?? [];

  // 2. Resolve slug → organization row. If no slug, pick the user's first workspace.
  //    Key includes the fallback workspace id so the query refetches when the
  //    workspaces list arrives/changes (prevents stale cache on /organization).
  const fallbackWorkspaceId = !slug ? workspaces[0]?.id ?? null : null;
  const resolveQuery = useQuery({
    queryKey: slug
      ? orgKeys.bySlug(slug)
      : ([...orgKeys.bySlug(null), "fallback", fallbackWorkspaceId ?? "__none__"] as const),
    queryFn: async () => {
      if (slug) return organizationService.resolveBySlug(slug);
      const first = workspaces[0];
      if (first) {
        return {
          id: first.id,
          slug: first.slug,
          name: first.name,
          username: "",
          logo_url: first.logo_url,
          cover_url: null,
          org_type: null,
          is_member: true,
          is_owner: first.is_owner,
        };
      }
      return null;
    },
    enabled: !authLoading && !!user?.id && (!!slug || workspaces.length > 0),
    staleTime: 60_000,
  });
  const organizationId = resolveQuery.data?.id ?? null;

  // 3. Load org + membership + effective permissions in one shot.
  const contextQuery = useQuery({
    queryKey: organizationId ? orgKeys.detail(organizationId) : ["organization", "__none__"],
    queryFn: () => organizationService.loadContext(organizationId!, user!.id),
    enabled: !!organizationId && !!user?.id,
    staleTime: 30_000,
  });

  const organization = contextQuery.data?.organization ?? null;
  const membership = contextQuery.data?.membership ?? null;
  const permissions = useMemo(
    () => new Set<string>(contextQuery.data?.permissions ?? []),
    [contextQuery.data?.permissions]);
  const roleNames = useMemo(
    () => workspaces.find((w) => w.id === organizationId)?.role_names ?? [],
    [workspaces, organizationId]);

  const hasPermission = useCallback(
    (key: OrgPermissionKey | string) => {
      if (membership?.is_owner) return true;
      return permissions.has(key);
    },
    [membership?.is_owner, permissions]);

  const switchOrganization = useCallback(
    (slugOrId: string) => {
      const match = workspaces.find((w) => w.id === slugOrId || w.slug === slugOrId);
      const targetSlug = match?.slug ?? slugOrId;
      navigate(`/organization/${targetSlug}/dashboard`);
    },
    [navigate, workspaces]);

  const refreshOrganization = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: orgKeys.bySlug(slug ?? null) }),
      organizationId
        ? queryClient.invalidateQueries({ queryKey: orgKeys.detail(organizationId) })
        : Promise.resolve(),
      user?.id
        ? queryClient.invalidateQueries({ queryKey: orgKeys.workspaces(user.id) })
        : Promise.resolve(),
    ]);
  }, [queryClient, slug, organizationId, user?.id]);

  // Keep the URL slug in sync with the resolved organization slug when the
  // fallback picks a workspace but the URL has no :slug.
  useEffect(() => {
    if (!slug && resolveQuery.data?.slug) {
      // Only rewrite when actually on /organization or /organization/dashboard etc.
      const path = window.location.pathname.replace(/^\/organization\/?/, "");
      const tail = path.length ? `/${path}` : "/dashboard";
      navigate(`/organization/${resolveQuery.data.slug}${tail}`, { replace: true });
    }
  }, [slug, resolveQuery.data?.slug, navigate]);

  const value: OrgContextValue = {
    organizationId,
    organization,
    membership,
    role: { isOwner: !!membership?.is_owner, roleNames },
    permissions,
    workspaces,
    loading:
      authLoading ||
      workspacesQuery.isLoading ||
      resolveQuery.isLoading ||
      contextQuery.isLoading,
    error:
      (workspacesQuery.error as Error | null) ??
      (resolveQuery.error as Error | null) ??
      (contextQuery.error as Error | null) ??
      null,
    hasPermission,
    switchOrganization,
    refreshOrganization,
  };

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
};

export const useOrganizationContext = () => {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error("useOrganizationContext must be used inside OrganizationProvider");
  return ctx;
};

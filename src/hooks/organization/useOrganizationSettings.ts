// useOrganizationSettings — cached settings row + update mutation.
// All writes route through the `org_update_settings` RPC (server enforced).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useOrganizationContext } from "@/contexts/OrganizationProvider";
import { settingsService, type OrganizationSettingsUpdate } from "@/services/organization/settings.service";
import { orgKeys } from "@/services/organization/queryKeys";

export const useOrganizationSettings = () => {
  const { organizationId } = useOrganizationContext();
  const query = useQuery({
    queryKey: organizationId ? orgKeys.settings(organizationId) : ["organization", "__none__", "settings"],
    queryFn: () => settingsService.get(organizationId!),
    enabled: !!organizationId,
    staleTime: 60_000,
  });
  return {
    settings: query.data ?? null,
    loading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
};

export const useUpdateOrganizationSettings = () => {
  const { organizationId, organization, refreshOrganization } = useOrganizationContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (patch: OrganizationSettingsUpdate) => {
      if (!organizationId) throw new Error("No organization");
      await settingsService.update(organizationId, patch);
    },
    onSuccess: async (_data, patch) => {
      if (!organizationId) return;
      // Only invalidate touched resources.
      qc.invalidateQueries({ queryKey: orgKeys.settings(organizationId) });
      qc.invalidateQueries({ queryKey: orgKeys.detail(organizationId) });
      qc.invalidateQueries({ queryKey: orgKeys.featureFlags(organizationId) });
      if (organization?.slug) qc.invalidateQueries({ queryKey: orgKeys.bySlug(organization.slug) });
      if (patch.slug && organization?.slug && patch.slug !== organization.slug) {
        qc.invalidateQueries({ queryKey: orgKeys.bySlug(patch.slug) });
      }
      await refreshOrganization();
      toast.success("Settings saved");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save settings"),
  });
};

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const logAudit = async (action: string, resource: string, resourceId: string | null, details: any) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("admin_audit_logs").insert({
    action, resource_type: resource, resource_id: resourceId,
    user_id: user.id, details, severity: "info",
  } as any);
};

/* ---------------- Configurations ---------------- */
export const useCompanyConfigurations = (category?: string) =>
  useQuery({
    queryKey: ["company-configurations", category ?? "all"],
    queryFn: async () => {
      let q = supabase.from("company_configurations").select("*").order("category").order("key");
      if (category) q = q.eq("category", category);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useConfigVersions = (configId?: string) =>
  useQuery({
    queryKey: ["company-config-versions", configId],
    enabled: !!configId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_configuration_versions")
        .select("*")
        .eq("config_id", configId!)
        .order("version", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertConfiguration = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id?: string; category: string; key: string; value: any;
      description?: string; is_critical?: boolean; requires_dual_approval?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const row = { ...payload, updated_by: user?.id };
      const { data, error } = payload.id
        ? await supabase.from("company_configurations").update(row).eq("id", payload.id).select().single()
        : await supabase.from("company_configurations").insert(row).select().single();
      if (error) throw error;
      await logAudit(payload.id ? "config.update" : "config.create", "company_configuration", data.id, { key: payload.key });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-configurations"] });
      toast.success("Configuration saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save configuration"),
  });
};

export const useRollbackConfiguration = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ configId, version }: { configId: string; version: number }) => {
      const { data: ver, error: vErr } = await supabase
        .from("company_configuration_versions")
        .select("value").eq("config_id", configId).eq("version", version).single();
      if (vErr) throw vErr;
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("company_configurations")
        .update({ value: ver.value, updated_by: user?.id })
        .eq("id", configId).select().single();
      if (error) throw error;
      await logAudit("config.rollback", "company_configuration", configId, { restored_version: version });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-configurations"] });
      qc.invalidateQueries({ queryKey: ["company-config-versions"] });
      toast.success("Configuration rolled back");
    },
    onError: (e: any) => toast.error(e.message ?? "Rollback failed"),
  });
};

/* ---------------- Brand Assets ---------------- */
export const useBrandAssets = () =>
  useQuery({
    queryKey: ["company-brand-assets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_brand_assets").select("*").order("asset_type");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertBrandAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const row = { ...payload, updated_by: user?.id };
      const { data, error } = payload.id
        ? await supabase.from("company_brand_assets").update(row).eq("id", payload.id).select().single()
        : await supabase.from("company_brand_assets").insert(row).select().single();
      if (error) throw error;
      await logAudit(payload.id ? "brand.update" : "brand.create", "company_brand_asset", data.id, { name: payload.name });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-brand-assets"] });
      toast.success("Brand asset saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

export const useDeleteBrandAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("company_brand_assets").delete().eq("id", id);
      if (error) throw error;
      await logAudit("brand.delete", "company_brand_asset", id, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-brand-assets"] });
      toast.success("Brand asset deleted");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

/* ---------------- Feature Flags ---------------- */
export const useFeatureFlags = () =>
  useQuery({
    queryKey: ["company-feature-flags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_feature_flags").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertFeatureFlag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const row = { ...payload, updated_by: user?.id };
      const { data, error } = payload.id
        ? await supabase.from("company_feature_flags").update(row).eq("id", payload.id).select().single()
        : await supabase.from("company_feature_flags").insert(row).select().single();
      if (error) throw error;
      await logAudit(payload.id ? "flag.update" : "flag.create", "company_feature_flag", data.id, { key: payload.key, enabled: payload.is_enabled });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-feature-flags"] });
      toast.success("Feature flag saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

export const useDeleteFeatureFlag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("company_feature_flags").delete().eq("id", id);
      if (error) throw error;
      await logAudit("flag.delete", "company_feature_flag", id, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-feature-flags"] });
      toast.success("Feature flag deleted");
    },
  });
};

/* ---------------- Modules ---------------- */
export const useModules = () =>
  useQuery({
    queryKey: ["company-modules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_modules").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertModule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Validate dependencies before disabling
      if (payload.id && payload.status && payload.status !== "active") {
        const { data: all } = await supabase.from("company_modules").select("module_key,dependencies,status");
        const dependents = (all ?? []).filter(
          (m: any) => m.status === "active" && (m.dependencies ?? []).includes(payload.module_key)
        );
        if (dependents.length > 0) {
          throw new Error(`Cannot change status. Active modules depend on this: ${dependents.map((d: any) => d.module_key).join(", ")}`);
        }
      }

      const row = { ...payload, updated_by: user?.id };
      const { data, error } = payload.id
        ? await supabase.from("company_modules").update(row).eq("id", payload.id).select().single()
        : await supabase.from("company_modules").insert(row).select().single();
      if (error) throw error;
      await logAudit(payload.id ? "module.update" : "module.create", "company_module", data.id, { key: payload.module_key, status: payload.status });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-modules"] });
      toast.success("Module saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

/* ---------------- Metadata ---------------- */
export const useMetadata = () =>
  useQuery({
    queryKey: ["company-metadata"],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_metadata").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertMetadata = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const row = { ...payload, updated_by: user?.id };
      const { data, error } = payload.id
        ? await supabase.from("company_metadata").update(row).eq("id", payload.id).select().single()
        : await supabase.from("company_metadata").insert(row).select().single();
      if (error) throw error;
      await logAudit(payload.id ? "metadata.update" : "metadata.create", "company_metadata", data.id, { key: payload.key });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-metadata"] });
      toast.success("Metadata saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

export const useDeleteMetadata = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("company_metadata").delete().eq("id", id);
      if (error) throw error;
      await logAudit("metadata.delete", "company_metadata", id, {});
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-metadata"] }),
  });
};

/* ---------------- Calendar ---------------- */
export const useCalendarEvents = () =>
  useQuery({
    queryKey: ["company-calendar-events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_calendar_events").select("*").order("starts_at");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertCalendarEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const row = { ...payload, created_by: user?.id };
      const { data, error } = payload.id
        ? await supabase.from("company_calendar_events").update(row).eq("id", payload.id).select().single()
        : await supabase.from("company_calendar_events").insert(row).select().single();
      if (error) throw error;
      await logAudit(payload.id ? "calendar.update" : "calendar.create", "company_calendar_event", data.id, { title: payload.title });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-calendar-events"] });
      toast.success("Calendar event saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

export const useDeleteCalendarEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("company_calendar_events").delete().eq("id", id);
      if (error) throw error;
      await logAudit("calendar.delete", "company_calendar_event", id, {});
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-calendar-events"] }),
  });
};

/* ---------------- Localization ---------------- */
export const useLocalizations = () =>
  useQuery({
    queryKey: ["company-localizations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_localization").select("*").order("display_name");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertLocalization = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const row = { ...payload, updated_by: user?.id };
      const { data, error } = payload.id
        ? await supabase.from("company_localization").update(row).eq("id", payload.id).select().single()
        : await supabase.from("company_localization").insert(row).select().single();
      if (error) throw error;
      await logAudit(payload.id ? "localization.update" : "localization.create", "company_localization", data.id, { code: payload.language_code });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-localizations"] });
      toast.success("Localization saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

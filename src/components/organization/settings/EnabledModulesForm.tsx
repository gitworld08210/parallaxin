import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  useOrganizationSettings,
  useUpdateOrganizationSettings,
} from "@/hooks/organization/useOrganizationSettings";
import {
  DEFAULT_ORG_FEATURES,
  ORG_FEATURE_KEYS,
  type OrgFeatureKey,
} from "@/features/organization/featureFlags";

const MODULE_META: Partial<Record<OrgFeatureKey, { label: string; description: string }>> = {
  dashboard: { label: "Dashboard", description: "Workspace home & metrics." },
  members: { label: "Members", description: "People, invitations, and roles." },
  departments: { label: "Departments", description: "Team & sub-team structure." },
  roles: { label: "Roles", description: "Custom permission bundles." },
  permissions: { label: "Permissions", description: "Fine-grained access matrix." },
  projects: { label: "Projects", description: "Cross-team initiatives." },
  tasks: { label: "Tasks", description: "Action items & assignments." },
  ai: { label: "AI", description: "AI Hub tools." },
  stories: { label: "Stories", description: "Ephemeral updates." },
  reels: { label: "Reels", description: "Short-form video." },
};

const TOGGLEABLE: OrgFeatureKey[] = [
  "dashboard",
  "members",
  "departments",
  "roles",
  "permissions",
  "projects",
  "tasks",
  "ai",
  "stories",
  "reels",
];

/**
 * Enabled-modules editor. Reads `organization_settings.enabled_modules`
 * and writes through `useUpdateOrganizationSettings` (server RPC).
 */
export const EnabledModulesForm = () => {
  const { settings, loading } = useOrganizationSettings();
  const update = useUpdateOrganizationSettings();

  const stored = useMemo<Set<OrgFeatureKey>>(() => {
    const src = settings?.enabled_modules;
    if (src && src.length > 0) return new Set(src as OrgFeatureKey[]);
    return new Set(ORG_FEATURE_KEYS.filter((k) => DEFAULT_ORG_FEATURES[k]));
  }, [settings?.enabled_modules]);

  const [enabled, setEnabled] = useState<Set<OrgFeatureKey>>(stored);
  useEffect(() => setEnabled(new Set(stored)), [stored]);

  const dirty = useMemo(() => {
    if (enabled.size !== stored.size) return true;
    for (const v of enabled) if (!stored.has(v)) return true;
    return false;
  }, [enabled, stored]);

  const toggle = (key: OrgFeatureKey, value: boolean) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (value) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const handleSave = () => {
    update.mutate({ enabledModules: Array.from(enabled) });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enabled modules</CardTitle>
        <CardDescription>
          Disabled modules disappear from navigation for everyone in this organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {TOGGLEABLE.map((key) => {
          const meta = MODULE_META[key];
          const label = meta?.label ?? key;
          const description = meta?.description ?? "";
          const isForced = key === "dashboard";
          return (
            <div
              key={key}
              className="flex items-center justify-between gap-4 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <Label className="text-sm font-medium">{label}</Label>
                {description && (
                  <p className="text-xs text-muted-foreground">{description}</p>
                )}
              </div>
              <Switch
                checked={enabled.has(key)}
                onCheckedChange={(v) => toggle(key, v)}
                disabled={isForced}
                aria-label={`Toggle ${label}`}
              />
            </div>
          );
        })}
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={!dirty || update.isPending}>
            {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save modules
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnabledModulesForm;

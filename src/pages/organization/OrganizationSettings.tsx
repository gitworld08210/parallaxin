import { ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";
import { SettingsForm, EnabledModulesForm } from "@/components/organization/settings";
import { ORG_PERMISSIONS } from "@/features/organization/permissions.registry";

export default function OrganizationSettings() {
  const { hasPermission } = useOrganizationContext();
  const canEdit = hasPermission(ORG_PERMISSIONS.SETTINGS_UPDATE)
    || hasPermission(ORG_PERMISSIONS.ORGANIZATION_MANAGE);

  if (!canEdit) {
    return (
      <div className="p-4 md:p-8">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access restricted</AlertTitle>
          <AlertDescription>
            You don't have permission to view or edit organization settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8" data-page="OrganizationSettings">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Organization settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage the organization profile, timezone, visibility, and enabled modules.
        </p>
      </header>

      <SettingsForm />
      <EnabledModulesForm />
    </div>
  );
}

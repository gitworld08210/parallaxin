// QuickActions — links respect current org slug + PermissionGate.
import { NavLink } from "react-router-dom";
import { FileText, UserPlus, Settings as SettingsIcon, Building2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";
import { PermissionGate } from "@/components/organization/PermissionGate";
import { ORG_PERMISSIONS, type OrgPermissionKey } from "@/features/organization/permissions.registry";

const ACTIONS: {
  title: string;
  description: string;
  icon: typeof FileText;
  to: string;
  permission?: OrgPermissionKey;
}[] = [
  { title: "Invite Member", description: "Grow your organization", icon: UserPlus, to: "members", permission: ORG_PERMISSIONS.MEMBERS_INVITE },
  { title: "Departments", description: "Structure your teams", icon: Building2, to: "departments", permission: ORG_PERMISSIONS.DEPARTMENTS_MANAGE },
  { title: "Workspace Settings", description: "Configure this organization", icon: SettingsIcon, to: "settings", permission: ORG_PERMISSIONS.SETTINGS_UPDATE },
  { title: "Post Update", description: "Share with everyone", icon: FileText, to: "feed", permission: ORG_PERMISSIONS.FEED_POST },
];

export const QuickActions = () => {
  const { organization } = useOrganizationContext();
  const base = organization?.slug ? `/organization/${organization.slug}` : "/organization";

  return (
    <div>
      <h2 className="mb-5 text-xl font-bold">Quick Actions</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const card = (
            <Card
              key={action.title}
              className="cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <NavLink to={`${base}/${action.to}`} className="block">
                <CardContent className="flex items-start gap-4 p-6">
                  <div className="rounded-2xl bg-primary/10 p-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{action.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
                  </div>
                </CardContent>
              </NavLink>
            </Card>
          );
          return action.permission ? (
            <PermissionGate key={action.title} permission={action.permission}>
              {card}
            </PermissionGate>
          ) : (
            card
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;

// OrganizationOverview — organization details from OrganizationProvider.
import { Globe, Mail, MapPin, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";

export const OrganizationOverview = () => {
  const { organization } = useOrganizationContext();
  if (!organization) return null;

  const items = [
    organization.website && { icon: Globe, label: organization.website },
    organization.email && { icon: Mail, label: organization.email },
    organization.location && { icon: MapPin, label: organization.location },
    { icon: Users, label: `${organization.member_count} members` },
  ].filter(Boolean) as { icon: typeof Globe; label: string }[];

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div>
          <h2 className="text-xl font-bold">About</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {organization.bio ?? organization.description ?? "No description yet."}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-center gap-3 text-sm">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{item.label}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrganizationOverview;

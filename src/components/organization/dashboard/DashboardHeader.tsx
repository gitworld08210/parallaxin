// DashboardHeader — reads current organization from OrganizationProvider.
import { Building2, CheckCircle2, Plus, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";

export default function DashboardHeader() {
  const { organization, role } = useOrganizationContext();
  const slug = organization?.slug ?? "";
  const base = slug ? `/organization/${slug}` : "/organization";
  const fallback = organization?.name?.[0]?.toUpperCase() ?? "O";

  return (
    <div className="relative overflow-hidden rounded-3xl border bg-card">
      <div
        className="h-52 w-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500"
        style={
          organization?.cover_url
            ? { backgroundImage: `url(${organization.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      />
      <div className="px-8 pb-8">
        <div className="-mt-16 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-end gap-5">
            <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
              <AvatarImage src={organization?.logo_url ?? undefined} />
              <AvatarFallback className="text-4xl">{fallback}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{organization?.name ?? "Organization"}</h1>
                {organization?.verified && <CheckCircle2 className="h-6 w-6 text-sky-500" />}
                {role.isOwner && <Badge>Owner</Badge>}
              </div>
              {organization?.description && (
                <p className="mt-2 text-muted-foreground">{organization.description}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {organization?.industry && <Badge variant="secondary">{organization.industry}</Badge>}
                {organization?.org_type && <Badge variant="secondary">{organization.org_type}</Badge>}
                {organization?.location && <Badge variant="secondary">{organization.location}</Badge>}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button asChild>
              <NavLink to={`${base}/feed`}>
                <Plus className="mr-2 h-4 w-4" />
                Create
              </NavLink>
            </Button>
            <Button variant="outline" asChild>
              <NavLink to={`${base}/profile`}>
                <Building2 className="mr-2 h-4 w-4" />
                Workspace
              </NavLink>
            </Button>
            <Button variant="outline" size="icon" asChild>
              <NavLink to={`${base}/settings`}>
                <Settings className="h-5 w-5" />
              </NavLink>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

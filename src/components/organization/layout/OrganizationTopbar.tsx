// OrganizationTopbar — appears at the top of every /organization/:slug page.
// Everything renders from OrganizationProvider. Nothing here reaches Supabase
// directly — the provider owns organization/membership/role/permission state.
import { Bell, Search, Settings } from "lucide-react";
import { Link } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";
import { WorkspaceSwitcher } from "@/components/organization/WorkspaceSwitcher";
import { getOrganizationVerificationKind } from "@/services/organization/organization.service";


export const OrganizationTopbar = () => {
  const { organization, role } = useOrganizationContext();
  const slug = organization?.slug ?? "";
  const base = slug ? `/organization/${slug}` : "/organization";
  const initials = (organization?.name?.[0] ?? "O").toUpperCase();

  // Human-readable role label — owner outranks any assigned role name.
  const roleLabel = role.isOwner ? "Owner" : role.roleNames[0] ?? "Member";
  const verificationKind = getOrganizationVerificationKind(organization);


  return (
    <header
      data-component="OrganizationTopbar"
      className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur"
    >
      {/* Left: current organization identity */}
      <Link to={`${base}/dashboard`} className="flex min-w-0 items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={organization?.logo_url ?? undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="hidden min-w-0 sm:block">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold">
              {organization?.name ?? "Organization"}
            </span>
            {/* Verification badge kind is derived from Organization.org_type
                via organizationService.getVerificationKind — data-driven. */}
            {verificationKind && <VerificationBadge kind={verificationKind} />}

          </div>
          <p className="truncate text-[11px] text-muted-foreground">{roleLabel}</p>
        </div>
      </Link>

      <div className="ml-auto flex items-center gap-1">
        <WorkspaceSwitcher />

        <Badge variant="outline" className="hidden md:inline-flex">
          {roleLabel}
        </Badge>

        <Button asChild variant="ghost" size="icon" aria-label="Search">
          <Link to={`${base}/search`}>
            <Search className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="icon" aria-label="Notifications">
          <Link to={`${base}/notifications`}>
            <Bell className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="icon" aria-label="Settings">
          <Link to={`${base}/settings`}>
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </header>
  );
};

export default OrganizationTopbar;

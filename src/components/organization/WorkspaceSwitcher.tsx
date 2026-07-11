// WorkspaceSwitcher — popover listing every workspace the signed-in user
// belongs to. Switching updates URL + OrganizationProvider + React Query cache
// via `switchOrganization`. Client-side navigation only (no full reload).
import { Building2, Check, ChevronDown, Plus } from "lucide-react";
import { Link } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";

export const WorkspaceSwitcher = () => {
  const { organizationId, organization, workspaces, switchOrganization } =
    useOrganizationContext();

  const current =
    workspaces.find((w) => w.id === organizationId) ??
    (organization
      ? {
          id: organization.id,
          slug: organization.slug,
          name: organization.name,
          logo_url: organization.logo_url,
          is_owner: false,
          role_names: [] as string[],
        }
      : null);

  const initials = (current?.name?.[0] ?? "O").toUpperCase();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 gap-2 rounded-full px-2 hover:bg-muted"
          aria-label="Switch workspace"
        >
          <Avatar className="h-7 w-7">
            <AvatarImage src={current?.logo_url ?? undefined} />
            <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[160px] truncate text-sm font-semibold sm:inline">
            {current?.name ?? "Workspace"}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-1">
        <div className="max-h-80 overflow-y-auto">
          {workspaces.length === 0 && (
            <p className="p-3 text-center text-sm text-muted-foreground">
              No workspaces yet.
            </p>
          )}
          {workspaces.map((ws) => {
            const active = ws.id === organizationId;
            return (
              <button
                key={ws.id}
                type="button"
                onClick={() => {
                  if (active) return;
                  switchOrganization(ws.slug);
                }}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted",
                  active && "bg-muted",
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={ws.logo_url ?? undefined} />
                  <AvatarFallback className="text-[11px]">
                    {ws.name[0]?.toUpperCase() ?? "O"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{ws.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {ws.is_owner ? "Owner" : ws.role_names[0] ?? "Member"}
                  </p>
                </div>
                {active && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
        <div className="mt-1 border-t pt-1">
          <Button
            asChild
            variant="ghost"
            className="w-full justify-start gap-2 rounded-lg text-sm"
          >
            <Link to="/organization/create">
              <Plus className="h-4 w-4" />
              New organization
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default WorkspaceSwitcher;

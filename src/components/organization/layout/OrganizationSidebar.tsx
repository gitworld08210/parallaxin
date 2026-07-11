import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Shield,
  Building2,
  FolderKanban,
  CheckSquare,
  Calendar,
  BarChart3,
  Settings,
  Sparkles,
  Newspaper,
  Clapperboard,
  Image,
  Bell,
  ChevronDown,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";
import { useOrgFeatureFlags, type OrgFeatureKey } from "@/features/organization/featureFlags";

type NavItem = {
  name: string;
  path: string;
  icon: typeof LayoutDashboard;
  feature: OrgFeatureKey;
};

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { name: "Dashboard", path: "dashboard", icon: LayoutDashboard, feature: "dashboard" },
      { name: "Feed", path: "feed", icon: Newspaper, feature: "feed" },
      { name: "Reels", path: "reels", icon: Clapperboard, feature: "reels" },
      { name: "Stories", path: "stories", icon: Image, feature: "stories" },
      { name: "Announcements", path: "announcements", icon: Bell, feature: "announcements" },
    ],
  },
  {
    title: "Team",
    items: [
      { name: "Members", path: "members", icon: Users, feature: "members" },
      { name: "Departments", path: "departments", icon: Building2, feature: "departments" },
      { name: "Roles", path: "roles", icon: Shield, feature: "roles" },
    ],
  },
  {
    title: "Workspace",
    items: [
      { name: "Projects", path: "projects", icon: FolderKanban, feature: "projects" },
      { name: "Tasks", path: "tasks", icon: CheckSquare, feature: "tasks" },
      { name: "Calendar", path: "calendar", icon: Calendar, feature: "calendar" },
    ],
  },
  {
    title: "Insights",
    items: [
      { name: "Analytics", path: "analytics", icon: BarChart3, feature: "analytics" },
      { name: "AI Hub", path: "ai", icon: Sparkles, feature: "ai" },
      { name: "Settings", path: "settings", icon: Settings, feature: "settings" },
    ],
  },
];

export const OrganizationSidebar = () => {
  const { organization, role } = useOrganizationContext();
  const featureFlags = useOrgFeatureFlags();
  const slug = organization?.slug ?? "";
  const base = slug ? `/organization/${slug}` : "/organization";
  const fallback = organization?.name?.[0]?.toUpperCase() ?? "O";

  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => featureFlags[item.feature]),
  })).filter((s) => s.items.length > 0);

  return (
    <aside className="hidden md:flex h-full w-72 flex-col border-r bg-background">
      <div className="border-b px-6 py-5">
        <Button variant="ghost" className="h-auto w-full justify-start p-0">
          <Avatar className="h-12 w-12">
            <AvatarImage src={organization?.logo_url ?? undefined} />
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
          <div className="ml-3 flex-1 text-left">
            <h2 className="text-base font-bold">{organization?.name ?? "Organization"}</h2>
            <p className="text-xs text-muted-foreground">Organization Workspace</p>
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
        {role.isOwner && <Badge className="mt-4">Owner</Badge>}
      </div>

      <ScrollArea className="flex-1 px-4 py-5">
        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={`${base}/${item.path}`}
                      className={({ isActive }) =>
                        cn(
                          "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "hover:bg-muted hover:translate-x-1",
                        )
                      }
                    >
                      <Icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                      <span className="flex-1">{item.name}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Separator />

      <div className="p-4">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11">
              <AvatarImage src={organization?.logo_url ?? undefined} />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{organization?.name ?? "Organization"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {role.isOwner ? "Organization Owner" : role.roleNames[0] ?? "Member"}
              </p>
            </div>
          </div>
          <Button variant="secondary" className="mt-4 w-full" asChild>
            <NavLink to={`${base}/settings`}>Workspace Settings</NavLink>
          </Button>
        </div>
      </div>
    </aside>
  );
};

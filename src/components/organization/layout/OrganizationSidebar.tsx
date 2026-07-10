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

const navigation = [
  {
    title: "Overview",
    items: [
      {
        name: "Dashboard",
        href: "/organization/dashboard",
        icon: LayoutDashboard,
      },
      {
        name: "Feed",
        href: "/organization/feed",
        icon: Newspaper,
      },
      {
        name: "Reels",
        href: "/organization/reels",
        icon: Clapperboard,
      },
      {
        name: "Stories",
        href: "/organization/stories",
        icon: Image,
      },
      {
        name: "Announcements",
        href: "/organization/announcements",
        icon: Bell,
      },
    ],
  },

  {
    title: "Team",

    items: [
      {
        name: "Members",
        href: "/organization/members",
        icon: Users,
      },
      {
        name: "Departments",
        href: "/organization/departments",
        icon: Building2,
      },
      {
        name: "Roles",
        href: "/organization/roles",
        icon: Shield,
      },
    ],
  },

  {
    title: "Workspace",

    items: [
      {
        name: "Projects",
        href: "/organization/projects",
        icon: FolderKanban,
      },
      {
        name: "Tasks",
        href: "/organization/tasks",
        icon: CheckSquare,
      },
      {
        name: "Calendar",
        href: "/organization/calendar",
        icon: Calendar,
      },
    ],
  },

  {
    title: "Insights",

    items: [
      {
        name: "Analytics",
        href: "/organization/analytics",
        icon: BarChart3,
      },
      {
        name: "AI Hub",
        href: "/organization/ai",
        icon: Sparkles,
      },
      {
        name: "Settings",
        href: "/organization/settings",
        icon: Settings,
      },
    ],
  },
];

export const OrganizationSidebar = () => {
  return (
    <aside className="flex h-full w-72 flex-col border-r bg-background">
      <div className="border-b px-6 py-5">
        <Button variant="ghost" className="h-auto w-full justify-start p-0">
          <Avatar className="h-12 w-12">
            <AvatarImage src="/placeholder.svg" />

            <AvatarFallback>AX</AvatarFallback>
          </Avatar>

          <div className="ml-3 flex-1 text-left">
            <h2 className="text-base font-bold">Aurelix</h2>

            <p className="text-xs text-muted-foreground">Organization Workspace</p>
          </div>

          <ChevronDown className="h-4 w-4" />
        </Button>

        <Badge className="mt-4">Professional</Badge>
      </div>

      <ScrollArea className="flex-1 px-4 py-5">
        <div className="space-y-8">
          {navigation.map((section) => (
            <div key={section.title}>
              <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
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
              <AvatarImage src="/placeholder.svg" />

              <AvatarFallback>AD</AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">Admin User</p>

              <p className="truncate text-xs text-muted-foreground">Organization Owner</p>
            </div>
          </div>

          <Button variant="secondary" className="mt-4 w-full">
            Workspace Settings
          </Button>
        </div>
      </div>
    </aside>
  );
};

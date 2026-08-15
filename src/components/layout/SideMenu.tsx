import { Link } from "react-router-dom";
import {
  Bookmark, Settings, HelpCircle, LogOut, Users,
  Moon, Sun, Crown, ChevronRight,
  Building2, Film, LayoutGrid, User, Sparkles,
} from "lucide-react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthProvider";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { gradientFor, initialsOf, fmt } from "@/lib/format";
import { useState } from "react";
import { useIsCreator } from "@/hooks/useIsCreator";
import { BecomeCreatorSheet } from "@/components/creator/BecomeCreatorSheet";
import { useTheme } from "@/contexts/ThemeProvider";
import { AppearanceSheet } from "@/components/layout/AppearanceSheet";
import { useMyWorkspaces } from "@/hooks/organization/useMyWorkspaces";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import { AccountSwitcherSheet } from "@/components/layout/AccountSwitcherSheet";

import { cn } from "@/lib/utils";

type MenuItem = {
  to?: string;
  onClick?: () => void;
  icon: any;
  label: string;
  badge?: string;
  badgeColor?: string;
};

export const SideMenu = ({ trigger, unreadNotif, unreadDm }: { trigger?: React.ReactNode; unreadNotif?: number; unreadDm?: number }) => {
  const { profile, signOut } = useAuth();
  const { isCreator } = useIsCreator();
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";
  const [becomeOpen, setBecomeOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const { workspaces } = useMyWorkspaces();
  const ownedWorkspace = workspaces?.find((w: any) => w.owner_user_id === profile?.id);
  const adminOrgSlug = ownedWorkspace?.slug;

  const displayName = profile?.display_name || profile?.username || "You";

  const primaryItems: MenuItem[] = [
    { to: "/profile", icon: User, label: "Profile" },
    { to: "/premium", icon: Crown, label: "Premium", badge: "50% off", badgeColor: "bg-amber-500" },
    { to: "/discover", icon: Users, label: "Communities" },
    { to: "/profile?tab=saved", icon: Bookmark, label: "Bookmarks" },
    { to: "/reels", icon: Film, label: "Spaces" },
    ...(isCreator
      ? [{ to: "/creator/studio", icon: LayoutGrid, label: "Creator Studio" } as MenuItem]
      : [{ onClick: () => setBecomeOpen(true), icon: Sparkles, label: "Creator Studio" } as MenuItem]),
  ];

  const secondaryItems: MenuItem[] = [
    { to: "/settings", icon: Settings, label: "Settings and privacy" },
    { to: "/support", icon: HelpCircle, label: "Help Center" },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="left"
        className="bg-black border-r border-white/10 p-0 w-[80%] sm:w-[320px] overflow-y-auto flex flex-col"
      >
        {/* Header: Avatar + Settings gear */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <Link to="/profile" className="block">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <AuraAvatar gradient={gradientFor(profile?.username)} size="md" initials={initialsOf(displayName)} />
              )}
            </Link>
            <Link
              to="/settings"
              className="h-8 w-8 rounded-full border border-white/15 grid place-items-center hover:bg-white/5 transition-colors"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4 text-white" />
            </Link>
          </div>

          {/* Name + username */}
          <div className="mt-3">
            <div className="flex items-center gap-1.5">
              <p className="text-[17px] font-bold text-white truncate">{displayName}</p>
              {profile?.verified && profile?.verification_kind && (
                <VerificationBadge kind={profile.verification_kind} className="h-4 w-4" />
              )}
            </div>
            <p className="text-[14px] text-zinc-500 mt-0.5">
              @{profile?.username || "user"}
            </p>
          </div>

          {/* Following / Followers */}
          <div className="flex items-center gap-4 mt-3 text-[14px]">
            <Link to={`/u/${profile?.username}/following`} className="hover:underline">
              <span className="font-bold text-white">{fmt(profile?.following_count ?? 0)}</span>{" "}
              <span className="text-zinc-500">Following</span>
            </Link>
            <Link to={`/u/${profile?.username}/followers`} className="hover:underline">
              <span className="font-bold text-white">{fmt(profile?.followers_count ?? 0)}</span>{" "}
              <span className="text-zinc-500">Followers</span>
            </Link>
          </div>
        </div>

        {/* Primary menu items */}
        <nav className="px-2 pt-2 border-t border-white/5">
          {primaryItems.map((item) => {
            const content = (
              <div className="flex items-center gap-5">
                <item.icon className="h-6 w-6 text-white" strokeWidth={1.8} />
                <span className="text-[17px] font-semibold text-white">{item.label}</span>
                {item.badge && (
                  <span className={cn(
                    "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white ml-1",
                    item.badgeColor || "bg-blue-500"
                  )}>
                    {item.badge}
                  </span>
                )}
              </div>
            );
            const cls = "w-full flex items-center px-4 py-3.5 rounded-xl hover:bg-white/5 transition-colors";
            if (item.onClick) {
              return (
                <button key={item.label} onClick={item.onClick} className={cls}>
                  {content}
                </button>
              );
            }
            return (
              <Link key={item.label} to={item.to!} className={cls}>
                {content}
              </Link>
            );
          })}
        </nav>

        {/* Separator */}
        <div className="h-px bg-white/10 mx-5 my-2" />

        {/* Secondary items */}
        <nav className="px-2">
          {secondaryItems.map((item) => (
            <Link key={item.label} to={item.to!} className="w-full flex items-center gap-5 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors">
              <item.icon className="h-5 w-5 text-zinc-400" strokeWidth={1.8} />
              <span className="text-[15px] text-zinc-300">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom section: Dark mode toggle + Log out */}
        <div className="px-5 py-5 border-t border-white/5">
          <div className="flex items-center justify-between">
            {/* Dark mode toggle */}
            <button
              onClick={() => setTheme(dark ? "light" : "dark")}
              className="h-10 w-10 rounded-full border border-white/15 grid place-items-center hover:bg-white/5 transition-colors"
              aria-label="Toggle dark mode"
            >
              {dark ? <Moon className="h-5 w-5 text-white" /> : <Sun className="h-5 w-5 text-white" />}
            </button>

            {/* Log out */}
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-white/5 transition-colors text-sm text-zinc-400"
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </div>

        <BecomeCreatorSheet open={becomeOpen} onOpenChange={setBecomeOpen} />
        <AppearanceSheet open={appearanceOpen} onOpenChange={setAppearanceOpen} />
        <AccountSwitcherSheet open={switcherOpen} onOpenChange={setSwitcherOpen} />
      </SheetContent>
    </Sheet>
  );
};

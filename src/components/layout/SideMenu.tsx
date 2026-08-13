import { Link } from "react-router-dom";
import {
  Bookmark, BarChart3, Settings, HelpCircle, BadgeCheck, LogOut, Users,
  Film, Bell, DollarSign, Crown, Moon, Sun, Sparkles, ChevronDown, ChevronRight,
  Building2, Clock, Archive, QrCode, Heart, ShieldCheck, Wallet, Activity,
  Palette, PlusSquare, LayoutGrid, MessageCircle, Shield, Megaphone, Globe2,
} from "lucide-react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthProvider";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { gradientFor, initialsOf } from "@/lib/format";
import { useState } from "react";
import { useIsCreator } from "@/hooks/useIsCreator";
import { BecomeCreatorSheet } from "@/components/creator/BecomeCreatorSheet";
import { useTheme } from "@/contexts/ThemeProvider";
import { AppearanceSheet } from "@/components/layout/AppearanceSheet";
import { useMyWorkspaces } from "@/hooks/organization/useMyWorkspaces";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import { AccountSwitcherSheet } from "@/components/layout/AccountSwitcherSheet";
// useEmployee removed for Supabase migration fallback



import { cn } from "@/lib/utils";

type Row = {
  to?: string;
  onClick?: () => void;
  icon: any;
  label: string;
  trailing?: React.ReactNode;
  badge?: string;
};

export const SideMenu = ({ trigger, unreadNotif, unreadDm }: { trigger?: React.ReactNode; unreadNotif?: number; unreadDm?: number }) => {
  const { profile, signOut } = useAuth();
  const { isCreator } = useIsCreator();
  const { theme } = useTheme();
  const dark = theme === "dark";
  const [becomeOpen, setBecomeOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);


  const { workspaces } = useMyWorkspaces();
  const ownedWorkspace = workspaces?.find((w: any) => w.owner_user_id === profile?.id);
  const adminOrgSlug = ownedWorkspace?.slug;



  const displayName = profile?.display_name || profile?.username || "You";

  const primary: Row[] = [
    { to: "/messages", icon: MessageCircle, label: "Messages" },
    { to: "/profile?tab=saved", icon: Clock, label: "Your activity" },
    { to: "/profile?tab=saved", icon: Archive, label: "Archive" },
    { to: "/notifications", icon: Bell, label: "Notifications" },
    { to: "/settings", icon: Settings, label: "Settings and privacy" },
    { to: "/analytics", icon: BarChart3, label: "Insights" },
    { to: "/profile?tab=saved", icon: Bookmark, label: "Saved" },
    { to: "/close-friends", icon: Heart, label: "Close friends" },
    { to: "/support", icon: HelpCircle, label: "Help & support" },
  ];

  const money: Row[] = [
    { to: "/wallet", icon: Wallet, label: "Aura Wallet", trailing: <span className="text-xs font-bold text-primary">0</span> },
    ...(isCreator
      ? [
          { to: "/creator/studio", icon: LayoutGrid, label: "Creator Studio", badge: "NEW" } as Row,
          { to: "/monetization", icon: DollarSign, label: "Monetization" } as Row,
        ]
      : []),
    { to: "/ads", icon: Megaphone, label: "Aurelix Ads", badge: "ADS" },
    { to: "/premium", icon: Crown, label: "Aurelix Premium", badge: "PRO" },
  ];

  const canAdminOS = profile?.account_type === "organization" || 
                     profile?.is_admin || 
                     profile?.is_founder || 
                     ["COO", "CEO", "HR Head", "Finance Head"].includes(profile?.role || "");


  const community: Row[] = [
    { to: "/verification-center", icon: BadgeCheck, label: "Verification center", badge: "NEW" },
    { to: "/virtual-world", icon: Globe2, label: "Virtual World", badge: "NEW" },
    { to: "/discover", icon: Users, label: "Communities" },
    { to: "/reels", icon: Film, label: "Reels" },
    ...(adminOrgSlug
      ? [{
          to: `/organization/${adminOrgSlug}/dashboard`,
          icon: Building2,
          label: "Organization admin",
          badge: "ADMIN",
        } as Row]
      : []),
    ...(canAdminOS
      ? [{
          to: "/admin-os",
          icon: Shield,
          label: "Aurelix Admin OS",
          badge: "STAFF",
        } as Row]
      : []),
  ];


  const utility: Row[] = [
    { onClick: () => setAppearanceOpen(true), icon: dark ? Moon : Sun, label: "Appearance", trailing: (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {dark ? "Dark" : "Liquid Glass"} <ChevronRight className="h-3.5 w-3.5" />
      </span>
    ) },
    { to: "/profile", icon: QrCode, label: "QR code" },
    { to: "/settings", icon: ShieldCheck, label: "Privacy checkup" },
    { to: "/settings", icon: HelpCircle, label: "Help" },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="right"
        className="bg-background border-l border-border p-0 w-[92%] sm:w-[420px] overflow-y-auto flex flex-col"
      >
        {/* Account header */}
        <div className="px-4 pt-6 pb-4 border-b border-border">
          <button onClick={() => setSwitcherOpen(true)} className="w-full flex items-center gap-3 text-left">
            <span className="text-xl font-extrabold tracking-tight truncate flex items-center gap-1.5">
              {profile?.username ? `@${profile.username}` : displayName}
              {profile?.verified && profile?.verification_kind && (
                <VerificationBadge kind={profile.verification_kind} className="h-4 w-4" />
              )}
            </span>
            <ChevronDown className="h-5 w-5 text-foreground" strokeWidth={2.5} />
          </button>

          <Link
            to="/profile"
            className="mt-4 flex items-center gap-3 rounded-2xl p-2 -mx-2 hover:bg-secondary/50 transition-colors"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover ring-1 ring-border" />
            ) : (
              <AuraAvatar gradient={gradientFor(profile?.username)} size="md" initials={initialsOf(displayName)} />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-3">
                <span><span className="font-bold text-foreground">{profile?.followers_count ?? 0}</span> followers</span>
                <span><span className="font-bold text-foreground">{profile?.following_count ?? 0}</span> following</span>
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <button
            onClick={() => setSwitcherOpen(true)}
            className="mt-2 w-full flex items-center gap-3 rounded-2xl p-2 -mx-2 hover:bg-secondary/50 transition-colors"
            aria-label="Add or switch accounts"
          >
            <span className="h-14 w-14 rounded-full border-2 border-dashed border-border grid place-items-center">
              <PlusSquare className="h-5 w-5 text-muted-foreground" />
            </span>
            <span className="text-sm font-semibold">Add account</span>
          </button>
        </div>


        {/* Become creator upsell */}
        {!isCreator && (
          <div className="px-4 pt-4">
            <button
              onClick={() => setBecomeOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/8 to-transparent border border-primary/25 hover:border-primary/40 transition-colors"
            >
              <span className="h-10 w-10 rounded-xl bg-primary/20 grid place-items-center shrink-0">
                <Sparkles className="h-5 w-5 text-primary" strokeWidth={2.2} />
              </span>
              <span className="flex-1 text-left min-w-0">
                <span className="block text-sm font-bold">Become a Creator</span>
                <span className="block text-[11px] text-muted-foreground truncate">Publish, earn & unlock analytics</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground shrink-0">
                85/15
              </span>
            </button>
          </div>
        )}

        {/* Sections */}
        <MenuSection rows={primary} />
        <Divider />
        <MenuSection label="Wallet" rows={money} />
        <Divider />
        <MenuSection label="Community" rows={community} />
        <Divider />
        <MenuSection label="More" rows={utility} />

        {/* Meta-style app switcher chip */}
        <div className="px-4 pt-3 flex flex-col gap-2">
          {canAdminOS && (
            <Link
              to="/admin-os"
              className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors px-3 py-3"
            >
              <span className="h-9 w-9 rounded-xl bg-primary grid place-items-center shrink-0 text-white font-black text-[10px]">
                OS
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-primary">Aurelix Admin OS</p>
                <p className="text-[11px] text-primary/60 truncate">Manage staff, verification & finance</p>
              </div>
              <ChevronRight className="h-4 w-4 text-primary/40" />
            </Link>
          )}

          <Link
            to="/premium"
            className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/40 hover:bg-secondary/70 transition-colors px-3 py-3"
          >
            <span className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shrink-0">
              <Crown className="h-4.5 w-4.5 text-primary-foreground" strokeWidth={2.4} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">Aurelix Premium</p>
              <p className="text-[11px] text-muted-foreground truncate">Ad-free, boosted reach, exclusive tools</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>

        {/* Log out */}
        <div className="px-4 py-5 mt-auto">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-destructive/10 text-destructive font-semibold text-sm transition-colors"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Aurelix · v1.0
          </p>
        </div>

        <BecomeCreatorSheet open={becomeOpen} onOpenChange={setBecomeOpen} />
        <AppearanceSheet open={appearanceOpen} onOpenChange={setAppearanceOpen} />
        <AccountSwitcherSheet open={switcherOpen} onOpenChange={setSwitcherOpen} />

      </SheetContent>
    </Sheet>
  );
};

const Divider = () => <div className="h-px bg-border/70 my-1 mx-4" />;

const MenuSection = ({ rows, label }: { rows: Row[]; label?: string }) => (
  <nav className="px-2 pt-2">
    {label && (
      <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    )}
    {rows.map((r) => {
      const content = (
        <>
          <r.icon className="h-6 w-6 text-foreground shrink-0" strokeWidth={1.75} />
          <span className="flex-1 text-[15px] font-medium text-left truncate">{r.label}</span>
          {r.badge && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground">
              {r.badge}
            </span>
          )}
          {r.trailing}
        </>
      );
      const className = cn(
        "w-full flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-secondary/60 transition-colors");
      if (r.onClick) {
        return (
          <button key={r.label} onClick={r.onClick} className={className}>
            {content}
          </button>
        );
      }
      return (
        <Link key={r.label} to={r.to!} className={className}>
          {content}
        </Link>
      );
    })}
  </nav>
);

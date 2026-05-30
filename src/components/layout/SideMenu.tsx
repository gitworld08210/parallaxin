import { Link } from "react-router-dom";
import {
  User as UserIcon, LayoutGrid, Wallet, Bookmark, BarChart3, Settings, HelpCircle, BadgeCheck, LogOut, X, Users,
  Home, Compass, Film, MessageCircle, Bell, DollarSign, Gem, Crown, Moon,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthProvider";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { gradientFor, initialsOf } from "@/lib/format";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

export const SideMenu = ({ trigger }: { trigger: React.ReactNode }) => {
  const { profile, signOut } = useAuth();
  const [dark, setDark] = useState(true);

  type Row = {
    to?: string;
    icon: any;
    label: string;
    trailing?: React.ReactNode;
    badge?: string;
  };

  const rows: Row[] = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/discover", icon: Compass, label: "Explore" },
    { to: "/reels", icon: Film, label: "Reels" },
    { to: "/messages", icon: MessageCircle, label: "Messages", trailing: <Pill>0</Pill> },
    { to: "/notifications", icon: Bell, label: "Notifications", trailing: <Pill>0</Pill> },
    { to: "/profile?tab=saved", icon: Bookmark, label: "Bookmarks" },
    { to: "/discover", icon: Users, label: "Communities" },
    { to: "/creator-hub", icon: LayoutGrid, label: "Creator Hub" },
    { to: "/monetization", icon: DollarSign, label: "Monetization" },
    { to: "/verification-center", icon: BadgeCheck, label: "Verification Center", badge: "NEW" },
    { to: "/wallet", icon: Wallet, label: "Aura Wallet", trailing: <span className="text-xs font-bold text-primary">0</span> },
    { to: "/profile?tab=saved", icon: Bookmark, label: "Saved" },
    { to: "/settings", icon: Settings, label: "Settings" },
    { to: "/settings", icon: HelpCircle, label: "Help & Support" },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="bg-background border-l border-border p-0 w-[88%] sm:w-[420px] overflow-y-auto">
        {/* Header */}
        <div className="px-5 pt-6 pb-5 flex items-center gap-3 border-b border-border">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/50" />
          ) : (
            <AuraAvatar gradient={gradientFor(profile?.username)} size="md" initials={initialsOf(profile?.display_name || profile?.username)} />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold tracking-tight text-primary">AURELIX</p>
            <p className="text-xs text-muted-foreground truncate">@{profile?.username || "—"}</p>
          </div>
          <button className="p-1.5" aria-label="Close">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Rows */}
        <nav className="px-2 py-3">
          {rows.map((r) => (
            <Link key={r.label} to={r.to!} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-muted/40 transition-colors">
              <r.icon className="h-5 w-5 text-foreground" strokeWidth={1.75} />
              <span className="flex-1 text-sm font-medium text-left">{r.label}</span>
              {r.badge && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                  {r.badge}
                </span>
              )}
              {r.trailing}
            </Link>
          ))}

          {/* Dark mode */}
          <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl">
            <Moon className="h-5 w-5" strokeWidth={1.75} />
            <span className="flex-1 text-sm font-medium">Dark Mode</span>
            <Switch checked={dark} onCheckedChange={setDark} />
          </div>

          {/* Premium CTA */}
          <Link to="/premium" className="mt-3 mx-1 flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30">
            <div className="h-9 w-9 rounded-xl bg-primary/20 grid place-items-center">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">AURELIX PREMIUM</p>
              <p className="text-[11px] text-muted-foreground">Unlock exclusive features</p>
            </div>
          </Link>

          {/* Log out */}
          <button
            onClick={() => signOut()}
            className="w-full mt-4 flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-primary font-semibold hover:bg-primary/10 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Log Out
          </button>
        </nav>
      </SheetContent>
    </Sheet>
  );
};

const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[10px] font-bold min-w-[18px] h-[18px] px-1.5 rounded-full bg-muted text-muted-foreground grid place-items-center">
    {children}
  </span>
);

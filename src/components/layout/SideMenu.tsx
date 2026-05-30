import { Link } from "react-router-dom";
import {
  User as UserIcon, LayoutGrid, Wallet, Bookmark, BarChart3, Settings, HelpCircle, BadgeCheck, LogOut, X,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthProvider";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { gradientFor, initialsOf } from "@/lib/format";

export const SideMenu = ({ trigger }: { trigger: React.ReactNode }) => {
  const { profile, signOut } = useAuth();

  const rows: { to?: string; icon: any; label: string; trailing?: React.ReactNode; onClick?: () => void; danger?: boolean }[] = [
    { to: "/profile", icon: UserIcon, label: "My Profile" },
    { to: "/discover", icon: LayoutGrid, label: "Creator Hub" },
    { to: "/wallet", icon: Wallet, label: "Aura Wallet", trailing: <span className="text-xs font-bold text-primary">12,450</span> },
    { to: "/profile?tab=saved", icon: Bookmark, label: "Saved" },
    { to: "/profile/insights", icon: BarChart3, label: "Analytics" },
    { to: "/verification", icon: BadgeCheck, label: "Request verification" },
    { to: "/settings", icon: Settings, label: "Settings" },
    { to: "/settings", icon: HelpCircle, label: "Help & Support" },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="bg-background border-l border-border p-0 w-[88%] sm:w-[420px]">
        {/* Header */}
        <div className="px-5 pt-6 pb-5 flex items-center gap-3 border-b border-border">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <AuraAvatar gradient={gradientFor(profile?.username)} size="md" initials={initialsOf(profile?.display_name || profile?.username)} />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{profile?.display_name || profile?.username || "You"}</p>
            <p className="text-xs text-muted-foreground truncate">@{profile?.username || "—"}</p>
          </div>
          <button className="p-1.5" aria-label="Close">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Rows */}
        <nav className="px-2 py-3">
          {rows.map((r) => {
            const inner = (
              <>
                <r.icon className="h-5 w-5 text-foreground" strokeWidth={1.75} />
                <span className="flex-1 text-sm font-medium">{r.label}</span>
                {r.trailing}
              </>
            );
            const cls = "w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-muted/40 transition-colors";
            return r.to ? (
              <Link key={r.label} to={r.to} className={cls}>{inner}</Link>
            ) : (
              <button key={r.label} onClick={r.onClick} className={cls}>{inner}</button>
            );
          })}

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

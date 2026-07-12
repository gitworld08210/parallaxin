import { Link, Outlet, useLocation } from "react-router-dom";
import {
  Sparkles, MessageSquare, Lightbulb, TrendingUp, AlertTriangle,
  FileText, Search, BookMarked,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/admin-os/executive/ai", label: "Chat", icon: MessageSquare, end: true },
  { to: "/admin-os/executive/ai/recommendations", label: "Recommendations", icon: Lightbulb },
  { to: "/admin-os/executive/ai/predictions", label: "Predictions", icon: TrendingUp },
  { to: "/admin-os/executive/ai/risks", label: "Risks", icon: AlertTriangle },
  { to: "/admin-os/executive/ai/summaries", label: "Summaries", icon: FileText },
  { to: "/admin-os/executive/ai/knowledge", label: "Knowledge Search", icon: Search },
  { to: "/admin-os/executive/ai/prompts", label: "Saved Prompts", icon: BookMarked },
];

const AiShell = () => {
  const loc = useLocation();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            EXECUTIVE · INTELLIGENCE HUB
          </p>
          <h1 className="text-2xl font-bold">Aurelix Executive AI</h1>
          <p className="text-xs text-muted-foreground">Advisory copilot for Founder Office. AI recommends — Founder Office decides.</p>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-1 border-b border-border/60 pb-1">
        {tabs.map((t) => {
          const active = t.end ? loc.pathname === t.to : loc.pathname.startsWith(t.to);
          return (
            <Link key={t.to} to={t.to}
              className={cn(
                "flex items-center gap-2 rounded-t-md px-3 py-2 text-sm font-medium whitespace-nowrap",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}>
              <t.icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </div>

      <Outlet />
    </div>
  );
};

export default AiShell;

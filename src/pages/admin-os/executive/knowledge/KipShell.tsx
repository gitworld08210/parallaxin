import { NavLink, Outlet } from "react-router-dom";
import { BookOpen, Files, MessageSquare, Layers, Bookmark, History, Search, Sparkles } from "lucide-react";

const nav = [
  { to: "/admin-os/executive/knowledge", label: "Home", icon: Sparkles, end: true },
  { to: "/admin-os/executive/knowledge/chat", label: "AI Chat", icon: MessageSquare },
  { to: "/admin-os/executive/knowledge/library", label: "Document Library", icon: Files },
  { to: "/admin-os/executive/knowledge/collections", label: "Collections", icon: Layers },
  { to: "/admin-os/executive/knowledge/search", label: "Search", icon: Search },
  { to: "/admin-os/executive/knowledge/bookmarks", label: "Bookmarks", icon: Bookmark },
  { to: "/admin-os/executive/knowledge/history", label: "Conversations", icon: History },
];

export default function KipShell() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold leading-tight">Knowledge Intelligence Platform</h1>
          <p className="text-xs text-muted-foreground">Enterprise AI knowledge workspace · Founder Office</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border/60 pb-1">
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`
            }
          >
            <n.icon className="h-4 w-4" />
            {n.label}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  );
}

import { TopBar } from "@/components/vibe/TopBar";
import { useAuth } from "@/contexts/AuthProvider";
import { 
  Shield, 
  Users, 
  BarChart3, 
  Lock, 
  Zap,
  Briefcase,
  UserCheck,
  ShieldCheck
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const AdminOSDashboard = () => {
  const { profile } = useAuth();

  const isAdmin = profile?.account_type === "organization" || profile?.is_admin || profile?.is_founder;

  if (!isAdmin) {
    return (
      <div className="flex flex-col h-full bg-black">
        <TopBar title="Access Denied" />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
          <Lock className="h-12 w-12 text-destructive/50" />
          <h2 className="text-xl font-bold">Admin OS restricted</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            This module is reserved for Aurelix Staff and Organizations.
          </p>
          <Link to="/" className="px-6 py-2 rounded-full bg-white text-black font-bold text-sm">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const sections = [
    {
      title: "Core Operations",
      items: [
        { label: "Verification Queue", icon: UserCheck, color: "text-blue-400", bg: "bg-blue-400/10", path: "/admin-os/verification" },
        { label: "Approvals Inbox", icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-400/10", path: "/admin-os/approvals" },
        { label: "Recruitment Center", icon: Briefcase, color: "text-orange-400", bg: "bg-orange-400/10", path: "/admin-os/recruitment" },
      ]
    },
    {
      title: "Platform & Security",
      items: [
        { label: "Identity Control", icon: Shield, color: "text-emerald-400", bg: "bg-emerald-400/10", path: "/admin-os/identity" },
        { label: "Privacy Policies", icon: Lock, color: "text-zinc-400", bg: "bg-zinc-400/10", path: "/admin-os/privacy" },
        { label: "System Analytics", icon: BarChart3, color: "text-rose-400", bg: "bg-rose-400/10", path: "/admin-os/analytics" },
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full bg-black">
      <TopBar title="Admin OS" subtitle="Platform Control Center" />
      
      <div className="flex-1 overflow-y-auto p-5 pb-24 space-y-8">
        <div className="p-6 rounded-3xl border border-white/[0.08] bg-gradient-to-br from-zinc-900 to-black space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/20 grid place-items-center">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Welcome, {profile?.display_name || 'Admin'}</h2>
              <p className="text-xs text-muted-foreground">Operational status: <span className="text-emerald-400 font-bold uppercase tracking-widest ml-1">Optimal</span></p>
            </div>
          </div>
        </div>

        {sections.map((section, idx) => (
          <div key={idx} className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 px-1">{section.title}</h3>
            <div className="grid grid-cols-2 gap-3">
              {section.items.map((item, i) => (
                <Link 
                  key={i} 
                  to={item.path}
                  className="p-4 rounded-2xl border border-white/[0.05] bg-[#0A0A0A] hover:bg-[#111] hover:border-white/10 transition-all group"
                >
                  <div className={cn("h-10 w-10 rounded-xl grid place-items-center mb-3 transition-transform group-active:scale-95", item.bg)}>
                    <item.icon className={cn("h-5 w-5", item.color)} />
                  </div>
                  <p className="text-sm font-bold tracking-tight">{item.label}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const UserPlus = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="16" y1="11" x2="22" y2="11" />
  </svg>
);

export default AdminOSDashboard;

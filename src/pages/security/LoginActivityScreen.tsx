import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, LogOut } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";

import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Event = { id: string; ip: string | null; user_agent: string | null; city: string | null; created_at: string };

const deviceOf = (ua: string | null) => {
  if (!ua) return "Unknown device";
  if (/iPhone|iPad/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "macOS";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "Web";
};

export default function LoginActivityScreen() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => { (async () => {
    if (!user) return;
    const { data } = await supabase.from("login_events" as any).select("id, ip, user_agent, city, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
    setEvents((data || []) as Event[]);
  })(); }, [user]);

  const signOutAll = async () => {
    if (!confirm("Sign out of all devices?")) return;
    const { error } = await supabase.auth.signOut({ scope: "global" } as any);
    if (error) toast.error(error.message);
    else toast.success("Signed out everywhere");
  };

  return (
    <div>
      <TopBar title="Login activity" subtitle="A constellation of your sessions"
        right={<button onClick={() => nav(-1)} className="glass h-11 w-11 rounded-full grid place-items-center"><ChevronLeft className="h-5 w-5" /></button>} />

      <div className="px-5 pb-24 max-w-xl mx-auto space-y-3">
        {events.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">No recorded sessions yet.</p>
        ) : events.map((e, i) => (
          <div key={e.id} className="relative rounded-2xl border border-border/40 bg-card/30 p-4 flex items-start gap-3">
            <div className={`h-2.5 w-2.5 mt-1.5 rounded-full ${i === 0 ? "bg-aurum shadow-[0_0_12px_hsl(43_57%_54%/0.6)]" : "bg-muted-foreground/40"}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium">{deviceOf(e.user_agent)}{i === 0 && <span className="ml-2 text-[10px] uppercase tracking-wider text-aurum">current</span>}</p>
                <p className="text-[11px] text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
              </div>
              <p className="text-xs text-muted-foreground truncate">{e.city || "Unknown location"} · {e.ip || "—"}</p>
            </div>
          </div>
        ))}

        <button onClick={signOutAll}
          className="mt-6 w-full rounded-2xl border border-[hsl(15_55%_40%_/_0.4)] text-[hsl(15_55%_60%)] py-3.5 font-medium flex items-center justify-center gap-2">
          <LogOut className="h-4 w-4" /> Sign out of all devices
        </button>
      </div>
    </div>
  );
}

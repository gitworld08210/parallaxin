import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";

import { useAuth } from "@/contexts/AuthProvider";
import { gradientFor, initialsOf } from "@/lib/format";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function BlockedListScreen() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data: bs } = await supabase.from("blocks" as any).select("blocked_id").eq("blocker_id", user.uid);
    const ids = (bs || []).map((b: any) => b.blocked_id);
    if (!ids.length) return setRows([]);
    const { data: profs } = await supabase.from("profiles").select("*").in("user_id", ids);
    setRows(profs || []);
  };

  useEffect(() => { load(); }, [user]);

  const unblock = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("blocks" as any).delete().eq("blocker_id", user.uid).eq("blocked_id", id);
    if (error) return toast.error(error.message);
    toast.success("Unblocked");
    setRows((r) => r.filter((x) => x.user_id !== id));
  };

  return (
    <div>
      <TopBar title="Blocked accounts"
        right={<button onClick={() => nav(-1)} className="glass h-11 w-11 rounded-full grid place-items-center"><ChevronLeft className="h-5 w-5" /></button>} />
      <div className="px-5 pb-24 max-w-xl mx-auto space-y-2">
        {rows.length === 0 ? <p className="text-center text-sm text-muted-foreground py-12">You haven't blocked anyone.</p> :
          rows.map((p) => (
            <div key={p.user_id} className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/30 px-3 py-2.5">
              {p.avatar_url
                ? <img src={p.avatar_url} className="h-10 w-10 rounded-full object-cover" alt="" />
                : <AuraAvatar gradient={gradientFor(p.username)} initials={initialsOf(p.display_name || p.username)} />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.display_name || p.username}</p>
                <p className="text-xs text-muted-foreground truncate">@{p.username}</p>
              </div>
              <button onClick={() => unblock(p.user_id)} className="text-xs px-3 py-1.5 rounded-full border border-border/60 hover:border-aurum/50">Unblock</button>
            </div>
          ))}
      </div>
    </div>
  );
}

import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, X, Users, Check } from "lucide-react";

import { useAuth } from "@/contexts/AuthProvider";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { gradientFor, initialsOf } from "@/lib/format";
import { toast } from "sonner";

type P = { user_id: string; username: string; display_name: string; avatar_url: string | null };

export const NewGroupSheet = ({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<P[]>([]);
  const [selected, setSelected] = useState<Record<string, P>>({});
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      let query = supabase.from("profiles").select("user_id, username, display_name, avatar_url").neq("user_id", user.id).limit(40);
      const term = q.trim();
      if (term) query = query.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`);
      else {
        const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
        const ids = (follows ?? []).map((f) => f.following_id);
        if (ids.length) query = query.in("user_id", ids);
      }
      const { data } = await query;
      setPeople((data ?? []) as P[]);
    })();
  }, [open, q, user?.id]);

  const toggle = (p: P) => setSelected((s) => {
    const next = { ...s };
    if (next[p.user_id]) delete next[p.user_id];
    else next[p.user_id] = p;
    return next;
  });

  const selectedArr = useMemo(() => Object.values(selected), [selected]);

  const createGroup = async () => {
    if (selectedArr.length === 0) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.rpc("create_group_conversation", {
        _title: title.trim() || `Group with ${selectedArr.map((p) => p.username).slice(0, 3).join(", ")}`,
        _member_ids: selectedArr.map((p) => p.user_id),
      });
      if (error) throw error;
      onOpenChange(false);
      setSelected({}); setTitle(""); setQ("");
      nav(`/messages/${data}`);
    } catch (e: any) { 
      toast.error(e.message || "Action failed"); 
    } finally { 
      setCreating(false); 
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="border-t h-[88vh] rounded-t-3xl p-0 flex flex-col"
        style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.08)", color: "white" }}
      >
        <SheetHeader className="px-5 py-4 flex flex-row items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <SheetTitle className="text-base font-semibold text-white text-left flex items-center gap-2">
            <Users className="h-4 w-4" /> New group
          </SheetTitle>
          <button
            disabled={selectedArr.length === 0 || creating}
            onClick={createGroup}
            className="text-sm font-semibold px-4 py-1.5 rounded-full disabled:opacity-40"
            style={{ background: "#E50914", color: "white" }}
          >
            {creating ? "…" : `Create${selectedArr.length ? ` (${selectedArr.length})` : ""}`}
          </button>
        </SheetHeader>

        <div className="p-4 space-y-3">
          <input
            value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Group name (optional)"
            maxLength={60}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-white placeholder:text-white/40"
            style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}
          />
          <div className="flex items-center gap-2 rounded-full px-4 py-2.5" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Search className="h-4 w-4 text-white/50" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search people"
              className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/40"
            />
          </div>
          {selectedArr.length > 0 && (
            <div className="flex gap-2 overflow-x-auto -mx-1 px-1">
              {selectedArr.map((p) => (
                <button key={p.user_id} onClick={() => toggle(p)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs text-white"
                  style={{ background: "rgba(229,9,20,0.18)", border: "1px solid #E50914" }}>
                  @{p.username} <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {people.map((p) => {
            const isSel = !!selected[p.user_id];
            return (
              <button
                key={p.user_id}
                onClick={() => toggle(p)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03]"
              >
                {p.avatar_url ? (
                  <img src={p.avatar_url} className="h-11 w-11 rounded-full object-cover" alt="" />
                ) : (
                  <AuraAvatar gradient={gradientFor(p.username)} size="md" initials={initialsOf(p.display_name || p.username)} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-white truncate">{p.display_name || p.username}</p>
                  <p className="text-xs truncate text-white/50">@{p.username}</p>
                </div>
                <span
                  className="h-6 w-6 rounded-full grid place-items-center"
                  style={{
                    background: isSel ? "#E50914" : "transparent",
                    border: isSel ? "none" : "2px solid rgba(255,255,255,0.25)",
                  }}
                >
                  {isSel && <Check className="h-4 w-4 text-white" />}
                </span>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};

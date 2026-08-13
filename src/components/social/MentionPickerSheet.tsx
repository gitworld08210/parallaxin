import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, AtSign } from "lucide-react";

import { useAuth } from "@/contexts/AuthProvider";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { gradientFor, initialsOf } from "@/lib/format";

type P = { user_id: string; username: string; display_name: string; avatar_url: string | null };

export const MentionPickerSheet = ({
  open, onOpenChange, onPick,
}: { open: boolean; onOpenChange: (b: boolean) => void; onPick: (p: P) => void }) => {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<P[]>([]);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      let query = supabase.from("profiles").select("user_id, username, display_name, avatar_url").neq("user_id", user.id).limit(30);
      const term = q.trim();
      if (term) {
        query = query.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`);
      } else {
        const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
        const ids = (follows ?? []).map((f: any) => f.following_id);
        if (ids.length) query = query.in("user_id", ids);
      }
      const { data } = await query;
      setPeople((data ?? []) as P[]);
    })();
  }, [open, q, user?.id]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl h-[70vh] flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="flex items-center gap-2"><AtSign className="h-4 w-4" /> Mention someone</SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <div className="glass flex items-center gap-2 rounded-full px-4 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or @username"
              className="bg-transparent outline-none flex-1 text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {people.map((p) => (
            <button
              key={p.user_id}
              onClick={() => { onPick(p); onOpenChange(false); setQ(""); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
            >
              {p.avatar_url ? (
                <img src={p.avatar_url} className="h-11 w-11 rounded-full object-cover" alt="" />
              ) : (
                <AuraAvatar gradient={gradientFor(p.username)} size="md" initials={initialsOf(p.display_name || p.username)} />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{p.display_name || p.username}</p>
                <p className="text-xs text-muted-foreground truncate">@{p.username}</p>
              </div>
            </button>
          ))}
          {people.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No results</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
};

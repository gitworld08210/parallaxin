import { useEffect, useState } from "react";
import { Search, Send } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

import { useAuth } from "@/contexts/AuthProvider";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { gradientFor, initialsOf } from "@/lib/format";
import { toast } from "sonner";

type Person = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

export const ShareToDM = ({ postId, open, onOpenChange }: { postId: string | null; open: boolean; onOpenChange: (b: boolean) => void }) => {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [sending, setSending] = useState<string | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      // recent DM partners + suggestions
      const ids = (follows ?? []).map((f) => f.following_id);
      if (q.trim()) {
        const term = `%${q.trim()}%`;
        query = query.or(`username.ilike.${term},display_name.ilike.${term}`);
      } else if (ids.length) {
        query = query.in("user_id", ids);
      }
      const { data } = await query;
      setPeople((data ?? []) as Person[]);
    })();
  }, [open, q, user?.id]);

  const sendTo = async (target: Person) => {
    if (!user || !postId) return;
    setSending(target.user_id);
    if (rpcErr || !convId) { setSending(null); toast.error("Couldn't start chat"); return; }
    const content = note.trim() || "Check this out";
      conversation_id: convId, sender_id: user.id, content, shared_post_id: postId,
    });
    setSending(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Sent to @${target.username}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
        <h3 className="font-display text-lg font-semibold mb-3 pt-2">Send to</h3>
        <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3 mb-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search people…"
            className="bg-transparent outline-none flex-1 text-sm placeholder:text-muted-foreground"
          />
        </div>
        <input
          value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Write a message (optional)"
          className="glass w-full rounded-2xl px-4 py-3 text-sm outline-none mb-4"
          maxLength={500}
        />
        <div className="space-y-1 pb-6">
          {people.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No one found.</p>}
          {people.map((p) => (
            <div key={p.user_id} className="flex items-center gap-3 py-2">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <AuraAvatar gradient={gradientFor(p.username)} size="sm" initials={initialsOf(p.display_name || p.username)} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{p.display_name || p.username}</p>
                <p className="text-xs text-muted-foreground truncate">@{p.username}</p>
              </div>
              <button
                onClick={() => sendTo(p)}
                disabled={sending === p.user_id}
                className="h-9 px-4 rounded-full bg-gradient-primary text-primary-foreground text-xs font-semibold shadow-glow flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {sending === p.user_id ? "…" : "Send"}
              </button>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

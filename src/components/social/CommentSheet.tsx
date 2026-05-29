import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { gradientFor, initialsOf, timeAgo } from "@/lib/format";
import { Send } from "lucide-react";
import { toast } from "sonner";

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profile: { username: string; display_name: string; avatar_url: string | null } | null;
};

export const CommentSheet = ({ postId, open, onOpenChange }: { postId: string | null; open: boolean; onOpenChange: (b: boolean) => void }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!postId || !open) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("comments")
        .select("id, content, created_at, user_id, profile:profiles!comments_user_id_fkey(username, display_name, avatar_url)")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      setItems((data as any) ?? []);
      setLoading(false);
    })();
  }, [postId, open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !postId || !text.trim()) return;
    const content = text.trim().slice(0, 500);
    setText("");
    const { data, error } = await supabase
      .from("comments")
      .insert({ user_id: user.id, post_id: postId, content })
      .select("id, content, created_at, user_id, profile:profiles!comments_user_id_fkey(username, display_name, avatar_url)")
      .single();
    if (error) return toast.error(error.message);
    setItems((c) => [...c, data as any]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="glass-strong border-border h-[80vh] rounded-t-3xl p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="font-display text-xl">Comments</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && items.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Be the first to comment ✦</p>}
          {items.map((c) => (
            <div key={c.id} className="flex gap-3">
              {c.profile?.avatar_url ? (
                <img src={c.profile.avatar_url} className="h-9 w-9 rounded-full object-cover" alt="" />
              ) : (
                <AuraAvatar gradient={gradientFor(c.profile?.username)} size="sm" initials={initialsOf(c.profile?.display_name || c.profile?.username)} />
              )}
              <div className="flex-1">
                <div className="glass rounded-2xl px-3 py-2">
                  <p className="text-xs font-semibold">{c.profile?.display_name || c.profile?.username}</p>
                  <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 ml-2">{timeAgo(c.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
        {user && (
          <form onSubmit={submit} className="p-3 border-t border-border flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a comment…"
              maxLength={500}
              className="flex-1 glass rounded-full px-4 py-2.5 text-sm outline-none"
            />
            <button className="h-10 w-10 grid place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
              <Send className="h-4 w-4" />
            </button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
};

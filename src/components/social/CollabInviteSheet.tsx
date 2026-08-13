import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type Invite = {
  post_id: string;
  invited_at: string;
  post: { id: string; content: string; media_url: string | null; user_id: string } | null;
  author: { username: string; display_name: string; avatar_url: string | null } | null;
};

export const CollabInviteSheet = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<Invite[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data } = await supabase.from("post_collaborators" as any).select("post_id, invited_at, post:posts(id, content, media_url, user_id)").eq("user_id", user.id).eq("status", "pending");
      const rows = (data ?? []) as any[];
      const authorIds = Array.from(new Set(rows.map((r) => r.post?.user_id).filter(Boolean)));
      let authors: Record<string, any> = {};
      if (authorIds.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id, username, display_name, avatar_url").in("user_id", authorIds);
        authors = Object.fromEntries((profs ?? []).map((p: any) => [p.user_id, p]));
      }
      setItems(rows.map((r) => ({ ...r, author: authors[r.post?.user_id] ?? null })));
    })();
  }, [open, user?.id]);

  const respond = async (postId: string, status: "accepted" | "declined") => {
    if (!user) return;
    setBusy(postId);
    const { error } = await supabase.from("post_collaborators" as any).update({ status, responded_at: new Date().toISOString() } as any).eq("post_id", postId).eq("user_id", user.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    setItems((prev) => prev.filter((i) => i.post_id !== postId));
    toast.success(status === "accepted" ? "Joined as collaborator" : "Declined");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
        <SheetHeader><SheetTitle>Collab invites</SheetTitle></SheetHeader>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No pending invites</p>
        ) : (
          <div className="mt-3 space-y-3">
            {items.map((i) => (
              <div key={i.post_id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                <Link to={`/p/${i.post_id}`} onClick={() => onOpenChange(false)} className="shrink-0">
                  {i.post?.media_url ? (
                    <img src={i.post.media_url} className="h-12 w-12 rounded-lg object-cover" alt="" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-muted" />
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold">@{i.author?.username ?? "someone"}</span>{" "}
                    <span className="text-muted-foreground">invited you to collaborate</span>
                  </p>
                  {i.post?.content && <p className="text-xs text-muted-foreground truncate mt-0.5">{i.post.content}</p>}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button disabled={busy === i.post_id} onClick={() => respond(i.post_id, "accepted")}
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-60">Accept</button>
                  <button disabled={busy === i.post_id} onClick={() => respond(i.post_id, "declined")}
                    className="px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-semibold disabled:opacity-60">Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

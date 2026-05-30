import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TopBar } from "@/components/vibe/TopBar";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { gradientFor, initialsOf, timeAgo } from "@/lib/format";

type Conv = {
  id: string;
  last_message_at: string;
  other: { user_id: string; username: string; display_name: string; avatar_url: string | null } | null;
  last: string | null;
};

const Messages = () => {
  const { user } = useAuth();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: parts } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);
    const ids = (parts ?? []).map((p) => p.conversation_id);
    if (ids.length === 0) { setConvs([]); setLoading(false); return; }

    const [{ data: conversations }, { data: others }, { data: lastMsgs }] = await Promise.all([
      supabase.from("conversations").select("id, last_message_at").in("id", ids).order("last_message_at", { ascending: false }),
      supabase.from("conversation_participants").select("conversation_id, user_id, profile:profiles!conv_participants_user_profile_fkey(user_id, username, display_name, avatar_url)").in("conversation_id", ids).neq("user_id", user.id),
      supabase.from("messages").select("conversation_id, content, created_at").in("conversation_id", ids).order("created_at", { ascending: false }),
    ]);

    const otherByConv = new Map<string, any>();
    (others ?? []).forEach((o: any) => { if (!otherByConv.has(o.conversation_id)) otherByConv.set(o.conversation_id, o.profile); });
    const lastByConv = new Map<string, string>();
    (lastMsgs ?? []).forEach((m: any) => { if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m.content); });

    setConvs((conversations ?? []).map((c) => ({
      id: c.id,
      last_message_at: c.last_message_at,
      other: otherByConv.get(c.id) ?? null,
      last: lastByConv.get(c.id) ?? null,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  return (
    <div>
      <TopBar subtitle="Realtime" title="Messages" />
      <div className="px-5">
        {loading && <p className="text-sm text-muted-foreground text-center py-10">Loading…</p>}
        {!loading && convs.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-16">
            No conversations yet. Visit a creator's profile and tap Message.
          </p>
        )}
        <div className="space-y-1">
          {convs.map((c) => (
            <Link
              to={`/messages/${c.id}`} key={c.id}
              className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-muted/40 transition-colors"
            >
              {c.other?.avatar_url ? (
                <img src={c.other.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <AuraAvatar gradient={gradientFor(c.other?.username)} size="md" initials={initialsOf(c.other?.display_name || c.other?.username)} />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-sm">{c.other?.display_name || c.other?.username || "Conversation"}</p>
                <p className="text-xs text-muted-foreground truncate">{c.last ?? "Say hi ✦"}</p>
              </div>
              <span className="text-[10px] text-muted-foreground">{timeAgo(c.last_message_at)}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Messages;

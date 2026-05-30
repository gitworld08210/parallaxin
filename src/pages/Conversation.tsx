import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ChevronLeft, Send } from "lucide-react";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { gradientFor, initialsOf } from "@/lib/format";

type Msg = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  shared_post_id?: string | null;
};

type SharedPost = {
  id: string;
  media_url: string | null;
  media_type: string | null;
  content: string;
  profile: { username: string; display_name: string; avatar_url: string | null } | null;
};

const Conversation = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [other, setOther] = useState<{ username: string; display_name: string; avatar_url: string | null } | null>(null);
  const [text, setText] = useState("");
  const [sharedPosts, setSharedPosts] = useState<Record<string, SharedPost>>({});
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const { data: msgs } = await supabase
        .from("messages").select("id, content, sender_id, created_at, shared_post_id")
        .eq("conversation_id", id).order("created_at", { ascending: true });
      setMessages((msgs ?? []) as Msg[]);

      const ids = Array.from(new Set(((msgs ?? []) as Msg[]).map((m) => m.shared_post_id).filter(Boolean) as string[]));
      if (ids.length) {
        const sel = "id, media_url, media_type, content, profile:profiles!posts_user_profile_fkey(username, display_name, avatar_url)";
        const { data: ps } = await supabase.from("posts").select(sel).in("id", ids);
        const map: Record<string, SharedPost> = {};
        (ps ?? []).forEach((p: any) => { map[p.id] = p; });
        setSharedPosts(map);
      }

      const { data: parts } = await supabase
        .from("conversation_participants")
        .select("user_id, profile:profiles!conv_participants_user_profile_fkey(username, display_name, avatar_url)")
        .eq("conversation_id", id).neq("user_id", user.id);
      setOther((parts?.[0] as any)?.profile ?? null);
    })();

    const channel = supabase.channel(`conv:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        async (payload) => {
          const m = payload.new as Msg;
          setMessages((arr) => [...arr, m]);
          if (m.shared_post_id && !sharedPosts[m.shared_post_id]) {
            const sel = "id, media_url, media_type, content, profile:profiles!posts_user_profile_fkey(username, display_name, avatar_url)";
            const { data: p } = await supabase.from("posts").select(sel).eq("id", m.shared_post_id).maybeSingle();
            if (p) setSharedPosts((s) => ({ ...s, [(p as any).id]: p as any }));
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, user?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !text.trim()) return;
    const content = text.trim().slice(0, 2000);
    setText("");
    await supabase.from("messages").insert({ conversation_id: id, sender_id: user.id, content });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* IG-style conversation header */}
      <header className="h-14 px-2 flex items-center gap-3 border-b border-border bg-background sticky top-0 z-10">
        <button onClick={() => nav("/messages")} className="p-1" aria-label="Back">
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </button>
        <Link to={other ? `/u/${other.username}` : "#"} className="flex items-center gap-2.5 flex-1 min-w-0">
          {other?.avatar_url ? (
            <img src={other.avatar_url} className="h-8 w-8 rounded-full object-cover" alt="" />
          ) : (
            <AuraAvatar gradient={gradientFor(other?.username)} size="sm" initials={initialsOf(other?.display_name || other?.username)} />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate leading-tight">{other?.display_name || other?.username || "Conversation"}</p>
            {other?.username && <p className="text-[11px] text-muted-foreground truncate">@{other.username}</p>}
          </div>
        </Link>
      </header>

      <div className="flex-1 px-3 pt-3 pb-24 space-y-1.5 overflow-y-auto">
        {messages.map((m, i) => {
          const mine = m.sender_id === user?.id;
          const sp = m.shared_post_id ? sharedPosts[m.shared_post_id] : null;
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const groupStart = !prev || prev.sender_id !== m.sender_id;
          const groupEnd = !next || next.sender_id !== m.sender_id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={[
                  "max-w-[78%] px-3 py-2 text-sm leading-snug",
                  mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                  "rounded-2xl",
                  mine ? (groupStart ? "rounded-tr-md" : "") : (groupStart ? "rounded-tl-md" : ""),
                  mine ? (groupEnd ? "rounded-br-md" : "") : (groupEnd ? "rounded-bl-md" : ""),
                ].join(" ")}
              >
                {sp && (
                  <Link to={`/p/${sp.id}`} className="block mb-2 rounded-xl overflow-hidden bg-background/20">
                    {sp.media_url && (sp.media_type === "video"
                      ? <video src={sp.media_url} muted className="w-full max-h-48 object-cover" />
                      : <img src={sp.media_url} className="w-full max-h-48 object-cover" alt="" />)}
                    <div className="px-2 py-1.5 text-[11px] opacity-90">
                      @{sp.profile?.username ?? "post"}{sp.content ? ` · ${sp.content.slice(0, 60)}` : ""}
                    </div>
                  </Link>
                )}
                {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="fixed bottom-14 inset-x-0 mx-auto max-w-md p-2 bg-background border-t border-border flex gap-2 items-center">
        <input
          value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Message..."
          className="flex-1 bg-muted rounded-full px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        {text.trim() ? (
          <button type="submit" className="px-3 py-1 text-primary font-semibold text-sm">Send</button>
        ) : (
          <button type="button" disabled className="h-9 w-9 grid place-items-center text-muted-foreground">
            <Send className="h-5 w-5" />
          </button>
        )}
      </form>
    </div>
  );
};

export default Conversation;

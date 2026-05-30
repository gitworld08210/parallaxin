import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ChevronLeft, Send } from "lucide-react";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { gradientFor, initialsOf } from "@/lib/format";
import { VoiceBubble, VoiceRecorder } from "@/components/dm/VoiceMessage";
import { ReportSheet } from "@/components/social/ReportSheet";

type Msg = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  shared_post_id?: string | null;
  read_at?: string | null;
  media_url?: string | null;
  media_type?: string | null;
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
  const [otherTyping, setOtherTyping] = useState(false);
  const [reportMsg, setReportMsg] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mark as read helper
  const markRead = async () => {
    if (!id) return;
    await supabase.rpc("mark_conversation_read", { _conversation_id: id });
  };

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const { data: msgs } = await supabase
        .from("messages").select("id, content, sender_id, created_at, shared_post_id, read_at, media_url, media_type")
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

      markRead();
    })();

    // Postgres changes — new messages + read receipt updates
    const dbChannel = supabase.channel(`conv-db:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        async (payload) => {
          const m = payload.new as Msg;
          setMessages((arr) => arr.some((x) => x.id === m.id) ? arr : [...arr, m]);
          if (m.sender_id !== user.id) markRead();
          if (m.shared_post_id) {
            const sel = "id, media_url, media_type, content, profile:profiles!posts_user_profile_fkey(username, display_name, avatar_url)";
            const { data: p } = await supabase.from("posts").select(sel).eq("id", m.shared_post_id).maybeSingle();
            if (p) setSharedPosts((s) => ({ ...s, [(p as any).id]: p as any }));
          }
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((arr) => arr.map((x) => x.id === m.id ? { ...x, read_at: m.read_at } : x));
        })
      .subscribe();

    // Typing presence/broadcast
    const tChannel = supabase.channel(`conv-typing:${id}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.user_id && payload.payload.user_id !== user.id) {
          setOtherTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 3500);
        }
      })
      .subscribe();
    typingChannelRef.current = tChannel;

    // Mark read when tab refocuses
    const onVis = () => { if (document.visibilityState === "visible") markRead(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(tChannel);
      document.removeEventListener("visibilitychange", onVis);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [id, user?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, otherTyping]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !text.trim()) return;
    const content = text.trim().slice(0, 2000);
    setText("");
    await supabase.from("messages").insert({ conversation_id: id, sender_id: user.id, content });
  };

  const sendVoice = async (mediaUrl: string) => {
    if (!user || !id) return;
    await (supabase.from("messages").insert({
      conversation_id: id, sender_id: user.id, content: "", media_url: mediaUrl, media_type: "audio",
    } as any) as any);
  };

  const startLongPress = (msgId: string, mine: boolean) => {
    if (mine) return;
    longPressRef.current = setTimeout(() => setReportMsg(msgId), 600);
  };
  const cancelLongPress = () => { if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; } };

  const onType = (v: string) => {
    setText(v);
    if (!typingChannelRef.current || !user) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return;
    lastTypingSentRef.current = now;
    typingChannelRef.current.send({ type: "broadcast", event: "typing", payload: { user_id: user.id } });
  };

  // Find last own message that's been read — to show "Seen" once
  const lastSeenIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender_id === user?.id && messages[i].read_at) return i;
    }
    return -1;
  })();

  return (
    <div className="flex flex-col min-h-screen bg-background">
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
            {other?.username && (
              <p className="text-[11px] text-muted-foreground truncate">
                {otherTyping ? <span className="text-primary">typing…</span> : `@${other.username}`}
              </p>
            )}
          </div>
        </Link>
      </header>

      <div className="flex-1 px-3 pt-3 pb-28 space-y-1.5 overflow-y-auto">
        {messages.map((m, i) => {
          const mine = m.sender_id === user?.id;
          const sp = m.shared_post_id ? sharedPosts[m.shared_post_id] : null;
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const groupStart = !prev || prev.sender_id !== m.sender_id;
          const groupEnd = !next || next.sender_id !== m.sender_id;
          return (
            <div key={m.id}>
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  onPointerDown={() => startLongPress(m.id, mine)}
                  onPointerUp={cancelLongPress}
                  onPointerLeave={cancelLongPress}
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
                  {m.media_type === "audio" && m.media_url && <VoiceBubble url={m.media_url} mine={mine} />}
                  {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                </div>
              </div>
              {i === lastSeenIdx && (
                <p className="text-[10px] text-muted-foreground text-right pr-1 mt-0.5">Seen</p>
              )}
            </div>
          );
        })}
        {otherTyping && (
          <div className="flex justify-start">
            <div className="bg-muted text-foreground rounded-2xl rounded-bl-md px-3 py-2.5 inline-flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="fixed bottom-14 inset-x-0 mx-auto max-w-md p-2 bg-background border-t border-border flex gap-2 items-center">
        <input
          value={text} onChange={(e) => onType(e.target.value)}
          placeholder="Message..."
          className="flex-1 bg-muted rounded-full px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        {text.trim() ? (
          <button type="submit" className="px-3 py-1 text-primary font-semibold text-sm">Send</button>
        ) : (
          user && <VoiceRecorder userId={user.id} onSend={sendVoice} />
        )}
      </form>

      <ReportSheet open={!!reportMsg} onOpenChange={(b) => !b && setReportMsg(null)} targetKind="message" targetId={reportMsg} />
    </div>
  );
};

export default Conversation;

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ChevronLeft, Send, Search, Phone, MoreVertical, Paperclip, Smile, Check, CheckCheck } from "lucide-react";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { gradientFor, initialsOf } from "@/lib/format";
import { VoiceBubble, VoiceRecorder } from "@/components/dm/VoiceMessage";
import { ReportSheet } from "@/components/social/ReportSheet";

const RED = "#E50914";
const GREEN = "#46d369";

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

type Other = { username: string; display_name: string; avatar_url: string | null; verification_kind?: string | null } | null;

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const dayLabel = (iso: string) => {
  const d = new Date(iso); const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return "Today";
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });
};

const Conversation = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [other, setOther] = useState<Other>(null);
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
        .select("user_id, profile:profiles!conv_participants_user_profile_fkey(username, display_name, avatar_url, verification_kind)")
        .eq("conversation_id", id).neq("user_id", user.id);
      setOther((parts?.[0] as any)?.profile ?? null);

      markRead();
    })();

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

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || !id || !text.trim()) return;
    const content = text.trim().slice(0, 2000);
    setText("");
    setAiSuggestions([]);
    await supabase.from("messages").insert({ conversation_id: id, sender_id: user.id, content });
  };

  const fetchSuggestions = async () => {
    if (!id || aiBusy) return;
    const last = messages[messages.length - 1];
    if (!last || last.sender_id === user?.id) { setAiSuggestions([]); return; }
    setAiBusy(true);
    try {
      const { data } = await supabase.functions.invoke("ai-dm-suggest", { body: { conversation_id: id } });
      setAiSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
    } catch { /* silent */ }
    finally { setAiBusy(false); }
  };

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && last.sender_id !== user?.id) fetchSuggestions();
    else setAiSuggestions([]);
    // eslint-disable-next-line
  }, [messages.length, user?.id]);

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

  // Render rows with day-dividers and grouping flags
  const rows = useMemo(() => {
    const out: Array<
      | { kind: "day"; key: string; label: string }
      | { kind: "msg"; key: string; m: Msg; mine: boolean; groupStart: boolean; groupEnd: boolean }
    > = [];
    let lastDay = "";
    messages.forEach((m, i) => {
      const day = new Date(m.created_at).toDateString();
      if (day !== lastDay) {
        out.push({ kind: "day", key: `d-${day}`, label: dayLabel(m.created_at) });
        lastDay = day;
      }
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const sameSenderAsPrev = prev && prev.sender_id === m.sender_id && new Date(m.created_at).toDateString() === new Date(prev.created_at).toDateString();
      const sameSenderAsNext = next && next.sender_id === m.sender_id && new Date(m.created_at).toDateString() === new Date(next.created_at).toDateString();
      out.push({
        kind: "msg",
        key: m.id,
        m,
        mine: m.sender_id === user?.id,
        groupStart: !sameSenderAsPrev,
        groupEnd: !sameSenderAsNext,
      });
    });
    return out;
  }, [messages, user?.id]);

  const otherName = other?.display_name || other?.username || "Conversation";

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#0a0a0a", color: "white" }}>
      {/* Header */}
      <header
        className="h-16 px-2 flex items-center gap-2 sticky top-0 z-20 backdrop-blur"
        style={{ background: "rgba(10,10,10,0.85)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button onClick={() => nav("/messages")} className="h-10 w-10 grid place-items-center rounded-full hover:bg-white/5" aria-label="Back">
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
        <Link to={other ? `/u/${other.username}` : "#"} className="flex items-center gap-3 flex-1 min-w-0">
          <div className="rounded-full p-[2px] shrink-0" style={{ background: `linear-gradient(135deg, ${RED}, #ff3b47)` }}>
            {other?.avatar_url ? (
              <img src={other.avatar_url} className="h-9 w-9 rounded-full object-cover" style={{ border: "2px solid #0a0a0a" }} alt="" />
            ) : (
              <div className="h-9 w-9 rounded-full overflow-hidden" style={{ border: "2px solid #0a0a0a" }}>
                <AuraAvatar gradient={gradientFor(other?.username)} size="sm" initials={initialsOf(otherName)} />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold truncate leading-tight text-white inline-flex items-center gap-1">
              {otherName}
              {other?.verification_kind && <VerificationBadge kind={other.verification_kind as any} />}
            </p>
            <p className="text-[11px] leading-tight" style={{ color: otherTyping ? RED : GREEN }}>
              {otherTyping ? "typing…" : "online"}
            </p>
          </div>
        </Link>
        <button className="h-10 w-10 grid place-items-center rounded-full hover:bg-white/5" aria-label="Search">
          <Search className="h-5 w-5" style={{ color: "rgba(255,255,255,0.85)" }} />
        </button>
        <button
          onClick={() => other && startCall(id!, {
            user_id: other.user_id, username: other.username, display_name: other.display_name, avatar_url: other.avatar_url,
          }, "voice")}
          className="h-10 w-10 grid place-items-center rounded-full hover:bg-white/5"
          aria-label="Voice call"
        >
          <Phone className="h-5 w-5" style={{ color: "rgba(255,255,255,0.85)" }} />
        </button>
        <button
          onClick={() => other && startCall(id!, {
            user_id: other.user_id, username: other.username, display_name: other.display_name, avatar_url: other.avatar_url,
          }, "video")}
          className="h-10 w-10 grid place-items-center rounded-full hover:bg-white/5"
          aria-label="Video call"
        >
          <Video className="h-5 w-5" style={{ color: "rgba(255,255,255,0.85)" }} />
        </button>
        <button className="h-10 w-10 grid place-items-center rounded-full hover:bg-white/5" aria-label="More">
          <MoreVertical className="h-5 w-5" style={{ color: "rgba(255,255,255,0.85)" }} />
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 px-3 pt-4 pb-36 space-y-1 overflow-y-auto">
        {rows.map((r) => {
          if (r.kind === "day") {
            return (
              <div key={r.key} className="flex justify-center my-3">
                <span
                  className="text-[11px] font-medium px-3 py-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)" }}
                >
                  {r.label}
                </span>
              </div>
            );
          }
          const { m, mine, groupStart, groupEnd } = r;
          const sp = m.shared_post_id ? sharedPosts[m.shared_post_id] : null;

          const radius = {
            borderTopLeftRadius: mine ? 20 : groupStart ? 20 : 6,
            borderTopRightRadius: mine ? (groupStart ? 20 : 6) : 20,
            borderBottomLeftRadius: mine ? 20 : groupEnd ? 6 : 20,
            borderBottomRightRadius: mine ? (groupEnd ? 6 : 20) : 20,
          };

          const bubbleStyle: React.CSSProperties = mine
            ? {
                background: `linear-gradient(135deg, #7a1014 0%, ${RED} 100%)`,
                color: "white",
                boxShadow: `0 4px 16px ${RED}33`,
                ...radius,
              }
            : {
                background: "#1f1f1f",
                color: "white",
                ...radius,
              };

          return (
            <div key={r.key} className={`flex ${mine ? "justify-end" : "justify-start"} ${groupEnd ? "mb-1.5" : ""}`}>
              <div
                onPointerDown={() => startLongPress(m.id, mine)}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
                className="max-w-[78%] px-3.5 py-2 text-[14px] leading-snug animate-fade-in"
                style={bubbleStyle}
              >
                {sp && (
                  <Link to={`/p/${sp.id}`} className="block mb-2 rounded-xl overflow-hidden" style={{ background: "rgba(0,0,0,0.25)" }}>
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
                <div className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5">
                  <span className="text-[10px]" style={{ color: mine ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.45)" }}>
                    {fmtTime(m.created_at)}
                  </span>
                  {mine && (
                    m.read_at
                      ? <CheckCheck className="h-3.5 w-3.5" style={{ color: "#ffd1d3" }} />
                      : <Check className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.75)" }} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {otherTyping && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md px-3.5 py-3 inline-flex gap-1" style={{ background: "#1f1f1f" }}>
              <span className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: "rgba(255,255,255,0.6)", animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: "rgba(255,255,255,0.6)", animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: "rgba(255,255,255,0.6)", animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={send}
        className="fixed bottom-14 inset-x-0 mx-auto max-w-md p-3 flex flex-col gap-2"
        style={{ background: "#0a0a0a", borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        {aiSuggestions.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
            {aiSuggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setText(s); setAiSuggestions([]); }}
                className="shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
                style={{ background: "rgba(229,9,20,0.12)", color: RED, border: `1px solid ${RED}55` }}
              >
                ✨ {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-center">
          <div
            className="flex items-center gap-2 flex-1 rounded-full px-3"
            style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <button type="button" className="h-9 w-9 grid place-items-center -ml-1" aria-label="Attach">
              <Paperclip className="h-5 w-5" style={{ color: "rgba(255,255,255,0.6)" }} />
            </button>
            <input
              value={text}
              onChange={(e) => onType(e.target.value)}
              placeholder={`Message ${other?.display_name || other?.username || ""}…`}
              className="flex-1 bg-transparent outline-none text-sm py-2.5 text-white placeholder:text-white/40"
            />
            <button type="button" className="h-9 w-9 grid place-items-center" aria-label="Emoji">
              <Smile className="h-5 w-5" style={{ color: "rgba(255,255,255,0.6)" }} />
            </button>
          </div>
          {text.trim() ? (
            <button
              type="submit"
              className="h-11 w-11 grid place-items-center rounded-full transition-transform active:scale-90"
              style={{ background: RED, boxShadow: `0 6px 20px ${RED}66` }}
              aria-label="Send"
            >
              <Send className="h-5 w-5 text-white" />
            </button>
          ) : user ? (
            <div
              className="h-11 w-11 grid place-items-center rounded-full"
              style={{ background: RED, boxShadow: `0 6px 20px ${RED}66` }}
            >
              <VoiceRecorder userId={user.id} onSend={sendVoice} />
            </div>
          ) : null}
        </div>
      </form>

      <ReportSheet open={!!reportMsg} onOpenChange={(b) => !b && setReportMsg(null)} targetKind="message" targetId={reportMsg} />
    </div>
  );
};

export default Conversation;

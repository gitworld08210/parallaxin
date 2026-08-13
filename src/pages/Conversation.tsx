import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ChevronLeft, Send, Search, Phone, Video, MoreVertical, Paperclip, Smile, Check, CheckCheck, Users } from "lucide-react";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, getDoc, getDocs, limit, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { useAuth } from "@/contexts/AuthProvider";
import { gradientFor, initialsOf } from "@/lib/format";
import { VoiceBubble, VoiceRecorder } from "@/components/dm/VoiceMessage";
import { ReportSheet } from "@/components/social/ReportSheet";
import { useCall } from "@/contexts/CallProvider";
import { GroupInfoSheet } from "@/components/dm/GroupInfoSheet";
import { reliableInvoke } from "@/lib/reliableInvoke";

const WA_GREEN = "hsl(var(--wa-green))";
const TICK_READ = "hsl(var(--chat-tick-read))";

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

type Other = { user_id: string; username: string; display_name: string; avatar_url: string | null; verification_kind?: string | null } | null;

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
  const { startCall } = useCall();
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
    if (!id || !user) return;
    const convRef = doc(db, "conversations", id);
    await updateDoc(convRef, {
      [`unread_counts.${user.id}`]: 0,
      last_read: true
    });
  };

  useEffect(() => {
    if (!id || !user) return;

    // Listen to messages
    const qMessages = query(
      collection(db, "conversations", id, "messages"),
      orderBy("created_at", "asc")
    );
    const unsubMsgs = onSnapshot(qMessages, async (snap) => {
      const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setMessages(msgs);

      // Fetch shared posts if any
      const sharedIds = Array.from(new Set(msgs.map(m => m.shared_post_id).filter(Boolean)));
      if (sharedIds.length) {
        // We'll keep posts in Supabase for now as per plan Step 2.C logic for "social graph" 
        // until fully migrated, or fetch from Firestore if Step 2.B is complete.
        // Assuming Firestore 'posts' collection based on step 2.A/B.
        const postIds = sharedIds as string[];
        const map: Record<string, SharedPost> = {};
        for (const pid of postIds) {
          if (sharedPosts[pid]) continue;
          const pDoc = await getDoc(doc(db, "posts", pid));
          if (pDoc.exists()) map[pid] = { id: pDoc.id, ...pDoc.data() } as any;
        }
        if (Object.keys(map).length) setSharedPosts(s => ({ ...s, ...map }));
      }
    });

    // Listen to conversation metadata (for 'other' profile and typing)
    const unsubConv = onSnapshot(doc(db, "conversations", id), (snap) => {
      const d = snap.data();
      if (!d) return;
      
      // Find 'other' member
      const otherMember = d.members?.find((m: any) => m.user_id !== user.id);
      if (otherMember) setOther(otherMember);

      // Typing state
      if (d.typing && d.typing.user_id !== user.id) {
        const now = Date.now();
        if (now - d.typing.at < 3500) {
          setOtherTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 3500);
        }
      }
    });

    markRead();

    const onVis = () => { if (document.visibilityState === "visible") markRead(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      unsubMsgs();
      unsubConv();
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
    const convRef = doc(db, "conversations", id);
    const msgRef = collection(db, "conversations", id, "messages");
    
    await addDoc(msgRef, {
      sender_id: user.id,
      content,
      created_at: serverTimestamp()
    });

    await updateDoc(convRef, {
      last_message_text: content,
      last_message_at: serverTimestamp(),
      last_sender_id: user.id,
      last_read: false
    });
  };

  const fetchSuggestions = async () => {
    if (!id || aiBusy) return;
    const last = messages[messages.length - 1];
    if (!last || last.sender_id === user?.id) { setAiSuggestions([]); return; }
    setAiBusy(true);
    try {
      const resp = await reliableInvoke("ai-reply-suggestions", {
        body: { message: last.content },
      });
      const data = resp.data as any;
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
    const convRef = doc(db, "conversations", id);
    const msgRef = collection(db, "conversations", id, "messages");
    
    await addDoc(msgRef, {
      sender_id: user.id,
      content: "",
      media_url: mediaUrl,
      media_type: "audio",
      created_at: serverTimestamp()
    });

    await updateDoc(convRef, {
      last_message_text: "🎤 Voice message",
      last_message_at: serverTimestamp(),
      last_sender_id: user.id,
      last_read: false
    });
  };

  const startLongPress = (msgId: string, mine: boolean) => {
    if (mine) return;
    longPressRef.current = setTimeout(() => setReportMsg(msgId), 600);
  };
  const cancelLongPress = () => { if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; } };

  const onType = async (v: string) => {
    setText(v);
    if (!user || !id) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return;
    lastTypingSentRef.current = now;
    
    const convRef = doc(db, "conversations", id);
    await updateDoc(convRef, {
      typing: { user_id: user.id, at: now }
    });
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
    <div
      className="flex flex-col min-h-screen"
      style={{ background: "hsl(var(--chat-bg))", color: "hsl(var(--foreground))" }}
    >
      {/* WhatsApp-style green header */}
      <header
        className="h-14 px-1.5 flex items-center gap-1 sticky top-0 z-20"
        style={{ background: "hsl(var(--chat-header))", color: "hsl(var(--wa-green-foreground))" }}
      >
        <button onClick={() => nav("/messages")} className="h-10 w-10 grid place-items-center rounded-full hover:bg-white/10" aria-label="Back">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <Link to={other ? `/u/${other.username}` : "#"} className="flex items-center gap-2.5 flex-1 min-w-0">
          {other?.avatar_url ? (
            <img src={other.avatar_url} className="h-9 w-9 rounded-full object-cover" alt="" />
          ) : (
            <div className="h-9 w-9 rounded-full overflow-hidden">
              <AuraAvatar gradient={gradientFor(other?.username)} size="sm" initials={initialsOf(otherName)} />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[15px] font-semibold truncate leading-tight inline-flex items-center gap-1">
              {otherName}
              {other?.verification_kind && <VerificationBadge kind={other.verification_kind as any} />}
            </p>
            <p className="text-[12px] leading-tight opacity-85">
              {otherTyping ? "typing…" : "online"}
            </p>
          </div>
        </Link>
        <button
          onClick={() => other && startCall(id!, {
            user_id: other.user_id, username: other.username, display_name: other.display_name, avatar_url: other.avatar_url,
          }, "video")}
          className="h-10 w-10 grid place-items-center rounded-full hover:bg-white/10"
          aria-label="Video call"
        >
          <Video className="h-[22px] w-[22px]" />
        </button>
        <button
          onClick={() => other && startCall(id!, {
            user_id: other.user_id, username: other.username, display_name: other.display_name, avatar_url: other.avatar_url,
          }, "voice")}
          className="h-10 w-10 grid place-items-center rounded-full hover:bg-white/10"
          aria-label="Voice call"
        >
          <Phone className="h-5 w-5" />
        </button>
        <button className="h-10 w-10 grid place-items-center rounded-full hover:bg-white/10" aria-label="More">
          <MoreVertical className="h-5 w-5" />
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
                  style={{ background: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}
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
                background: "hsl(var(--chat-bubble-out))",
                color: "hsl(var(--chat-bubble-out-foreground))",
                boxShadow: "0 1px 1px hsl(0 0% 0% / 0.15)",
                ...radius,
              }
            : {
                background: "hsl(var(--chat-bubble-in))",
                color: "hsl(var(--chat-bubble-in-foreground))",
                boxShadow: "0 1px 1px hsl(0 0% 0% / 0.15)",
                ...radius,
              };

          return (
            <div key={r.key} className={`flex ${mine ? "justify-end" : "justify-start"} ${groupEnd ? "mb-1.5" : ""}`}>
              <div
                onPointerDown={() => startLongPress(m.id, mine)}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
                className="max-w-[78%] px-2.5 py-1.5 text-[14.5px] leading-snug animate-fade-in"
                style={bubbleStyle}
              >
                {sp && (
                  <Link to={`/p/${sp.id}`} className="block mb-2 rounded-xl overflow-hidden" style={{ background: "hsl(0 0% 0% / 0.15)" }}>
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
                  <span className="text-[10.5px] opacity-70">
                    {fmtTime(m.created_at)}
                  </span>
                  {mine && (
                    m.read_at
                      ? <CheckCheck className="h-3.5 w-3.5" style={{ color: TICK_READ }} />
                      : <Check className="h-3.5 w-3.5 opacity-70" />
                  )}
                </div>
              </div>
            </div>
          );

        })}
        {otherTyping && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md px-3.5 py-3 inline-flex gap-1" style={{ background: "hsl(var(--secondary))" }}>
              <span className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: "hsl(var(--muted-foreground))", animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: "hsl(var(--muted-foreground))", animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: "hsl(var(--muted-foreground))", animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={send}
        className="fixed bottom-14 inset-x-0 mx-auto max-w-md p-2 flex flex-col gap-2"
        style={{ background: "hsl(var(--chat-bg))" }}
      >
        {aiSuggestions.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
            {aiSuggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setText(s); setAiSuggestions([]); }}
                className="shrink-0 text-xs px-3 py-1.5 rounded-full font-medium"
                style={{ background: "hsl(var(--wa-green) / 0.15)", color: WA_GREEN, border: "1px solid hsl(var(--wa-green) / 0.4)" }}
              >
                ✨ {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-center">
          <div
            className="flex items-center gap-2 flex-1 rounded-full px-2"
            style={{ background: "hsl(var(--chat-composer))" }}
          >
            <button type="button" className="h-9 w-9 grid place-items-center" aria-label="Emoji">
              <Smile className="h-[22px] w-[22px] opacity-70" />
            </button>
            <input
              value={text}
              onChange={(e) => onType(e.target.value)}
              placeholder="Message"
              className="flex-1 bg-transparent outline-none text-[15px] py-2.5 placeholder:opacity-60"
            />
            <button type="button" className="h-9 w-9 grid place-items-center" aria-label="Attach">
              <Paperclip className="h-[20px] w-[20px] opacity-70" />
            </button>
          </div>
          {text.trim() ? (
            <button
              type="submit"
              className="h-11 w-11 grid place-items-center rounded-full transition-transform active:scale-90"
              style={{ background: WA_GREEN, color: "hsl(var(--wa-green-foreground))" }}
              aria-label="Send"
            >
              <Send className="h-5 w-5" />
            </button>
          ) : user ? (
            <div
              className="h-11 w-11 grid place-items-center rounded-full"
              style={{ background: WA_GREEN, color: "hsl(var(--wa-green-foreground))" }}
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

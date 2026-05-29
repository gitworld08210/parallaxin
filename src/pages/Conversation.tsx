import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Send } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { gradientFor, initialsOf, timeAgo } from "@/lib/format";

type Msg = { id: string; content: string; sender_id: string; created_at: string };

const Conversation = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [other, setOther] = useState<{ username: string; display_name: string; avatar_url: string | null } | null>(null);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const { data: msgs } = await supabase
        .from("messages").select("id, content, sender_id, created_at")
        .eq("conversation_id", id).order("created_at", { ascending: true });
      setMessages((msgs ?? []) as Msg[]);
      const { data: parts } = await supabase
        .from("conversation_participants")
        .select("user_id, profile:profiles!conversation_participants_user_id_fkey(username, display_name, avatar_url)")
        .eq("conversation_id", id).neq("user_id", user.id);
      setOther((parts?.[0] as any)?.profile ?? null);
    })();

    const channel = supabase.channel(`conv:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          setMessages((m) => [...m, payload.new as Msg]);
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
    <div className="flex flex-col min-h-screen">
      <TopBar
        subtitle="DM"
        title={other?.display_name || other?.username || "Conversation"}
        right={
          <button onClick={() => nav("/messages")} className="glass h-11 w-11 rounded-full grid place-items-center">
            <ChevronLeft className="h-5 w-5" />
          </button>
        }
      />
      <div className="flex-1 px-5 pb-32 space-y-3 overflow-y-auto">
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-gradient-primary text-primary-foreground shadow-glow" : "glass"}`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p className="text-[10px] opacity-70 mt-1">{timeAgo(m.created_at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="fixed bottom-0 inset-x-0 mx-auto max-w-md p-3 flex gap-2 glass-strong border-t border-border">
        {other && (
          other.avatar_url
            ? <img src={other.avatar_url} className="h-10 w-10 rounded-full object-cover" alt="" />
            : <AuraAvatar gradient={gradientFor(other.username)} size="sm" initials={initialsOf(other.display_name || other.username)} />
        )}
        <input
          value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Message…"
          className="flex-1 glass rounded-full px-4 py-2.5 text-sm outline-none"
        />
        <button className="h-10 w-10 grid place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};

export default Conversation;

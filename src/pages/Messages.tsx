import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, PenSquare, X, ChevronLeft, MessageCircle } from "lucide-react";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import { EmptyState } from "@/components/empty/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { gradientFor, initialsOf } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Telegram-style timestamp: HH:mm today, weekday this week, dd/mm older.
const chatTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
};


type Conv = {
  id: string;
  last_message_at: string;
  other: { user_id: string; username: string; display_name: string; avatar_url: string | null; verification_kind?: string | null } | null;
  last: string | null;
  unread: number;
};

type ProfileRow = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  verification_kind: string | null;
};


type Tab = "all" | "primary" | "requests";

const Messages = () => {
  const { user, profile: me } = useAuth();
  const nav = useNavigate();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerQuery, setComposerQuery] = useState("");
  const [results, setResults] = useState<ProfileRow[]>([]);
  const [starting, setStarting] = useState(false);

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
      supabase.from("conversation_participants").select("conversation_id, user_id, profile:profiles!conv_participants_user_profile_fkey(user_id, username, display_name, avatar_url, verification_kind)").in("conversation_id", ids).neq("user_id", user.id),
      supabase.from("messages").select("conversation_id, content, created_at, sender_id, read_at").in("conversation_id", ids).order("created_at", { ascending: false }),
    ]);

    const otherByConv = new Map<string, any>();
    (others ?? []).forEach((o: any) => { if (!otherByConv.has(o.conversation_id)) otherByConv.set(o.conversation_id, o.profile); });
    const lastByConv = new Map<string, string>();
    const unreadByConv = new Map<string, number>();
    (lastMsgs ?? []).forEach((m: any) => {
      if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m.content);
      if (m.sender_id !== user.id && !m.read_at) {
        unreadByConv.set(m.conversation_id, (unreadByConv.get(m.conversation_id) ?? 0) + 1);
      }
    });

    setConvs((conversations ?? []).map((c) => ({
      id: c.id,
      last_message_at: c.last_message_at,
      other: otherByConv.get(c.id) ?? null,
      last: lastByConv.get(c.id) ?? null,
      unread: unreadByConv.get(c.id) ?? 0,
    })));
    setLoading(false);
  };


  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  useEffect(() => {
    const q = composerQuery.trim();
    if (!q) { setResults([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, verification_kind")
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .neq("user_id", user?.id ?? "")
        .limit(12);
      if (!cancelled) setResults((data as any) ?? []);
    }, 220);
    return () => { cancelled = true; clearTimeout(t); };
  }, [composerQuery, user?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = convs;
    if (tab === "primary") base = base.filter((c) => c.unread > 0);
    else if (tab === "requests") base = base.filter((c) => !c.last);
    if (!q) return base;
    return base.filter((c) =>
      (c.other?.username || "").toLowerCase().includes(q) ||
      (c.other?.display_name || "").toLowerCase().includes(q) ||
      (c.last || "").toLowerCase().includes(q)
    );
  }, [convs, query, tab]);

  const primaryCount = useMemo(() => convs.filter((c) => c.unread > 0).length, [convs]);
  const requestsCount = useMemo(() => convs.filter((c) => !c.last).length, [convs]);


  const startChat = async (otherId: string) => {
    if (!user) return;
    setStarting(true);
    try {
      const { data, error } = await supabase.rpc("start_dm", { other_user_id: otherId });
      if (error) throw error;
      setComposerOpen(false);
      setComposerQuery("");
      nav(`/messages/${data}`);
    } catch (e: any) {
      toast.error(e.message || "Could not start chat");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div>
      {/* Aurelix messages header */}
      <header className="h-14 px-5 flex items-center justify-between gap-3 border-b border-border">
        <h1 className="text-xl font-bold tracking-tight">Messages</h1>
        <button onClick={() => setComposerOpen(true)} className="p-1.5 rounded-full hover:bg-muted/40" aria-label="New chat">
          <PenSquare className="h-5 w-5 text-foreground" strokeWidth={1.75} />
        </button>
      </header>

      <div className="px-4 pt-3">
        <div className="bg-secondary/60 border border-border rounded-full flex items-center gap-2 px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Segmented tabs */}
      <div className="px-4 mt-4 flex items-center gap-2">
        {([
          { id: "all", label: "All", count: 0 },
          { id: "primary", label: "Primary", count: primaryCount },
          { id: "requests", label: "Requests", count: requestsCount },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-colors border",
              tab === t.id
                ? "bg-primary text-primary-foreground border-primary shadow-glow"
                : "bg-secondary/40 text-foreground border-border hover:border-primary/40"
            )}
          >
            {t.label}
            {t.count > 0 && (
              <span className={cn(
                "min-w-[18px] h-[18px] px-1 rounded-full grid place-items-center text-[10px] font-bold",
                tab === t.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground"
              )}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="px-1 mt-2">
        {loading && <p className="text-sm text-muted-foreground text-center py-10">Loading…</p>}
        {!loading && convs.length === 0 && (
          <EmptyState
            icon={MessageCircle}
            title="Your messages"
            subtitle="Send a private message to start a conversation."
            cta={{ label: "New message", onClick: () => setComposerOpen(true) }}
            size="lg"
          />
        )}
        {!loading && convs.length > 0 && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">No matches.</p>
        )}
        <ul>
          {filtered.map((c) => (
            <li key={c.id}>
              <Link
                to={`/messages/${c.id}`}
                className="flex items-center gap-3 px-3 py-2.5 active:bg-secondary"
              >
                {c.other?.avatar_url ? (
                  <img src={c.other.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover shrink-0" />
                ) : (
                  <AuraAvatar gradient={gradientFor(c.other?.username)} size="md" initials={initialsOf(c.other?.display_name || c.other?.username)} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn("truncate text-sm flex items-center gap-1", c.unread > 0 ? "font-semibold text-foreground" : "font-medium text-foreground")}>
                      {c.other?.display_name || c.other?.username || "Conversation"}
                      {c.other?.verification_kind && <VerificationBadge kind={c.other.verification_kind as any} />}
                    </p>
                    <span className={cn("ml-auto text-[11px] shrink-0", c.unread > 0 ? "text-primary font-semibold" : "text-muted-foreground")}>
                      {chatTime(c.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className={cn("text-xs truncate flex-1", c.unread > 0 ? "text-foreground" : "text-muted-foreground")}>
                      {c.last ?? "Tap to start chatting"}
                    </p>
                    {c.unread > 0 && (
                      <span className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold">
                        {c.unread > 99 ? "99+" : c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>

      </div>

      <Sheet open={composerOpen} onOpenChange={setComposerOpen}>
        <SheetContent side="bottom" className="bg-background border-t border-border h-[80vh] rounded-t-2xl p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b border-border">
            <SheetTitle className="text-base font-semibold text-foreground text-left">New message</SheetTitle>
          </SheetHeader>
          <div className="p-3">
            <div className="bg-muted rounded-lg flex items-center gap-2 px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={composerQuery}
                onChange={(e) => setComposerQuery(e.target.value)}
                placeholder="Search by name or @username"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {composerQuery.trim() && results.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">No results.</p>
            )}
            {results.map((p) => (
              <button
                key={p.user_id}
                disabled={starting}
                onClick={() => startChat(p.user_id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 active:bg-secondary text-left disabled:opacity-50"
              >
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                ) : (
                  <AuraAvatar gradient={gradientFor(p.username)} size="md" initials={initialsOf(p.display_name || p.username)} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm flex items-center gap-1 truncate">
                    {p.display_name || p.username}
                    {p.verification_kind && <VerificationBadge kind={p.verification_kind as any} />}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">@{p.username}</p>
                </div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Messages;

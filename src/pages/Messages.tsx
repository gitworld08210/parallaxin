import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, SlidersHorizontal, SquarePen, X, MessageCircle, Archive, ChevronRight, Users } from "lucide-react";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import { EmptyState } from "@/components/empty/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { gradientFor, initialsOf } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { NewGroupSheet } from "@/components/dm/NewGroupSheet";

const RED = "#E50914";

const chatTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
};

type Conv = {
  id: string;
  last_message_at: string;
  is_group: boolean;
  title: string | null;
  avatar_url: string | null;
  members: { user_id: string; username: string; display_name: string; avatar_url: string | null; verification_kind?: string | null }[];
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

type Tab = "all" | "unread" | "requests";

const Messages = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerQuery, setComposerQuery] = useState("");
  const [results, setResults] = useState<ProfileRow[]>([]);
  const [starting, setStarting] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);

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
      supabase.from("conversations").select("id, last_message_at, is_group, title, avatar_url").in("id", ids).order("last_message_at", { ascending: false }),
      supabase.from("conversation_participants").select("conversation_id, user_id, profile:profiles!conv_participants_user_profile_fkey(user_id, username, display_name, avatar_url, verification_kind)").in("conversation_id", ids).neq("user_id", user.id),
      supabase.from("messages").select("conversation_id, content, created_at, sender_id, read_at").in("conversation_id", ids).order("created_at", { ascending: false }),
    ]);

    const membersByConv = new Map<string, any[]>();
    (others ?? []).forEach((o: any) => {
      const arr = membersByConv.get(o.conversation_id) ?? [];
      if (o.profile) arr.push(o.profile);
      membersByConv.set(o.conversation_id, arr);
    });
    const lastByConv = new Map<string, string>();
    const unreadByConv = new Map<string, number>();
    (lastMsgs ?? []).forEach((m: any) => {
      if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m.content);
      if (m.sender_id !== user.id && !m.read_at) {
        unreadByConv.set(m.conversation_id, (unreadByConv.get(m.conversation_id) ?? 0) + 1);
      }
    });

    setConvs((conversations ?? []).map((c: any) => ({
      id: c.id,
      last_message_at: c.last_message_at,
      is_group: !!c.is_group,
      title: c.title ?? null,
      avatar_url: c.avatar_url ?? null,
      members: membersByConv.get(c.id) ?? [],
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
    if (tab === "unread") base = base.filter((c) => c.unread > 0);
    else if (tab === "requests") base = base.filter((c) => !c.last);
    if (!q) return base;
    return base.filter((c) => {
      const other = c.members[0];
      const name = c.is_group ? (c.title || "Group") : (other?.display_name || other?.username || "");
      return name.toLowerCase().includes(q) || (c.last || "").toLowerCase().includes(q);
    });
  }, [convs, query, tab]);

  const unreadCount = useMemo(() => convs.filter((c) => c.unread > 0).length, [convs]);
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

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "all", label: "All", count: 0 },
    { id: "unread", label: "Unread", count: unreadCount },
    { id: "requests", label: "Requests", count: requestsCount },
  ];

  return (
    <div style={{ background: "#0a0a0a", color: "white" }} className="min-h-screen">
      {/* Header */}
      <header className="h-16 px-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-white">Messages</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch((s) => !s)}
            className="h-9 w-9 grid place-items-center rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Search"
          >
            <SlidersHorizontal className="h-5 w-5" style={{ color: showSearch ? RED : "rgba(255,255,255,0.85)" }} />
          </button>
          <button
            onClick={() => setComposerOpen(true)}
            className="h-9 w-9 grid place-items-center rounded-lg transition-transform active:scale-95"
            style={{ background: RED, boxShadow: `0 6px 20px ${RED}55` }}
            aria-label="New chat"
          >
            <SquarePen className="h-4.5 w-4.5 text-white" strokeWidth={2.25} />
          </button>
        </div>
      </header>

      {/* Search (collapsible) */}
      {showSearch && (
        <div className="px-5 pb-2 animate-fade-in">
          <div className="flex items-center gap-2 rounded-full px-4 py-2.5" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Search className="h-4 w-4" style={{ color: "rgba(255,255,255,0.5)" }} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages"
              className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/40"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear">
                <X className="h-4 w-4" style={{ color: "rgba(255,255,255,0.5)" }} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-5 flex items-center gap-6 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="relative py-3 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
              style={{ color: active ? RED : "rgba(255,255,255,0.55)" }}
            >
              {t.label}
              {t.count > 0 && (
                <span
                  className="min-w-[20px] h-5 px-1.5 rounded-full grid place-items-center text-[11px] font-bold text-white"
                  style={{ background: RED }}
                >
                  {t.count > 99 ? "99+" : t.count}
                </span>
              )}
              {active && (
                <span
                  className="absolute left-0 right-0 -bottom-px h-[2px] rounded-full"
                  style={{ background: RED }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="pt-2">
        {loading && <p className="text-sm text-white/50 text-center py-10">Loading…</p>}
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
          <p className="text-sm text-white/50 text-center py-10">No matches.</p>
        )}
        <ul>
          {filtered.map((c) => {
            const unread = c.unread > 0;
            const name = c.other?.display_name || c.other?.username || "Conversation";
            return (
              <li key={c.id}>
                <Link
                  to={`/messages/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors active:scale-[0.99]"
                  style={{ background: unread ? "rgba(229,9,20,0.04)" : "transparent" }}
                >
                  <div className="relative shrink-0">
                    <div
                      className="rounded-full p-[2px]"
                      style={unread ? { background: `linear-gradient(135deg, ${RED}, #ff3b47)` } : { background: "transparent", padding: 0 }}
                    >
                      {c.other?.avatar_url ? (
                        <img src={c.other.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" style={{ border: unread ? "2px solid #0a0a0a" : "none" }} />
                      ) : (
                        <div className="h-12 w-12 rounded-full overflow-hidden" style={{ border: unread ? "2px solid #0a0a0a" : "none" }}>
                          <AuraAvatar gradient={gradientFor(c.other?.username)} size="md" initials={initialsOf(name)} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[15px] font-semibold text-white">{name}</p>
                      {c.other?.verification_kind && <VerificationBadge kind={c.other.verification_kind as any} />}
                      <span className="ml-auto text-[11px] shrink-0" style={{ color: unread ? RED : "rgba(255,255,255,0.45)" }}>
                        {chatTime(c.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p
                        className="text-[13px] truncate flex-1"
                        style={{ color: unread ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)" }}
                      >
                        {c.last ?? "Tap to start chatting"}
                      </p>
                      {unread && (
                        <span
                          className="shrink-0 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold text-white"
                          style={{ background: RED }}
                        >
                          {c.unread > 99 ? "99+" : c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Archived chats footer */}
        {!loading && convs.length > 0 && (
          <button
            className="w-full flex items-center gap-3 px-4 py-4 mt-2 transition-colors hover:bg-white/[0.02]"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            onClick={() => toast.info("Archive coming soon")}
          >
            <div className="h-12 w-12 rounded-full grid place-items-center shrink-0" style={{ background: "#1a1a1a" }}>
              <Archive className="h-5 w-5" style={{ color: "rgba(255,255,255,0.7)" }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[15px] font-semibold text-white">Archived Chats</p>
              <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.5)" }}>Saved for later</p>
            </div>
            <ChevronRight className="h-5 w-5" style={{ color: "rgba(255,255,255,0.35)" }} />
          </button>
        )}
      </div>

      {/* New chat sheet */}
      <Sheet open={composerOpen} onOpenChange={setComposerOpen}>
        <SheetContent
          side="bottom"
          className="border-t h-[80vh] rounded-t-3xl p-0 flex flex-col"
          style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.08)", color: "white" }}
        >
          <SheetHeader className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <SheetTitle className="text-base font-semibold text-white text-left">New message</SheetTitle>
          </SheetHeader>
          <div className="p-4">
            <div className="flex items-center gap-2 rounded-full px-4 py-2.5" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Search className="h-4 w-4" style={{ color: "rgba(255,255,255,0.5)" }} />
              <input
                autoFocus
                value={composerQuery}
                onChange={(e) => setComposerQuery(e.target.value)}
                placeholder="Search by name or @username"
                className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/40"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {composerQuery.trim() && results.length === 0 && (
              <p className="text-sm text-white/50 text-center py-10">No results.</p>
            )}
            {results.map((p) => (
              <button
                key={p.user_id}
                disabled={starting}
                onClick={() => startChat(p.user_id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left disabled:opacity-50 hover:bg-white/[0.03]"
              >
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                ) : (
                  <AuraAvatar gradient={gradientFor(p.username)} size="md" initials={initialsOf(p.display_name || p.username)} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm flex items-center gap-1 truncate text-white">
                    {p.display_name || p.username}
                    {p.verification_kind && <VerificationBadge kind={p.verification_kind as any} />}
                  </p>
                  <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.5)" }}>@{p.username}</p>
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

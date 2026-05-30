import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, PenSquare, X, ChevronLeft, MessageCircle } from "lucide-react";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import { EmptyState } from "@/components/empty/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { gradientFor, initialsOf, timeAgo } from "@/lib/format";
import { toast } from "sonner";

type Conv = {
  id: string;
  last_message_at: string;
  other: { user_id: string; username: string; display_name: string; avatar_url: string | null; verification_kind?: string | null } | null;
  last: string | null;
};

type ProfileRow = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  verification_kind: string | null;
};

const Messages = () => {
  const { user, profile: me } = useAuth();
  const nav = useNavigate();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
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
    if (!q) return convs;
    return convs.filter((c) =>
      (c.other?.username || "").toLowerCase().includes(q) ||
      (c.other?.display_name || "").toLowerCase().includes(q) ||
      (c.last || "").toLowerCase().includes(q)
    );
  }, [convs, query]);

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
      {/* IG-style messages header */}
      <header className="h-14 px-3 flex items-center justify-between gap-3 border-b border-border">
        <button onClick={() => nav(-1)} className="p-1" aria-label="Back">
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </button>
        <h1 className="text-base font-semibold truncate flex-1 text-center">{me?.username ?? "Messages"}</h1>
        <button onClick={() => setComposerOpen(true)} className="p-1" aria-label="New chat">
          <PenSquare className="h-6 w-6 text-foreground" strokeWidth={1.75} />
        </button>
      </header>

      <div className="px-3 pt-3">
        <div className="bg-muted rounded-lg flex items-center gap-2 px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
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
                  <p className="font-semibold truncate text-sm flex items-center gap-1">
                    {c.other?.display_name || c.other?.username || "Conversation"}
                    {c.other?.verification_kind && <VerificationBadge kind={c.other.verification_kind as any} />}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {c.last ?? "Tap to start chatting"} · {timeAgo(c.last_message_at)}
                  </p>
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

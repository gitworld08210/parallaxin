import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, PenSquare, X } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
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
  const { user } = useAuth();
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

  // search profiles when composer query changes
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
      <TopBar
        subtitle="Realtime"
        title="Messages"
        right={
          <button onClick={() => setComposerOpen(true)} className="glass h-11 w-11 rounded-full grid place-items-center" aria-label="New chat">
            <PenSquare className="h-5 w-5" />
          </button>
        }
      />
      <div className="px-5">
        <div className="glass rounded-full flex items-center gap-2 px-4 py-2.5 mb-4">
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

        {loading && <p className="text-sm text-muted-foreground text-center py-10">Loading…</p>}
        {!loading && convs.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <p className="text-sm text-muted-foreground">
              No conversations yet. Tap the pencil to start one.
            </p>
            <button onClick={() => setComposerOpen(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow">
              <PenSquare className="h-4 w-4" /> New chat
            </button>
          </div>
        )}
        {!loading && convs.length > 0 && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">No matches.</p>
        )}
        <div className="space-y-1">
          {filtered.map((c) => (
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
                <p className="font-semibold truncate text-sm flex items-center gap-1">
                  {c.other?.display_name || c.other?.username || "Conversation"}
                  {c.other?.verification_kind && <VerificationBadge kind={c.other.verification_kind as any} />}
                </p>
                <p className="text-xs text-muted-foreground truncate">{c.last ?? "Say hi ✦"}</p>
              </div>
              <span className="text-[10px] text-muted-foreground">{timeAgo(c.last_message_at)}</span>
            </Link>
          ))}
        </div>
      </div>

      <Sheet open={composerOpen} onOpenChange={setComposerOpen}>
        <SheetContent side="bottom" className="glass-strong border-border h-[80vh] rounded-t-3xl p-0 flex flex-col">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="font-display text-xl">New message</SheetTitle>
          </SheetHeader>
          <div className="p-4">
            <div className="glass rounded-full flex items-center gap-2 px-4 py-2.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={composerQuery}
                onChange={(e) => setComposerQuery(e.target.value)}
                placeholder="Search creators by name or @username"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-6">
            {composerQuery.trim() && results.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">No creators found.</p>
            )}
            {results.map((p) => (
              <button
                key={p.user_id}
                disabled={starting}
                onClick={() => startChat(p.user_id)}
                className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-muted/40 transition-colors text-left disabled:opacity-50"
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

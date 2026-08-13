import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, SquarePen, X, MessageCircle, Archive, Users, Pin, Check, CheckCheck, Camera, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import { EmptyState } from "@/components/empty/EmptyState";
import { collection, query as firestoreQuery, where, orderBy, limit, onSnapshot, getDocs, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { useAuth } from "@/contexts/AuthProvider";
import { gradientFor, initialsOf } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { NewGroupSheet } from "@/components/dm/NewGroupSheet";

const RED = "hsl(var(--wa-green))"; // WhatsApp green accent

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
  last_sender_id: string | null;
  last_read: boolean;
  unread: number;
  online?: boolean;
};

type ProfileRow = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  verification_kind: string | null;
};

type Tab = "all" | "unread" | "groups" | "requests";

const Messages = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);
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
    
    // In Firestore, we should have a 'conversations' collection where each doc has a 'member_ids' array.
    const q = firestoreQuery(
      collection(db, "conversations"),
      where("member_ids", "array-contains", user.id),
      orderBy("last_message_at", "desc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setConvs(snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          last_message_at: d.last_message_at?.toDate()?.toISOString() || new Date().toISOString(),
          is_group: !!d.is_group,
          title: d.title || null,
          avatar_url: d.avatar_url || null,
          members: d.members || [], // Hydrated members list or fetch separately if needed
          last: d.last_message_text || null,
          last_sender_id: d.last_sender_id || null,
          last_read: !!d.last_read,
          unread: d.unread_counts?.[user.id] || 0,
        };
      }));
      setLoading(false);
    });

    return () => unsubscribe();
  };

  useEffect(() => {
    let unsub: (() => void) | undefined;
    load().then(u => unsub = u);
    return () => unsub?.();
  }, [user?.id]);

  useEffect(() => {
    const q = composerQuery.trim();
    if (!q) { setResults([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const profQ = firestoreQuery(
          collection(db, "profiles"),
          where("username", ">=", q.toLowerCase()),
          where("username", "<=", q.toLowerCase() + "\uf8ff"),
          limit(12)
        );
        const snap = await getDocs(profQ);
        if (!cancelled) setResults(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any);
      } catch (e) {
        console.warn("Firestore search failed", e);
      }
    }, 220);
    return () => { cancelled = true; clearTimeout(t); };
  }, [composerQuery, user?.id]);

  const filtered = useMemo(() => {
    const qStr = query.trim().toLowerCase();
    let base = convs;
    if (tab === "unread") base = base.filter((c) => c.unread > 0);
    else if (tab === "groups") base = base.filter((c) => c.is_group);
    else if (tab === "requests") base = base.filter((c) => !c.last);
    if (!qStr) return base;
    return base.filter((c) => {
      const other = c.members[0];
      const name = c.is_group ? (c.title || "Group") : (other?.display_name || other?.username || "");
      return name.toLowerCase().includes(qStr) || (c.last || "").toLowerCase().includes(qStr);
    });
  }, [convs, query, tab]);

  const recents = useMemo(() => convs.slice(0, 8), [convs]);
  const unreadCount = useMemo(() => convs.filter((c) => c.unread > 0).length, [convs]);
  const groupsCount = useMemo(() => convs.filter((c) => c.is_group).length, [convs]);
  const requestsCount = useMemo(() => convs.filter((c) => !c.last).length, [convs]);

  const startChat = async (otherId: string) => {
    if (!user) return;
    setStarting(true);
    try {
      // Check if conversation already exists in Firestore
      const q = firestoreQuery(
        collection(db, "conversations"),
        where("is_group", "==", false),
        where("member_ids", "array-contains", user.id)
      );
      const snap = await getDocs(q);
      const existing = snap.docs.find(doc => (doc.data() as any).member_ids.includes(otherId));
      
      if (existing) {
        setComposerOpen(false);
        setComposerQuery("");
        nav(`/messages/${existing.id}`);
        return;
      }

      // Create new DM
      const docRef = await addDoc(collection(db, "conversations"), {
        member_ids: [user.uid, otherId],
        is_group: false,
        created_at: serverTimestamp(),
        last_message_at: serverTimestamp(),
        members: [] 
      });
      
      setComposerOpen(false);
      setComposerQuery("");
      nav(`/messages/${docRef.id}`);
    } catch (e: any) { toast.error(e.message || "Action failed"); } finally {
      setStarting(false);
    }
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "all", label: "All", count: 0 },
    { id: "unread", label: "Unread", count: unreadCount },
    { id: "groups", label: "Groups", count: groupsCount },
    { id: "requests", label: "Requests", count: requestsCount },
  ];

  return (
    <div style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }} className="min-h-screen">
      {/* Sticky Telegram-style header */}
      <header
        className="sticky top-0 z-20 px-5 pt-4 pb-3 backdrop-blur-xl"
        style={{ background: "hsl(var(--background) / 0.85)", borderBottom: "1px solid hsl(var(--border))" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">Chats</h1>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setGroupOpen(true)}
              className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted/40"
              aria-label="New group"
            >
              <Users className="h-[19px] w-[19px] text-foreground/80" />
            </button>
            <button
              onClick={() => setComposerOpen(true)}
              className="h-9 w-9 grid place-items-center rounded-full transition-transform active:scale-95"
              style={{ background: RED, boxShadow: "0 8px 24px hsl(var(--wa-green) / 0.4)" }}
              aria-label="New chat"
            >
              <SquarePen className="h-[17px] w-[17px] text-foreground" strokeWidth={2.25} />
            </button>
          </div>
        </div>

        {/* Search pill */}
        <div
          className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5"
          style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))" }}
        >
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats and messages"
            className="flex-1 bg-transparent outline-none text-[14px] text-foreground placeholder:text-muted-foreground"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 mt-3 -mx-1 overflow-x-auto scrollbar-hide">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "shrink-0 px-3.5 h-8 rounded-full text-[12.5px] font-semibold inline-flex items-center gap-1.5 transition-all",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
                style={{
                  background: active ? RED : "hsl(var(--secondary))",
                  border: active ? `1px solid ${RED}` : "1px solid hsl(var(--border))",
                }}
              >
                {t.label}
                {t.count > 0 && (
                  <span
                    className="min-w-[18px] h-[18px] px-1 rounded-full grid place-items-center text-[10px] font-bold"
                    style={{ background: active ? "hsl(var(--foreground) / 0.25)" : RED, color: "hsl(var(--foreground))" }}
                  >
                    {t.count > 99 ? "99+" : t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Recent (Telegram "People" strip) */}
      {!loading && recents.length > 0 && (
        <div className="pt-3 pb-1 border-b" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="px-4 flex items-center gap-4 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setComposerOpen(true)}
              className="shrink-0 flex flex-col items-center gap-1.5 w-16"
            >
              <div
                className="h-14 w-14 rounded-full grid place-items-center"
                style={{ background: "hsl(var(--secondary))", border: "1.5px dashed hsl(var(--border))" }}
              >
                <SquarePen className="h-5 w-5 text-foreground/70" />
              </div>
              <span className="text-[11px] text-muted-foreground truncate w-full text-center">New</span>
            </button>
            {recents.map((c) => {
              const other = c.members[0];
              const name = c.is_group ? (c.title || "Group") : (other?.display_name || other?.username || "?");
              const avatarUrl = c.is_group ? c.avatar_url : other?.avatar_url;
              const handleSeed = c.is_group ? (c.title || c.id) : other?.username;
              return (
                <Link to={`/messages/${c.id}`} key={c.id} className="shrink-0 flex flex-col items-center gap-1.5 w-16">
                  <div className="relative">
                    <div
                      className="rounded-full p-[2px]"
                      style={c.unread > 0 ? { background: "conic-gradient(from 210deg, hsl(var(--wa-green)), hsl(158 55% 55%), hsl(var(--wa-green)))" } : { background: "transparent" }}
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} className="h-14 w-14 rounded-full object-cover" style={{ border: c.unread > 0 ? "2px solid hsl(var(--background))" : "none" }} />
                      ) : (
                        <div className="h-14 w-14 rounded-full overflow-hidden" style={{ border: c.unread > 0 ? "2px solid hsl(var(--background))" : "none" }}>
                          <AuraAvatar gradient={gradientFor(handleSeed)} size="md" initials={initialsOf(name)} />
                        </div>
                      )}
                    </div>
                    <span
                      className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full"
                      style={{ background: "#22c55e", border: "2px solid hsl(var(--background))" }}
                    />
                  </div>
                  <span className="text-[11px] text-foreground/80 truncate w-full text-center">{name.split(" ")[0]}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Chat list */}
      <div className="pt-1">
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
          {filtered.map((c, i) => {
            const unread = c.unread > 0;
            const other = c.members[0];
            const name = c.is_group ? (c.title || c.members.map((m) => m.display_name || m.username).slice(0, 3).join(", ") || "Group") : (other?.display_name || other?.username || "Conversation");
            const avatarUrl = c.is_group ? (c.avatar_url || other?.avatar_url || null) : (other?.avatar_url || null);
            const handleSeed = c.is_group ? (c.title || c.id) : (other?.username);
            const iSent = c.last_sender_id === user?.id;
            const pinned = i === 0 && !unread && !!c.last; // mock: top row shown as pinned when read
            return (
              <li key={c.id}>
                <motion.div
                  whileTap={{ scale: 0.995 }}
                  className="relative"
                >
                  <Link
                    to={`/messages/${c.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors"
                    style={{ background: unread ? "rgba(229,9,20,0.035)" : "transparent" }}
                  >
                    <div className="relative shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="h-[54px] w-[54px] rounded-full object-cover" />
                      ) : (
                        <div className="h-[54px] w-[54px] rounded-full overflow-hidden">
                          <AuraAvatar gradient={gradientFor(handleSeed)} size="lg" initials={initialsOf(name)} />
                        </div>
                      )}
                      {c.is_group ? (
                        <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 grid place-items-center rounded-full" style={{ background: "hsl(var(--background))" }}>
                          <span className="h-4 w-4 rounded-full grid place-items-center" style={{ background: RED }}>
                            <Users className="h-2.5 w-2.5 text-foreground" />
                          </span>
                        </span>
                      ) : (
                        <span
                          className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full"
                          style={{ background: "#22c55e", border: "2px solid hsl(var(--background))" }}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-[15.5px] font-semibold text-foreground">{name}</p>
                        {!c.is_group && other?.verification_kind && <VerificationBadge kind={other.verification_kind as any} />}
                        <div className="ml-auto flex items-center gap-1 shrink-0">
                          {pinned && <Pin className="h-3 w-3 text-muted-foreground rotate-45" />}
                          <span className="text-[11.5px]" style={{ color: unread ? RED : "hsl(var(--muted-foreground))" }}>
                            {chatTime(c.last_message_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {iSent && c.last && (
                          c.last_read ? (
                            <CheckCheck className="h-3.5 w-3.5 shrink-0" style={{ color: "#60a5fa" }} />
                          ) : (
                            <Check className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          )
                        )}
                        <p
                          className="text-[13.5px] truncate flex-1"
                          style={{ color: unread ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
                        >
                          {c.last ?? "Tap to start chatting"}
                        </p>
                        {unread && (
                          <span
                            className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full text-[11px] font-bold text-foreground"
                            style={{ background: RED, boxShadow: "0 4px 12px hsl(var(--wa-green) / 0.4)" }}
                          >
                            {c.unread > 99 ? "99+" : c.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              </li>
            );
          })}
        </ul>

        {!loading && convs.length > 0 && (
          <button
            className="w-full flex items-center gap-3 px-4 py-4 mt-1 hover:bg-muted/30"
            style={{ borderTop: "1px solid hsl(var(--border))" }}
            onClick={() => toast.info("Archive coming soon")}
          >
            <div className="h-11 w-11 rounded-full grid place-items-center shrink-0" style={{ background: "hsl(var(--secondary))" }}>
              <Archive className="h-[18px] w-[18px] text-foreground/70" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[14.5px] font-semibold text-foreground">Archived</p>
              <p className="text-[12px] text-muted-foreground">Hidden chats you've saved</p>
            </div>
          </button>
        )}
      </div>

      {/* New chat sheet */}
      <Sheet open={composerOpen} onOpenChange={setComposerOpen}>
        <SheetContent
          side="bottom"
          className="border-t h-[80vh] rounded-t-3xl p-0 flex flex-col"
          style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
        >
          <SheetHeader className="px-5 py-4" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
            <SheetTitle className="text-base font-semibold text-foreground text-left">New message</SheetTitle>
          </SheetHeader>
          <div className="p-4">
            <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5" style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))" }}>
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={composerQuery}
                onChange={(e) => setComposerQuery(e.target.value)}
                placeholder="Search by name or @username"
                className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
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
                className="w-full flex items-center gap-3 px-4 py-3 text-left disabled:opacity-50 hover:bg-muted/30"
              >
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                ) : (
                  <AuraAvatar gradient={gradientFor(p.username)} size="md" initials={initialsOf(p.display_name || p.username)} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm flex items-center gap-1 truncate text-foreground">
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

      <NewGroupSheet open={groupOpen} onOpenChange={setGroupOpen} />
    </div>
  );
};

export default Messages;

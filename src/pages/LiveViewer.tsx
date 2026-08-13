import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Room, RoomEvent, RemoteTrack, Track } from "livekit-client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { ArrowLeft, Heart, Send, Users, Ticket, Crown, Gift, Lock } from "lucide-react";

type ChatRow = { id: string; user_id: string; body: string; created_at: string };
type Stream = {
  id: string; host_id: string; livekit_room: string; title: string | null;
  status: string; access_type: "free" | "ticket" | "subscribers_only";
  ticket_price_coins: number; allow_gifts: boolean; total_tips_coins: number;
};
type GiftDef = { id: string; name: string; icon: string; cost_coins: number };
type GiftEvent = { id: string; gift_id: string; coins_total: number; sender_id: string; };

export default function LiveViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [stream, setStream] = useState<Stream | null>(null);
  const [chat, setChat] = useState<ChatRow[]>([]);
  const [text, setText] = useState("");
  const [hearts, setHearts] = useState<{ id: number }[]>([]);
  const [gifts, setGifts] = useState<GiftEvent[]>([]);
  const [flying, setFlying] = useState<{ key: number; icon: string }[]>([]);
  const [ended, setEnded] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [access, setAccess] = useState<"loading" | "granted" | "needs_ticket" | "needs_sub">("loading");
  const [catalog, setCatalog] = useState<GiftDef[]>([]);
  const [giftSheet, setGiftSheet] = useState(false);
  const [buying, setBuying] = useState(false);
  const [tips, setTips] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("gift_catalog" as any).select("*");
      setCatalog((data ?? []) as GiftDef[]);
    })();
  }, []);

  // Load stream + evaluate access
  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase.from("live_streams" as any).select("*").eq("id", id).maybeSingle();
      if (error || !data) { toast.error("Stream not found"); navigate(-1); return; }
      const s = data as any as Stream;
      setStream(s);
      setTips(Number(s.total_tips_coins ?? 0));
      if (s.status === "ended") { setEnded(true); return; }

      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      setMe(uid ?? null);
      if (uid && s.host_id === uid) { setAccess("granted"); return; }
      if (s.access_type === "free") { setAccess("granted"); return; }
      if (!uid) { setAccess(s.access_type === "ticket" ? "needs_ticket" : "needs_sub"); return; }

      if (s.access_type === "ticket") {
        const { data: t } = await supabase.from("live_tickets" as any).select("id").eq("stream_id", s.id).eq("user_id", uid).maybeSingle();
        setAccess(t ? "granted" : "needs_ticket");
      } else if (s.access_type === "subscribers_only") {
        const { data: sub } = await supabase.from("creator_subscriptions" as any).select("status").eq("subscriber_id", uid).eq("creator_id", s.host_id).maybeSingle();
        const active = sub && ["active", "trialing"].includes(String((sub as any).status));
        setAccess(active ? "granted" : "needs_sub");
      }
    })();
  }, [id, navigate]);

  // Connect livekit once access is granted
  useEffect(() => {
    if (!stream || access !== "granted" || ended) return;
    let mounted = true;
    (async () => {
      const { data, error: tErr } = await supabase.functions.invoke("livekit-token", {
        body: { room: stream.livekit_room, role: "viewer" },
      });
      if (tErr || !data?.token) { toast.error("Could not join"); return; }
      const room = new Room();
      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Video && videoRef.current) track.attach(videoRef.current);
        if (track.kind === Track.Kind.Audio && audioRef.current) track.attach(audioRef.current);
      });
      room.on(RoomEvent.Disconnected, () => mounted && setEnded(true));
      await room.connect(data.wsUrl, data.token);
      roomRef.current = room;

      const { data: history } = await supabase.from("live_chat" as any).select("*").eq("stream_id", stream.id).order("created_at", { ascending: true }).limit(100);
      if (history && mounted) setChat(history as unknown as ChatRow[]);

    })();
    return () => { mounted = false; roomRef.current?.disconnect(); roomRef.current = null; };
  }, [access, stream?.id, ended]);

  // Realtime: chat, reactions, gifts, stream status
  useEffect(() => {
    if (!id) return;
      supabase.channel(`live:${id}`).
on("postgres_changes", { event: "INSERT", schema: "public", table: "live_chat", filter: `stream_id=eq.${id}` },
        (p) => setChat((c) => [...c.slice(-50), p.new as ChatRow])).
on("postgres_changes", { event: "INSERT", schema: "public", table: "live_reactions", filter: `stream_id=eq.${id}` },
        () => setHearts((h) => [...h, { id: Date.now() + Math.random() }])).
on("postgres_changes", { event: "INSERT", schema: "public", table: "live_gifts", filter: `stream_id=eq.${id}` },
        (p) => {
          const g = p.new as GiftEvent;
          setGifts((arr) => [g, ...arr].slice(0, 8));
          setTips((t) => t + Number(g.coins_total || 0));
          const def = catalog.find((c) => c.id === g.gift_id);
          if (def) setFlying((f) => [...f, { key: Date.now() + Math.random(), icon: def.icon }]);
        }).
on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_streams", filter: `id=eq.${id}` },
        (p) => { if ((p.new as any).status === "ended") setEnded(true); }).
subscribe();
  }, [id, catalog]);

  useEffect(() => {
    if (hearts.length === 0) return;
    const t = setTimeout(() => setHearts((h) => h.slice(1)), 2500);
    return () => clearTimeout(t);
  }, [hearts]);
  useEffect(() => {
    if (!flying.length) return;
    const t = setTimeout(() => setFlying((f) => f.slice(1)), 2200);
    return () => clearTimeout(t);
  }, [flying]);

  const send = async () => {
    if (!text.trim() || !id || !me) return;
    const body = text.trim();
    setText("");
  };
  const sendHeart = async () => {
    if (!id || !me) return;
  };

  const buyTicket = async () => {
    if (!stream) return;
    setBuying(true);
    try {
      const { data, error } = await supabase.functions.invoke("buy-live-ticket", { body: { stream_id: stream.id } });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success("Unlocked ✦");
      setAccess("granted");
    } catch (e: any) {
      const msg = e.message || "Purchase failed";
      if (/insufficient/i.test(msg)) toast.error("Not enough coins — top up in Wallet");
      else toast.error(msg);
    } finally { setBuying(false); }
  };

  const sendGift = async (g: GiftDef) => {
    if (!stream) return;
    setGiftSheet(false);
    const { data, error } = await supabase.functions.invoke("send-live-gift", { body: { stream_id: stream.id, gift_id: g.id } });
    if (error || (data as any)?.error) {
      const msg = (data as any)?.error || error?.message || "Gift failed";
      if (/insufficient/i.test(msg)) toast.error("Not enough coins — top up in Wallet");
      else toast.error(msg);
      return;
    }
    setFlying((f) => [...f, { key: Date.now() + Math.random(), icon: g.icon }]);
  };

  if (ended) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <p className="text-xl">This live has ended</p>
        <Button onClick={() => navigate(-1)}>Back</Button>
      </div>
    );
  }

  if (access === "loading" || !stream) {
    return <div className="min-h-screen bg-black text-white grid place-items-center">Loading…</div>;
  }

  if (access !== "granted") {
    const isTicket = access === "needs_ticket";
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <div className="p-4">
          <button onClick={() => navigate(-1)} className="bg-white/10 rounded-full p-2"><ArrowLeft /></button>
        </div>
        <div className="flex-1 grid place-items-center px-6 text-center">
          <div className="max-w-sm">
            <div className="h-20 w-20 mx-auto rounded-full grid place-items-center bg-gradient-to-br from-red-500 to-rose-600 shadow-2xl">
              {isTicket ? <Ticket className="h-10 w-10" /> : <Crown className="h-10 w-10" />}
            </div>
            <h1 className="text-2xl font-bold mt-6">{isTicket ? "Paid Live" : "Subscribers only"}</h1>
            <p className="text-white/70 text-sm mt-2">
              {stream.title || "Exclusive broadcast"}
            </p>
            {isTicket ? (
              <>
                <div className="mt-6 bg-white/10 rounded-2xl px-5 py-4 flex items-center justify-between">
                  <span className="text-sm text-white/70">Ticket price</span>
                  <span className="text-2xl font-black">🪙 {stream.ticket_price_coins}</span>
                </div>
                <Button onClick={buyTicket} disabled={buying || !me} className="w-full mt-4 h-12 text-base gap-2">
                  <Lock className="h-4 w-4" /> {buying ? "Unlocking…" : `Unlock live for ${stream.ticket_price_coins} coins`}
                </Button>
                <Link to="/wallet?buy=1" className="block mt-3 text-xs text-white/60 underline">Top up coins</Link>
              </>
            ) : (
              <>
                <p className="mt-6 text-sm text-white/60">Subscribe to this creator to join their exclusive lives.</p>
                <Link to="/wallet" className="block mt-4">
                  <Button className="w-full h-12">Subscribe</Button>
                </Link>
              </>
            )}
            {!me && <Link to="/auth" className="block mt-4 text-sm text-white/70 underline">Sign in first</Link>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col">
      <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
      <audio ref={audioRef} autoPlay />
      <div className="relative z-10 flex items-center justify-between p-4">
        <button onClick={() => navigate(-1)} className="bg-black/50 rounded-full p-2"><ArrowLeft /></button>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 bg-red-600 rounded-full text-xs font-bold">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> LIVE
          </div>
          {tips > 0 && (
            <div className="flex items-center gap-1 bg-yellow-500/90 text-black px-3 py-1 rounded-full text-xs font-bold">
              <Gift className="w-3.5 h-3.5" /> {tips}
            </div>
          )}
        </div>
        <div />
      </div>

      {gifts.length > 0 && (
        <div className="relative z-10 px-4 flex gap-2 overflow-x-auto pb-2">
          {gifts.map((g) => {
            const def = catalog.find((c) => c.id === g.gift_id);
            return (
              <div key={g.id} className="shrink-0 bg-black/50 backdrop-blur rounded-full pl-1 pr-3 py-1 text-xs flex items-center gap-1">
                <span className="text-lg">{def?.icon ?? "🎁"}</span>
                <span className="font-bold text-yellow-400">+{g.coins_total}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex-1" />
      <div className="relative z-10 p-3 space-y-1 max-h-56 overflow-y-auto">
        {chat.map((m) => (
          <div key={m.id} className="text-sm bg-black/40 rounded-2xl px-3 py-1 inline-block max-w-[80%]">{m.body}</div>
        ))}
      </div>
      <div className="relative z-10 flex items-center gap-2 p-3 bg-gradient-to-t from-black/80 to-transparent">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Say something…"
          className="bg-white/10 border-white/20 rounded-full text-white placeholder:text-white/60"
        />
        <button onClick={send} className="bg-white/10 rounded-full p-3"><Send className="w-5 h-5" /></button>
        <button onClick={sendHeart} className="bg-white/10 rounded-full p-3"><Heart className="w-5 h-5 text-red-500 fill-red-500" /></button>
        {stream.allow_gifts && me && me !== stream.host_id && (
          <button onClick={() => setGiftSheet(true)} className="bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full p-3">
            <Gift className="w-5 h-5 text-black" />
          </button>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-20">
        {hearts.map((h) => (
          <Heart key={h.id} className="absolute right-8 text-red-500 fill-red-500 animate-[float_2.5s_ease-out_forwards]" />
        ))}
        {flying.map((f) => (
          <span key={f.key} className="absolute text-4xl animate-[float_2.2s_ease-out_forwards]"
            style={{ left: `${20 + Math.random() * 60}%` }}>
            {f.icon}
          </span>
        ))}
      </div>

      <Sheet open={giftSheet} onOpenChange={setGiftSheet}>
        <SheetContent side="bottom" className="bg-neutral-950 text-white border-t border-white/10 rounded-t-3xl max-w-md mx-auto">
          <SheetHeader>
            <SheetTitle className="text-white text-left flex items-center gap-2">
              <Gift className="h-5 w-5 text-yellow-400" /> Send a gift
            </SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-4 gap-2 mt-4 pb-2">
            {catalog.map((g) => (
              <button key={g.id} onClick={() => sendGift(g)}
                className="rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 p-3 flex flex-col items-center gap-1 active:scale-95 transition">
                <span className="text-3xl">{g.icon}</span>
                <span className="text-[10px] text-white/70">{g.name}</span>
                <span className="text-xs font-bold text-yellow-400">🪙 {g.cost_coins}</span>
              </button>
            ))}
          </div>
          <Link to="/wallet?buy=1" className="block text-center text-xs text-white/60 underline mt-2">Top up coins</Link>
        </SheetContent>
      </Sheet>
    </div>
  );
}

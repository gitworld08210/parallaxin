import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Room, createLocalTracks, Track } from "livekit-client";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Radio, Heart, Users, Globe, Ticket, Crown, Gift } from "lucide-react";

type ChatRow = { id: string; user_id: string; body: string; created_at: string };
type GiftRow = { id: string; gift_id: string; coins_total: number; sender_id: string };

type Access = "free" | "ticket" | "subscribers_only";

export default function LiveHost() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [title, setTitle] = useState("");
  const [access, setAccess] = useState<Access>("free");
  const [price, setPrice] = useState<number>(50);
  const [allowGifts, setAllowGifts] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatRow[]>([]);
  const [hearts, setHearts] = useState<{ id: number }[]>([]);
  const [tips, setTips] = useState(0);
  const [recentGifts, setRecentGifts] = useState<GiftRow[]>([]);
  const [viewers, setViewers] = useState(0);
  const [catalog, setCatalog] = useState<Record<string, { icon: string; name: string }>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("live_gifts_catalog").select("id, icon, name");
      const map: Record<string, { icon: string; name: string }> = {};
      (data ?? []).forEach((g: any) => { map[g.id] = { icon: g.icon, name: g.name }; });
      setCatalog(map);
    })();
  }, []);

  const goLive = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;
      const roomName = `live_${user.id}_${Date.now()}`;
      const { data: stream, error: insErr } = await supabase
        .from("live_streams")
        .insert({
          host_id: user.id,
          title: title || null,
          livekit_room: roomName,
          access_type: access as any,
          ticket_price_coins: access === "ticket" ? Math.max(1, price) : 0,
          allow_gifts: allowGifts,
        } as any)
        .select()
        .single();
      if (insErr) throw insErr;
      setStreamId(stream.id);
      setTips((stream as any).total_tips_coins ?? 0);

      const { data, error } = await supabase.functions.invoke("livekit-token", {
        body: { room: roomName, role: "host" },
      });
      if (error || !data?.token) throw new Error(data?.error || error?.message || "token failed");

      const room = new Room({ adaptiveStream: true, dynacast: true });
      await room.connect(data.wsUrl, data.token);
      roomRef.current = room;

      const tracks = await createLocalTracks({ audio: true, video: { facingMode: "user" } });
      for (const t of tracks) {
        await room.localParticipant.publishTrack(t);
        if (t.kind === Track.Kind.Video && videoRef.current) t.attach(videoRef.current);
      }
      room.on("participantConnected", () => setViewers(room.numParticipants - 1));
      room.on("participantDisconnected", () => setViewers(room.numParticipants - 1));
      setStreaming(true);
      toast.success("You're live!");
    } catch (e: any) {
      toast.error(e.message || "Could not go live");
    }
  };

  const endLive = async () => {
    try {
      roomRef.current?.disconnect();
      roomRef.current = null;
      if (streamId) {
        await supabase
          .from("live_streams")
          .update({ status: "ended", ended_at: new Date().toISOString() })
          .eq("id", streamId);
      }
    } finally {
      navigate(-1);
    }
  };

  useEffect(() => {
    if (!streamId) return;
    const ch = supabase
      .channel(`live:${streamId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_chat", filter: `stream_id=eq.${streamId}` },
        (p) => setChat((c) => [...c.slice(-50), p.new as ChatRow]))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_reactions", filter: `stream_id=eq.${streamId}` },
        () => setHearts((h) => [...h, { id: Date.now() + Math.random() }]))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_gifts", filter: `stream_id=eq.${streamId}` },
        (p) => {
          const g = p.new as GiftRow;
          setTips((t) => t + Number(g.coins_total || 0));
          setRecentGifts((arr) => [g, ...arr].slice(0, 6));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [streamId]);

  useEffect(() => {
    if (hearts.length === 0) return;
    const t = setTimeout(() => setHearts((h) => h.slice(1)), 2500);
    return () => clearTimeout(t);
  }, [hearts]);

  useEffect(() => () => { roomRef.current?.disconnect(); }, []);

  if (!streaming) {
    return (
      <div className="min-h-screen bg-background p-5 flex flex-col gap-5 pb-40">
        <button onClick={() => navigate(-1)} className="self-start h-10 w-10 grid place-items-center rounded-full bg-muted">
          <ArrowLeft />
        </button>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Broadcast</p>
          <h1 className="text-3xl font-bold mt-1">Go Live</h1>
          <p className="text-sm text-muted-foreground mt-1">Free, ticketed, or subscriber-only. Viewers can send gifts if enabled.</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase">Title (optional)</label>
          <Input placeholder="What's this live about?" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Who can join?</p>
          <div className="space-y-2">
            <AccessRow active={access === "free"} onPick={() => setAccess("free")} icon={Globe} label="Free" desc="Anyone can watch" />
            <AccessRow active={access === "ticket"} onPick={() => setAccess("ticket")} icon={Ticket} label="Paid entry" desc="Viewers unlock with coins" />
            <AccessRow active={access === "subscribers_only"} onPick={() => setAccess("subscribers_only")} icon={Crown} label="Subscribers only" desc="Only your premium subscribers" />
          </div>
          {access === "ticket" && (
            <div className="mt-3 flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2">
              <span className="text-sm font-semibold">Price</span>
              <input
                type="number" min={1} value={price}
                onChange={(e) => setPrice(Math.max(1, Number(e.target.value) || 1))}
                className="flex-1 bg-transparent outline-none text-right text-sm font-bold"
              />
              <span className="text-xs text-muted-foreground">coins</span>
            </div>
          )}
        </div>

        <label className="flex items-center justify-between bg-card border border-border rounded-xl p-3">
          <span className="flex items-center gap-2 text-sm font-semibold"><Gift className="h-4 w-4 text-primary" /> Allow gifts</span>
          <input type="checkbox" checked={allowGifts} onChange={(e) => setAllowGifts(e.target.checked)} className="h-5 w-5 accent-primary" />
        </label>

        <Button onClick={goLive} size="lg" className="gap-2 mt-2">
          <Radio className="w-5 h-5" /> Start broadcast
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col">
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
      <div className="relative z-10 flex items-center justify-between p-4">
        <div className="flex items-center gap-2 px-3 py-1 bg-red-600 rounded-full text-xs font-bold">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> LIVE
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-black/50 px-3 py-1 rounded-full text-sm">
            <Users className="w-4 h-4" /> {viewers}
          </div>
          <div className="flex items-center gap-1 bg-yellow-500/90 text-black px-3 py-1 rounded-full text-sm font-bold">
            <Gift className="w-4 h-4" /> {tips}
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={endLive}>End</Button>
      </div>
      <div className="flex-1" />
      <div className="relative z-10 px-4 pb-2 flex gap-2 overflow-x-auto">
        {recentGifts.map((g) => (
          <div key={g.id} className="shrink-0 bg-black/50 backdrop-blur rounded-full pl-1 pr-3 py-1 text-xs flex items-center gap-1">
            <span className="text-lg">{catalog[g.gift_id]?.icon ?? "🎁"}</span>
            <span className="font-bold text-yellow-400">+{g.coins_total}</span>
          </div>
        ))}
      </div>
      <div className="relative z-10 p-4 space-y-1 max-h-60 overflow-y-auto">
        {chat.map((m) => (
          <div key={m.id} className="text-sm bg-black/40 rounded-2xl px-3 py-1 inline-block max-w-[80%]">{m.body}</div>
        ))}
      </div>
      <div className="pointer-events-none absolute bottom-20 right-6">
        {hearts.map((h) => (
          <Heart key={h.id} className="absolute right-0 text-red-500 fill-red-500 animate-[float_2.5s_ease-out_forwards]" />
        ))}
      </div>
    </div>
  );
}

const AccessRow = ({ active, onPick, icon: Icon, label, desc }: any) => (
  <button onClick={onPick} className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition ${active ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
    <div className={`h-10 w-10 rounded-full grid place-items-center ${active ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
      <Icon className="h-5 w-5" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
    <span className={`h-5 w-5 rounded-full border-2 ${active ? "bg-primary border-primary" : "border-border"}`} />
  </button>
);

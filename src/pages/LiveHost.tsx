import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Room, createLocalTracks, Track, LocalVideoTrack, LocalAudioTrack } from "livekit-client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Radio, Heart, Users, Globe, Ticket, Crown, Gift, RotateCcw } from "lucide-react";

type ChatRow = { id: string; user_id: string; body: string; created_at: string };
type GiftRow = { id: string; gift_id: string; coins_total: number; sender_id: string };
type Access = "free" | "ticket" | "subscribers_only";

export default function LiveHost() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const videoTrackRef = useRef<LocalVideoTrack | null>(null);
  const audioTrackRef = useRef<LocalAudioTrack | null>(null);

  const [title, setTitle] = useState("");
  const [access, setAccess] = useState<Access>("free");
  const [price, setPrice] = useState<number>(50);
  const [allowGifts, setAllowGifts] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatRow[]>([]);
  const [hearts, setHearts] = useState<{ id: number }[]>([]);
  const [tips, setTips] = useState(0);
  const [recentGifts, setRecentGifts] = useState<GiftRow[]>([]);
  const [viewers, setViewers] = useState(0);
  const [catalog, setCatalog] = useState<Record<string, { icon: string; name: string }>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("gifts").select("id, icon, name");
      const map: Record<string, { icon: string; name: string }> = {};
      (data ?? []).forEach((g: any) => { map[g.id] = { icon: g.icon, name: g.name }; });
      setCatalog(map);
    })();
  }, []);

  // Attach the local video track to the <video> element whenever both are ready.
  // This fixes the black-screen bug where attach() ran before the element mounted.
  useEffect(() => {
    if (!streaming) return;
    const attach = () => {
      const el = videoRef.current;
      const track = videoTrackRef.current;
      if (el && track) {
        track.attach(el);
        el.play().catch(() => { /* autoplay policies */ });
        setCameraReady(true);
      }
    };
    attach();
    // Retry once after the browser paints, in case the ref was null on first tick.
    const raf = requestAnimationFrame(attach);
    return () => cancelAnimationFrame(raf);
  }, [streaming]);

  const stopLocalTracks = () => {
    try { videoTrackRef.current?.detach(); videoTrackRef.current?.stop(); } catch { /* noop */ }
    try { audioTrackRef.current?.stop(); } catch { /* noop */ }
    videoTrackRef.current = null;
    audioTrackRef.current = null;
  };

  const retryCamera = async () => {
    stopLocalTracks();
    setCameraReady(false);
    try {
      const tracks = await createLocalTracks({ audio: true, video: true });
      for (const t of tracks) {
        if (t.kind === Track.Kind.Video) videoTrackRef.current = t as LocalVideoTrack;
        if (t.kind === Track.Kind.Audio) audioTrackRef.current = t as LocalAudioTrack;
        if (roomRef.current) await roomRef.current.localParticipant.publishTrack(t);
      }
      const el = videoRef.current;
      if (el && videoTrackRef.current) {
        videoTrackRef.current.attach(el);
        setCameraReady(true);
      }
    } catch (e: any) { toast.error(e.message || "Action failed"); }
  };

  const goLive = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) { toast.error("Please sign in"); return; }

      // 1) Request camera/mic first — surface permission errors early
      let tracks: Awaited<ReturnType<typeof createLocalTracks>> = [];
      try {
        tracks = await createLocalTracks({ audio: true, video: true });
      } catch (permErr: any) {
        const msg = permErr?.name === "NotAllowedError"
          ? "Camera & microphone access denied. Enable it in your browser settings."
          : permErr?.name === "NotFoundError"
          ? "No camera or microphone found on this device."
          : permErr?.message || "Could not access camera";
        toast.error(msg);
        return;
      }
      for (const t of tracks) {
        if (t.kind === Track.Kind.Video) videoTrackRef.current = t as LocalVideoTrack;
        if (t.kind === Track.Kind.Audio) audioTrackRef.current = t as LocalAudioTrack;
      }

      // 2) Create the stream record
      const roomName = `live_${user.id}_${Date.now()}`;
      const { data: stream, error: insErr } = await supabase.from("live_streams").insert({
          host_id: user.id,
          title: title || null,
          livekit_room: roomName,
          access_type: access as any,
          ticket_price_coins: access === "ticket" ? Math.max(1, price) : 0,
          allow_gifts: allowGifts,
        } as any).select().single();
      if (insErr) throw insErr;
      setStreamId((stream as any).id);
      setTips((stream as any).total_tips_coins ?? 0);

      // 3) Get LiveKit token & connect
      const { data, error } = await supabase.functions.invoke("livekit-token", {
        body: { room: roomName, role: "host" },
      });

      if (error || !data?.token) throw new Error(data?.error || error?.message || "token failed");

      const room = new Room({ adaptiveStream: true, dynacast: true });
      await room.connect(data.wsUrl, data.token);
      roomRef.current = room;

      for (const t of tracks) {
        await room.localParticipant.publishTrack(t);
      }
      room.on("participantConnected", () => setViewers(Math.max(0, room.numParticipants - 1)));
      room.on("participantDisconnected", () => setViewers(Math.max(0, room.numParticipants - 1)));

      // 4) Flip UI on — the useEffect above will attach the video track once the element mounts
      setStreaming(true);
      toast.success("You're live!");
    } catch (e: any) {
      stopLocalTracks();
      toast.error(e?.message || "Could not go live");
    } finally {
      setStarting(false);
    }
  };

  const endLive = async () => {
    try {
      stopLocalTracks();
      roomRef.current?.disconnect();
      roomRef.current = null;
      if (streamId) {
          supabase.from("live_streams").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", streamId);
      }
    } finally {
      navigate(-1);
    }
  };

  useEffect(() => {
    if (!streamId) return;
      supabase.channel(`live:${streamId}`).
on("postgres_changes", { event: "INSERT", schema: "public", table: "live_chat", filter: `stream_id=eq.${streamId}` },
        (p) => setChat((c) => [...c.slice(-50), p.new as ChatRow])).
on("postgres_changes", { event: "INSERT", schema: "public", table: "live_reactions", filter: `stream_id=eq.${streamId}` },
        () => setHearts((h) => [...h, { id: Date.now() + Math.random() }])).
on("postgres_changes", { event: "INSERT", schema: "public", table: "live_gifts", filter: `stream_id=eq.${streamId}` },
        (p) => {
          const g = p.new as GiftRow;
          setTips((t) => t + Number(g.coins_total || 0));
          setRecentGifts((arr) => [g, ...arr].slice(0, 6));
        }).
subscribe();
  }, [streamId]);

  useEffect(() => {
    if (hearts.length === 0) return;
    const t = setTimeout(() => setHearts((h) => h.slice(1)), 2500);
    return () => clearTimeout(t);
  }, [hearts]);

  useEffect(() => () => {
    stopLocalTracks();
    roomRef.current?.disconnect();
  }, []);

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

        <Button onClick={goLive} size="lg" disabled={starting} className="gap-2 mt-2">
          <Radio className="w-5 h-5" /> {starting ? "Starting…" : "Start broadcast"}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col">
      {/* Mirrored local preview — like a selfie camera */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: "scaleX(-1)" }}
      />
      {!cameraReady && (
        <div className="absolute inset-0 grid place-items-center bg-black/70 z-20 pointer-events-auto">
          <div className="flex flex-col items-center gap-3 text-center px-6">
            <div className="h-14 w-14 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            <p className="text-sm font-medium">Starting camera…</p>
            <button
              onClick={retryCamera}
              className="mt-2 inline-flex items-center gap-1.5 text-xs bg-white/15 hover:bg-white/25 rounded-full px-3 py-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        </div>
      )}
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

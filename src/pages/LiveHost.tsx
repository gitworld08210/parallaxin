import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Room, createLocalTracks, Track } from "livekit-client";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Radio, Send, Heart, Users } from "lucide-react";

type ChatRow = { id: string; user_id: string; body: string; created_at: string };

export default function LiveHost() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [title, setTitle] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatRow[]>([]);
  const [hearts, setHearts] = useState<{ id: number }[]>([]);
  const [viewers, setViewers] = useState(0);

  const goLive = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;
      const roomName = `live_${user.id}_${Date.now()}`;
      const { data: stream, error: insErr } = await supabase
        .from("live_streams")
        .insert({ host_id: user.id, title: title || null, livekit_room: roomName })
        .select()
        .single();
      if (insErr) throw insErr;
      setStreamId(stream.id);

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
        if (t.kind === Track.Kind.Video && videoRef.current) {
          t.attach(videoRef.current);
        }
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

  // realtime chat + reactions
  useEffect(() => {
    if (!streamId) return;
    const ch = supabase
      .channel(`live:${streamId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_chat", filter: `stream_id=eq.${streamId}` },
        (p) => setChat((c) => [...c.slice(-50), p.new as ChatRow]))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_reactions", filter: `stream_id=eq.${streamId}` },
        () => setHearts((h) => [...h, { id: Date.now() + Math.random() }]))
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
      <div className="min-h-screen bg-background p-4 flex flex-col gap-4">
        <button onClick={() => navigate(-1)} className="self-start"><ArrowLeft /></button>
        <h1 className="text-2xl font-bold">Go Live</h1>
        <Input placeholder="Add a title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Button onClick={goLive} size="lg" className="gap-2">
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
        <div className="flex items-center gap-1 bg-black/50 px-3 py-1 rounded-full text-sm">
          <Users className="w-4 h-4" /> {viewers}
        </div>
        <Button variant="destructive" size="sm" onClick={endLive}>End</Button>
      </div>
      <div className="flex-1" />
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

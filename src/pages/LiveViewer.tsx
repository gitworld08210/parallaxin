import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Room, RoomEvent, RemoteTrack, Track } from "livekit-client";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Heart, Send, Users } from "lucide-react";

type ChatRow = { id: string; user_id: string; body: string; created_at: string };

export default function LiveViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [chat, setChat] = useState<ChatRow[]>([]);
  const [text, setText] = useState("");
  const [hearts, setHearts] = useState<{ id: number }[]>([]);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    (async () => {
      const { data: stream, error } = await supabase.from("live_streams").select("*").eq("id", id).single();
      if (error || !stream) { toast.error("Stream not found"); navigate(-1); return; }
      if (stream.status === "ended") { setEnded(true); return; }

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

      const { data: history } = await supabase.from("live_chat").select("*").eq("stream_id", id).order("created_at").limit(50);
      if (history) setChat(history as ChatRow[]);
    })();

    const ch = supabase
      .channel(`live:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_chat", filter: `stream_id=eq.${id}` },
        (p) => setChat((c) => [...c.slice(-50), p.new as ChatRow]))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_reactions", filter: `stream_id=eq.${id}` },
        () => setHearts((h) => [...h, { id: Date.now() + Math.random() }]))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_streams", filter: `id=eq.${id}` },
        (p) => { if ((p.new as any).status === "ended") setEnded(true); })
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(ch); roomRef.current?.disconnect(); };
  }, [id, navigate]);

  useEffect(() => {
    if (hearts.length === 0) return;
    const t = setTimeout(() => setHearts((h) => h.slice(1)), 2500);
    return () => clearTimeout(t);
  }, [hearts]);

  const send = async () => {
    if (!text.trim() || !id) return;
    const body = text.trim();
    setText("");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("live_chat").insert({ stream_id: id, user_id: u.user.id, body });
  };

  const sendHeart = async () => {
    if (!id) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("live_reactions").insert({ stream_id: id, user_id: u.user.id, emoji: "❤️" });
  };

  if (ended) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <p className="text-xl">This live has ended</p>
        <Button onClick={() => navigate(-1)}>Back</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col">
      <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
      <audio ref={audioRef} autoPlay />
      <div className="relative z-10 flex items-center justify-between p-4">
        <button onClick={() => navigate(-1)} className="bg-black/50 rounded-full p-2"><ArrowLeft /></button>
        <div className="flex items-center gap-2 px-3 py-1 bg-red-600 rounded-full text-xs font-bold">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> LIVE
        </div>
        <div />
      </div>
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
      </div>
      <div className="pointer-events-none absolute bottom-24 right-6">
        {hearts.map((h) => (
          <Heart key={h.id} className="absolute right-0 text-red-500 fill-red-500 animate-[float_2.5s_ease-out_forwards]" />
        ))}
      </div>
    </div>
  );
}

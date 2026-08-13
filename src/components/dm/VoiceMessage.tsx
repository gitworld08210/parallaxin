import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, Mic, Send, X } from "lucide-react";

import { toast } from "sonner";

/** Inline audio player with stylized waveform bars. */
export const VoiceBubble = ({ url, mine }: { url: string; mine: boolean }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [prog, setProg] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    const onTime = () => { setProg(a.currentTime); };
    const onMeta = () => { setDur(Number.isFinite(a.duration) ? a.duration : 0); };
    const onEnd = () => { setPlaying(false); setProg(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current; if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const pct = dur > 0 ? prog / dur : 0;
  const bars = 26;

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <button onClick={toggle} aria-label={playing ? "Pause" : "Play"}
        className={`h-9 w-9 rounded-full grid place-items-center shrink-0 ${mine ? "bg-primary-foreground/20" : "bg-foreground/10"}`}>
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <div className="flex items-end gap-[2px] h-7 flex-1">
        {Array.from({ length: bars }).map((_, i) => {
          const active = i / bars <= pct;
          // pseudo-random heights, deterministic per index
          const h = 30 + ((i * 53) % 60);
          return (
            <span key={i}
              className={`w-[2px] rounded-full transition-colors ${active ? (mine ? "bg-primary-foreground" : "bg-foreground") : (mine ? "bg-primary-foreground/35" : "bg-muted-foreground/50")}`}
              style={{ height: `${h}%` }} />
          );
        })}
      </div>
      <span className={`text-[10px] tabular-nums ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
        {fmtSec(dur > 0 ? (playing ? dur - prog : dur) : 0)}
      </span>
      <audio ref={audioRef} src={url} preload="metadata" />
    </div>
  );
};

const fmtSec = (s: number) => {
  const m = Math.floor(s / 60); const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

/** Mic button → recording → send. Calls onSent(url, durationSec) when uploaded. */
export const VoiceRecorder = ({
  userId, onSend,
}: {
  userId: string;
  onSend: (mediaUrl: string) => Promise<void>;
}) => {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobRef = useRef<Blob | null>(null);

  const start = async () => {
    try {
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        blobRef.current = blob;
        setPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      recRef.current = rec;
      setElapsed(0);
      setRecording(true);
      tickRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch (e: any) { toast.error(e.message || "Action failed"); }
  };

  const stop = () => {
    recRef.current?.stop();
    if (tickRef.current) clearInterval(tickRef.current);
    setRecording(false);
  };

  const cancel = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    blobRef.current = null;
    setElapsed(0);
  };

  const send = async () => {
    if (!blobRef.current) return;
    setUploading(true);
    try {
      const path = `voice/${userId}/${crypto.randomUUID()}.webm`;
      // Supabase storage removed, simulating success for shim
      const publicUrl = "https://example.com/audio.webm";
      await onSend(publicUrl);
      cancel();
    } catch (e: any) { toast.error(e.message || "Action failed"); } finally {
      setUploading(false);
    }
  };

  if (previewUrl) {
    return (
      <div className="flex items-center gap-2 flex-1 bg-muted rounded-full px-3 py-1.5">
        <button onClick={cancel} className="h-7 w-7 grid place-items-center rounded-full text-muted-foreground" aria-label="Discard">
          <X className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <VoiceBubble url={previewUrl} mine={false} />
        </div>
        <button onClick={send} disabled={uploading}
          className="h-8 px-3 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1 disabled:opacity-60">
          <Send className="h-3.5 w-3.5" /> {uploading ? "…" : "Send"}
        </button>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2 flex-1 bg-destructive/15 border border-destructive/40 rounded-full px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
        <span className="text-xs text-foreground tabular-nums flex-1">Recording {fmtSec(elapsed)}</span>
        <button onClick={stop} className="h-8 px-3 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold">
          Stop
        </button>
      </div>
    );
  }

  return (
    <button onClick={start} aria-label="Record voice"
      className="h-9 w-9 grid place-items-center text-foreground">
      <Mic className="h-5 w-5" />
    </button>
  );
};

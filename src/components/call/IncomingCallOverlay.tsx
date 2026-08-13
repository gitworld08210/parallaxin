import { useEffect, useRef } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useCall } from "@/contexts/CallProvider";
import { playRingtone } from "@/lib/webrtc";
import { initialsOf } from "@/lib/format";

export const IncomingCallOverlay = () => {
  const { incoming, acceptIncoming, declineIncoming } = useCall();
  const stopRingRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (incoming) {
      stopRingRef.current = playRingtone();
      if ("vibrate" in navigator) {
        try { (navigator as any).vibrate?.([400, 200, 400, 200, 400]); } catch {}
      }
    }
    return () => { stopRingRef.current?.(); stopRingRef.current = null; };
  }, [incoming?.call_id]);

  if (!incoming) return null;
  const name = incoming.peer.display_name || incoming.peer.username || "Unknown";
  const isVideo = incoming.kind === "video";

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-between py-16 px-6"
      style={{
        background: "linear-gradient(180deg, rgba(10,10,15,0.92), rgba(10,10,15,0.98))",
        backdropFilter: "blur(40px) saturate(180%)",
        WebkitBackdropFilter: "blur(40px) saturate(180%)",
      }}>
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <p className="text-sm text-white/60 tracking-wide uppercase">
          Incoming {isVideo ? "video" : "voice"} call
        </p>
        <div className="relative">
          <div className="absolute inset-0 rounded-full animate-ping bg-primary/30" />
          {incoming.peer.avatar_url ? (
            <img src={incoming.peer.avatar_url} alt="" className="h-32 w-32 rounded-full object-cover ring-4 ring-primary/60 relative" />
          ) : (
            <div className="h-32 w-32 rounded-full bg-gradient-to-br from-primary to-aura grid place-items-center text-4xl font-bold text-white relative">
              {initialsOf(name)}
            </div>
          )}
        </div>
        <h2 className="text-3xl font-bold text-white mt-4">{name}</h2>
        <p className="text-white/60">@{incoming.peer.username || "user"}</p>
      </div>

      <div className="flex items-center justify-around w-full max-w-xs">
        <button
          onClick={declineIncoming}
          aria-label="Decline"
          className="h-16 w-16 rounded-full bg-red-600 grid place-items-center active:scale-95 transition-transform shadow-lg"
        >
          <PhoneOff className="h-7 w-7 text-white" />
        </button>
        <button
          onClick={acceptIncoming}
          aria-label="Accept"
          className="h-16 w-16 rounded-full bg-green-600 grid place-items-center active:scale-95 transition-transform shadow-lg animate-pulse"
        >
          {isVideo ? <Video className="h-7 w-7 text-white" /> : <Phone className="h-7 w-7 text-white" />}
        </button>
      </div>
    </div>
  );
};

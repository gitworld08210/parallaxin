import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff, Volume2 } from "lucide-react";
import { useCall } from "@/contexts/CallProvider";
import { fmtDuration } from "@/lib/webrtc";
import { initialsOf } from "@/lib/format";

export const CallScreen = () => {
  const { active, status, localStream, remoteStream, muted, cameraOff, connected, toggleMute, toggleCamera, endCall } = useCall();
  const localVidRef = useRef<HTMLVideoElement>(null);
  const remoteVidRef = useRef<HTMLVideoElement>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (localVidRef.current && localStream) localVidRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVidRef.current && remoteStream) remoteVidRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    if (!connected || !active) return;
    const start = Date.now();
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [connected, active?.call_id]);

  if (!active || status === "idle" || status === "incoming") return null;

  const name = active.peer.display_name || active.peer.username || "Unknown";
  const isVideo = active.kind === "video";
  const stateLabel =
    status === "outgoing" ? "Calling…" :
    status === "connecting" ? "Connecting…" :
    connected ? fmtDuration(elapsed) : "Ringing…";

  return (
    <div className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: "#06060a", color: "white" }}>
      {/* Video layer */}
      {isVideo && (
        <>
          <video
            ref={remoteVidRef}
            autoPlay
            playsInline
            className="absolute inset-0 h-full w-full object-cover bg-black"
          />
          <video
            ref={localVidRef}
            autoPlay
            playsInline
            muted
            className="absolute top-6 right-4 h-44 w-28 rounded-2xl object-cover ring-2 ring-white/30 shadow-2xl z-10"
          />
          {!connected && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          )}
        </>
      )}

      {/* Voice layer */}
      {!isVideo && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5"
          style={{ background: "radial-gradient(circle at 50% 30%, hsl(var(--primary) / 0.25), transparent 60%), #06060a" }}>
          <div className="relative">
            <div className={`absolute inset-0 rounded-full ${connected ? "" : "animate-ping bg-primary/30"}`} />
            {active.peer.avatar_url ? (
              <img src={active.peer.avatar_url} alt="" className="h-36 w-36 rounded-full object-cover ring-4 ring-white/20 relative" />
            ) : (
              <div className="h-36 w-36 rounded-full bg-gradient-to-br from-primary to-aura grid place-items-center text-5xl font-bold text-white relative">
                {initialsOf(name)}
              </div>
            )}
          </div>
          <h2 className="text-3xl font-bold mt-2">{name}</h2>
          <p className="text-white/60 text-sm tabular-nums">{stateLabel}</p>
          {/* hidden audio sink for remote */}
          <audio ref={remoteVidRef as any} autoPlay playsInline className="hidden" />
        </div>
      )}

      {/* Top overlay info (video) */}
      {isVideo && (
        <div className="relative z-20 pt-10 px-5 flex flex-col items-center">
          <h2 className="text-xl font-bold drop-shadow">{name}</h2>
          <p className="text-white/70 text-xs tabular-nums mt-1">{stateLabel}</p>
        </div>
      )}

      {/* Controls */}
      <div className="relative z-20 mt-auto pb-12 pt-6 px-6"
        style={{
          background: isVideo ? "linear-gradient(180deg, transparent, rgba(0,0,0,0.55))" : "transparent",
        }}>
        <div className="flex items-center justify-around max-w-sm mx-auto">
          <CtrlBtn onClick={toggleMute} active={muted} label={muted ? "Unmute" : "Mute"}>
            {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </CtrlBtn>

          {isVideo ? (
            <CtrlBtn onClick={toggleCamera} active={cameraOff} label={cameraOff ? "Camera on" : "Camera off"}>
              {cameraOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            </CtrlBtn>
          ) : (
            <CtrlBtn label="Speaker" onClick={() => {}}>
              <Volume2 className="h-6 w-6" />
            </CtrlBtn>
          )}

          <button
            onClick={endCall}
            aria-label="End call"
            className="h-16 w-16 rounded-full bg-red-600 grid place-items-center active:scale-95 transition-transform shadow-lg"
          >
            <PhoneOff className="h-7 w-7 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

const CtrlBtn = ({
  children, onClick, active, label,
}: { children: React.ReactNode; onClick: () => void; active?: boolean; label: string }) => (
  <button
    onClick={onClick}
    aria-label={label}
    className={`h-14 w-14 rounded-full grid place-items-center active:scale-95 transition-all ${
      active ? "bg-white text-black" : "bg-white/15 text-white backdrop-blur-md"
    }`}
  >
    {children}
  </button>
);

import { supabase } from "@/integrations/supabase/client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { useAuth } from "@/contexts/AuthProvider";
import { createPeer, getUserMedia, stopStream } from "@/lib/webrtc";
import { toast } from "sonner";

export type CallKind = "voice" | "video";
export type CallStatus = "idle" | "outgoing" | "incoming" | "connecting" | "connected" | "ended";

export type CallPeerInfo = {
  user_id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

type IncomingCall = {
  call_id: string;
  conversation_id: string;
  caller_id: string;
  kind: CallKind;
  peer: CallPeerInfo;
};

type ActiveCall = {
  call_id: string;
  conversation_id: string;
  kind: CallKind;
  isCaller: boolean;
  peer: CallPeerInfo;
  startedAt: number;
};

type CallContextValue = {
  status: CallStatus;
  active: ActiveCall | null;
  incoming: IncomingCall | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  muted: boolean;
  cameraOff: boolean;
  connected: boolean;
  setIncoming: (c: IncomingCall | null) => void;
  startCall: (conversationId: string, peer: CallPeerInfo, kind: CallKind) => Promise<void>;
  acceptIncoming: () => Promise<void>;
  declineIncoming: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => void;
};

const CallContext = createContext<CallContextValue | null>(null);

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used inside <CallProvider>");
  return ctx;
};

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<CallStatus>("idle");
  const [active, setActive] = useState<ActiveCall | null>(null);
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [connected, setConnected] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSetRef = useRef(false);
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signalChRef = useRef<any>(null);
  const callRowChRef = useRef<any>(null);

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      try { pcRef.current.close(); } catch {}
      pcRef.current = null;
    }
    stopStream(localStream);
    stopStream(remoteStream);
    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    setCameraOff(false);
    setConnected(false);
    pendingIceRef.current = [];
    remoteDescSetRef.current = false;
    if (ringTimerRef.current) { clearTimeout(ringTimerRef.current); ringTimerRef.current = null; }
  }, [localStream, remoteStream]);

  const insertSummaryMessage = useCallback(async (conversationId: string, kind: CallKind, finalStatus: string, duration: number) => {
    if (!user) return;
    const m = Math.floor(duration / 60);
    const s = Math.floor(duration % 60).toString().padStart(2, "0");
    let label = "";
    if (finalStatus === "ended") label = `📞 ${kind === "video" ? "Video" : "Voice"} call · ${m}:${s}`;
    else if (finalStatus === "missed") label = `📵 Missed ${kind} call`;
    else if (finalStatus === "declined") label = `🚫 ${kind === "video" ? "Video" : "Voice"} call declined`;
    else if (finalStatus === "cancelled") label = `📵 ${kind === "video" ? "Video" : "Voice"} call cancelled`;
    if (!label) return;
    await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: user.uid, content: label });
  }, [user]);

  const finishCall = useCallback(async (finalStatus: "ended" | "missed" | "declined" | "cancelled" | "busy") => {
    const a = active;
    const dur = a ? Math.floor((Date.now() - a.startedAt) / 1000) : 0;
    if (a) {
      try {
        await supabase.from("calls").update({
          status: finalStatus,
          ended_at: new Date().toISOString(),
          duration_sec: finalStatus === "ended" ? dur : 0,
        } as any).eq("id", a.call_id);
        if (a.isCaller) await insertSummaryMessage(a.conversation_id, a.kind, finalStatus, dur);
      } catch {}
    }
    cleanup();
    setActive(null);
    setStatus("idle");
  }, [active, cleanup, insertSummaryMessage]);

  const sendSignal = useCallback(async (callId: string, toUser: string, kind: "offer" | "answer" | "ice" | "bye", payload: any) => {
    if (!user) return;
    await supabase.from("call_signals").insert({ call_id: callId, from_user: user.uid, to_user: toUser, kind, payload });
  }, [user]);



  const subscribeSignals = useCallback((callId: string, peerId: string, onSignal: (k: string, payload: any) => void) => {
    const ch = supabase.channel(`call-signals:${callId}`).
on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_signals", filter: `call_id=eq.${callId}` },
        (p: any) => {
          const row = p.new;
          if (row.from_user === peerId) onSignal(row.kind, row.payload);
        },
      ).
subscribe();
    signalChRef.current = ch;
  }, []);

  const subscribeCallRow = useCallback((callId: string) => {
    const ch = supabase.channel(`call-row:${callId}`).
on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls", filter: `id=eq.${callId}` },
        (p: any) => {
          const row = p.new;
          if (["ended", "declined", "missed", "cancelled", "busy"].includes(row.status)) {
            cleanup();
            setActive(null);
            setStatus("idle");
            if (row.status === "declined") toast("Call declined");
            else if (row.status === "missed") toast("No answer");
            else if (row.status === "busy") toast("User is busy");
          }
        },
      ).
subscribe();
    callRowChRef.current = ch;
  }, [cleanup]);

  // ---------- Caller flow ----------
  const startCall = useCallback(async (conversationId: string, peer: CallPeerInfo, kind: CallKind) => {
    if (!user) return;
    if (status !== "idle") { toast("You're already in a call"); return; }

    try {
      const stream = await getUserMedia(kind === "video");
      setLocalStream(stream);

      const { data: callRow, error } = await supabase.from("calls").insert({
        conversation_id: conversationId,
        caller_id: user.uid,
        callee_id: peer.user_id,
        kind,
        status: "ringing",
      } as any).select("id").single();
      if (error || !callRow) throw error || new Error("Failed to create call");


      const callId = (callRow as any).id as string;
      const startedAt = Date.now();
      setActive({ call_id: callId, conversation_id: conversationId, kind, isCaller: true, peer, startedAt });
      setStatus("outgoing");

      // 3. Setup peer connection
      const pc = createPeer();
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const remote = new MediaStream();
      setRemoteStream(remote);
      pc.ontrack = (e) => {
        e.streams[0].getTracks().forEach((t) => remote.addTrack(t));
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) sendSignal(callId, peer.user_id, "ice", e.candidate.toJSON());
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setConnected(true);
          setStatus("connected");
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          // let the call row handle final state
        }
      };

      // 4. Subscribe to signals + call row
      subscribeCallRow(callId);
      subscribeSignals(callId, peer.user_id, async (k, payload) => {
        if (k === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(payload));
          remoteDescSetRef.current = true;
          for (const c of pendingIceRef.current) {
            try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
          }
          pendingIceRef.current = [];
        } else if (k === "ice") {
          if (remoteDescSetRef.current) {
            try { await pc.addIceCandidate(new RTCIceCandidate(payload)); } catch {}
          } else {
            pendingIceRef.current.push(payload);
          }
        } else if (k === "bye") {
          finishCall("ended");
        }
      });

      // 5. Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal(callId, peer.user_id, "offer", offer);

      // 6. Ring timeout (30s)
      ringTimerRef.current = setTimeout(async () => {
        const pcNow = pcRef.current;
        if (!pcNow || pcNow.connectionState !== "connected") {
          await sendSignal(callId, peer.user_id, "bye", { reason: "timeout" });
          await insertSummaryMessage(conversationId, kind, "missed", 0);
          cleanup();
          setActive(null);
          setStatus("idle");
          toast("No answer");
        }
      }, 30_000);
    } catch (e: any) {
      cleanup();
      setActive(null);
      setStatus("idle");
      toast.error(e?.message || "Could not start call");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, status]);

  // ---------- Callee flow ----------
  const acceptIncoming = useCallback(async () => {
    if (!user || !incoming) return;
    const inc = incoming;
    try {
      const stream = await getUserMedia(inc.kind === "video");
      setLocalStream(stream);

      setActive({
        call_id: inc.call_id,
        conversation_id: inc.conversation_id,
        kind: inc.kind,
        isCaller: false,
        peer: inc.peer,
        startedAt: Date.now(),
      });
      setIncoming(null);

      setStatus("connecting");

      const pc = createPeer();
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const remote = new MediaStream();
      setRemoteStream(remote);
      pc.ontrack = (e) => {
        e.streams[0].getTracks().forEach((t) => remote.addTrack(t));
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) sendSignal(inc.call_id, inc.caller_id, "ice", e.candidate.toJSON());
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setConnected(true);
          setStatus("connected");
        }
      };

      subscribeCallRow(inc.call_id);
      subscribeSignals(inc.call_id, inc.caller_id, async (k, payload) => {
        if (k === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(payload));
          remoteDescSetRef.current = true;
          for (const c of pendingIceRef.current) {
            try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
          }
          pendingIceRef.current = [];
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal(inc.call_id, inc.caller_id, "answer", answer);
        } else if (k === "ice") {
          if (remoteDescSetRef.current) {
            try { await pc.addIceCandidate(new RTCIceCandidate(payload)); } catch {}
          } else {
            pendingIceRef.current.push(payload);
          }
        } else if (k === "bye") {
          finishCall("ended");
        }
      });

      // Mark accepted (the caller may have inserted offer before we marked accepted, that's fine)

      // Fetch any offer that arrived before subscribe.
      const { data: signals } = await supabase.from("call_signals").select("kind, payload, from_user").eq("call_id", inc.call_id).eq("from_user", inc.caller_id).order("created_at", { ascending: true });
      if (signals) {
        for (const s of signals as any[]) {
          if (s.kind === "offer" && !pc.currentRemoteDescription) {
            await pc.setRemoteDescription(new RTCSessionDescription(s.payload));
            remoteDescSetRef.current = true;
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignal(inc.call_id, inc.caller_id, "answer", answer);
          } else if (s.kind === "ice" && remoteDescSetRef.current) {
            try { await pc.addIceCandidate(new RTCIceCandidate(s.payload)); } catch {}
          }
        }
      }
    } catch (e: any) {
      toast.error(e?.message || "Could not accept call");
      cleanup();
      setActive(null);
      setStatus("idle");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, incoming]);

  const declineIncoming = useCallback(async () => {
    if (!incoming) return;
    const inc = incoming;
    setIncoming(null);
    await sendSignal(inc.call_id, inc.caller_id, "bye", { reason: "declined" });
  }, [incoming, sendSignal]);

  const endCall = useCallback(async () => {
    if (!active) return;
    await sendSignal(active.call_id, active.peer.user_id, "bye", { reason: "hangup" });
    await finishCall("ended");
  }, [active, sendSignal, finishCall]);

  const toggleMute = useCallback(() => {
    if (!localStream) return;
    const next = !muted;
    localStream.getAudioTracks().forEach((t) => { t.enabled = !next; });
    setMuted(next);
  }, [localStream, muted]);

  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    const next = !cameraOff;
    localStream.getVideoTracks().forEach((t) => { t.enabled = !next; });
    setCameraOff(next);
  }, [localStream, cameraOff]);

  // Cleanup on unmount
  useEffect(() => () => cleanup(), []); // eslint-disable-line

  return (
    <CallContext.Provider value={{
      status, active, incoming, localStream, remoteStream, muted, cameraOff, connected,
      setIncoming, startCall, acceptIncoming, declineIncoming, endCall, toggleMute, toggleCamera,
    }}>
      {children}
    </CallContext.Provider>
  );
};

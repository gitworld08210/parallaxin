// Thin WebRTC helper used by CallProvider.
// Public Google STUN — handles NAT for ~80% of networks. Add TURN later if needed.

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export const createPeer = (): RTCPeerConnection =>
  new RTCPeerConnection({ iceServers: ICE_SERVERS });

export const getUserMedia = async (video: boolean): Promise<MediaStream> => {
  return await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: video ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } : false,
  });
};

export const stopStream = (stream: MediaStream | null) => {
  if (!stream) return;
  stream.getTracks().forEach((t) => { try { t.stop(); } catch {} });
};

/** Simple oscillator-based ringtone (no asset). Returns stop fn. */
export const playRingtone = (): (() => void) => {
  try {
    const AC = (window.AudioContext || (window as any).webkitAudioContext);
    const ctx = new AC();
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tone = () => {
      if (stopped) return;
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const g = ctx.createGain();
      o1.frequency.value = 440;
      o2.frequency.value = 480;
      g.gain.value = 0;
      o1.connect(g); o2.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.05);
      g.gain.setValueAtTime(0.12, t + 0.9);
      g.gain.linearRampToValueAtTime(0, t + 1.0);
      o1.start(t); o2.start(t);
      o1.stop(t + 1.05); o2.stop(t + 1.05);
    };
    tone();
    timer = setInterval(tone, 2000);

    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      try { ctx.close(); } catch {}
    };
  } catch {
    return () => {};
  }
};

export const fmtDuration = (s: number): string => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

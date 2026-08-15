import { useEffect, useState } from "react";
import { X, Send, Camera } from "lucide-react";
import { timeAgo } from "@/lib/format";

import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Story = {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  profile: { username: string; display_name: string; avatar_url: string | null } | null;
};

export const StoryViewer = ({ stories, startIdx, onClose }: { stories: Story[]; startIdx: number; onClose: () => void }) => {
  const { user } = useAuth();
  const [idx, setIdx] = useState(startIdx);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState("");
  const current = stories[idx];

  // Auto-advance timer
  useEffect(() => {
    setProgress(0);
    if (paused) return;
    const duration = current?.media_type === "video" ? 12000 : 5000;
    const start = Date.now();
    const i = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / duration);
      setProgress(p);
      if (p >= 1) {
        clearInterval(i);
        if (idx < stories.length - 1) setIdx(idx + 1);
        else onClose();
      }
    }, 30);
    return () => clearInterval(i);
  }, [idx, current?.id, paused]);

  if (!current) return null;

  const tap = (e: React.MouseEvent<HTMLDivElement>) => {
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    const w = e.currentTarget.clientWidth;
    if (x < w / 3) { if (idx > 0) setIdx(idx - 1); }
    else { if (idx < stories.length - 1) setIdx(idx + 1); else onClose(); }
  };

  const sendReply = async () => {
    if (!user || !reply.trim() || !current.profile) return;
    if (current.user_id === user.id) { toast.error("Can't reply to yourself"); return; }
    try {
      const convsRef = collection(db, "conversations");
      const q1 = query(convsRef, where("member_ids", "array-contains", user.id));
      const snap = await getDocs(q1);
      let convId = snap.docs.find((d) => (d.data().member_ids || []).includes(current.user_id))?.id ?? null;
      if (!convId) {
        const newConv = await addDoc(convsRef, {
          member_ids: [user.id, current.user_id],
          created_at: serverTimestamp(),
        });
        convId = newConv.id;
      }
      const content = `↩️ Replied to story: ${reply.trim().slice(0, 500)}`;
      await addDoc(collection(db, "conversations", convId, "messages"), {
        sender_id: user.id,
        content,
        created_at: serverTimestamp(),
      });
      setReply("");
      toast.success("Reply sent");
    } catch {
      toast.error("Couldn't send reply");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black text-white flex flex-col">
      {/* ─── Progress bars ─── */}
      <div className="absolute top-0 inset-x-0 z-20 px-2 pt-2 flex gap-[3px]">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-75"
              style={{ width: `${i < idx ? 100 : i === idx ? progress * 100 : 0}%` }}
            />
          </div>
        ))}
      </div>

      {/* ─── Header: avatar, username, time, close ─── */}
      <div className="relative z-20 flex items-center gap-2.5 px-3 pt-7 pb-2">
        {current.profile?.avatar_url ? (
          <img src={current.profile.avatar_url} className="h-8 w-8 rounded-full object-cover ring-1 ring-white/20" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-zinc-700" />
        )}
        <span className="text-[13px] font-semibold">{current.profile?.username ?? "user"}</span>
        <span className="text-[12px] text-white/50">{timeAgo(current.created_at)}</span>

        <button
          onClick={onClose}
          className="ml-auto h-8 w-8 grid place-items-center"
          aria-label="Close"
        >
          <X className="h-6 w-6 text-white" strokeWidth={1.8} />
        </button>
      </div>

      {/* ─── Full-screen media ─── */}
      <div
        onClick={tap}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
        className="flex-1 relative overflow-hidden"
      >
        {current.media_type === "video" ? (
          <video
            src={current.media_url}
            autoPlay
            playsInline
            muted={false}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <img
            src={current.media_url}
            className="absolute inset-0 w-full h-full object-cover"
            alt=""
          />
        )}
      </div>

      {/* ─── Bottom bar: camera, text input, send, more ─── */}
      {current.user_id !== user?.id && (
        <div className="relative z-20 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-black/60 to-transparent flex items-center gap-2.5"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="shrink-0 h-10 w-10 grid place-items-center" aria-label="Camera">
            <Camera className="h-6 w-6 text-white" strokeWidth={1.6} />
          </button>

          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }}
            placeholder="Send Message"
            className="flex-1 h-10 bg-transparent border border-white/30 rounded-full px-4 text-[14px] text-white placeholder:text-white/50 outline-none focus:border-white/60 transition-colors"
          />

          <button onClick={sendReply} className="shrink-0 h-10 w-10 grid place-items-center" aria-label="Send">
            <Send className="h-5 w-5 text-white -rotate-45" strokeWidth={1.8} />
          </button>

          <button className="shrink-0 h-10 w-10 grid place-items-center" aria-label="More">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="white">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

import { useEffect, useState } from "react";
import { X, Send } from "lucide-react";
import { timeAgo } from "@/lib/format";

import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { StoryStickersLayer } from "@/components/social/StoryStickersLayer";
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

const EMOJIS = ["❤️", "🔥", "😍", "😂", "👏", "🙌"];

export const StoryViewer = ({ stories, startIdx, onClose }: { stories: Story[]; startIdx: number; onClose: () => void }) => {
  const { user } = useAuth();
  const [idx, setIdx] = useState(startIdx);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState("");
  const current = stories[idx];

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
    }, 60);
    return () => clearInterval(i);
  }, [idx, current?.id, paused]);

  if (!current) return null;

  const tap = (e: React.MouseEvent<HTMLDivElement>) => {
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    const w = e.currentTarget.clientWidth;
    if (x < w / 3) { if (idx > 0) setIdx(idx - 1); }
    else { if (idx < stories.length - 1) setIdx(idx + 1); else onClose(); }
  };

  const react = async (emoji: string) => {
    if (!user) return toast.error("Sign in");
    const { error } = await supabase.from("story_reactions").insert({
      story_id: current.id, user_id: user.uid, emoji
    });
    if (error) toast.error(error.message); else toast.success(`Reacted ${emoji}`);
  };

  const sendReply = async () => {
    if (!user || !reply.trim() || !current.profile) return;
    if (current.user_id === user.uid) { toast.error("Can't reply to yourself"); return; }
    try {
      const convsRef = collection(db, "conversations");
      const q1 = query(convsRef, where("member_ids", "array-contains", user.uid));
      const snap = await getDocs(q1);
      let convId = snap.docs.find((d) => (d.data().member_ids || []).includes(current.user_id))?.id ?? null;
      if (!convId) {
        const newConv = await addDoc(convsRef, {
          member_ids: [user.uid, current.user_id],
          created_at: serverTimestamp(),
        });
        convId = newConv.id;
      }
      const content = `↩️ Replied to story: ${reply.trim().slice(0, 500)}`;
      await addDoc(collection(db, "conversations", convId, "messages"), {
        sender_id: user.uid,
        content,
        created_at: serverTimestamp(),
      });
      setReply("");
      toast.success("Reply sent");
    } catch {
      toast.error("Couldn't start chat");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black text-white">
      <div className="absolute top-0 inset-x-0 z-10 px-3 pt-3 flex gap-1">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded overflow-hidden">
            <div
              className="h-full bg-white transition-all"
              style={{ width: `${i < idx ? 100 : i === idx ? progress * 100 : 0}%` }}
            />
          </div>
        ))}
      </div>

      <div className="absolute top-6 inset-x-0 z-10 px-4 pt-3 flex items-center gap-2">
        {current.profile?.avatar_url ? (
          <img src={current.profile.avatar_url} className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-gradient-primary" />
        )}
        <span className="font-semibold text-sm">{current.profile?.username ?? "user"}</span>
        <span className="text-xs text-white/60">{timeAgo(current.created_at)}</span>
        <button onClick={onClose} className="ml-auto h-9 w-9 grid place-items-center rounded-full bg-white/10">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        onClick={tap}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
        className="absolute inset-0 grid place-items-center"
      >
        {current.media_type === "video" ? (
          <video src={current.media_url} autoPlay playsInline className="max-h-full max-w-full" />
        ) : (
          <img src={current.media_url} className="max-h-full max-w-full" alt="" />
        )}
        <StoryStickersLayer storyId={current.id} isOwner={current.user_id === user?.id} onPauseChange={setPaused} />
      </div>

      {current.user_id !== user?.id && (
        <div className="absolute bottom-0 inset-x-0 z-20 p-4 pb-6 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex justify-around mb-3">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={(ev) => { ev.stopPropagation(); react(e); }}
                onPointerDown={(ev) => ev.stopPropagation()}
                className="text-2xl active:scale-125 transition-transform"
              >
                {e}
              </button>
            ))}
          </div>
          <div className="flex gap-2" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
              placeholder={`Reply to ${current.profile?.username ?? "story"}…`}
              className="flex-1 bg-white/10 rounded-full px-4 py-2.5 text-sm outline-none placeholder:text-white/60 text-white"
            />
            <button onClick={sendReply} className="h-10 w-10 grid place-items-center rounded-full bg-white text-black">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

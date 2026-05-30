import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { timeAgo } from "@/lib/format";

type Story = {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  profile: { username: string; display_name: string; avatar_url: string | null } | null;
};

export const StoryViewer = ({ stories, startIdx, onClose }: { stories: Story[]; startIdx: number; onClose: () => void }) => {
  const [idx, setIdx] = useState(startIdx);
  const [progress, setProgress] = useState(0);
  const current = stories[idx];

  useEffect(() => {
    setProgress(0);
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
  }, [idx, current?.id]);

  if (!current) return null;

  const tap = (e: React.MouseEvent<HTMLDivElement>) => {
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    const w = e.currentTarget.clientWidth;
    if (x < w / 3) { if (idx > 0) setIdx(idx - 1); }
    else { if (idx < stories.length - 1) setIdx(idx + 1); else onClose(); }
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

      <div onClick={tap} className="absolute inset-0 grid place-items-center">
        {current.media_type === "video" ? (
          <video src={current.media_url} autoPlay playsInline className="max-h-full max-w-full" />
        ) : (
          <img src={current.media_url} className="max-h-full max-w-full" alt="" />
        )}
      </div>
    </div>
  );
};

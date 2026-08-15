import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { useAuth } from "@/contexts/AuthProvider";
import { gradientFor, initialsOf } from "@/lib/format";
import { StoryViewer } from "./StoryViewer";

type StoryRow = {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  profile: { username: string; display_name: string; avatar_url: string | null } | null;
};

type Group = {
  user_id: string;
  profile: StoryRow["profile"];
  stories: StoryRow[];
};

export const StoriesRail = () => {
  const { user, profile: me } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [viewingIdx, setViewingIdx] = useState<number | null>(null);

  const load = async () => {
    if (!user?.id) { setGroups([]); return; }
    try {
      const q = query(
        collection(db, "stories"),
        where("expires_at", ">", new Date().toISOString()),
        orderBy("created_at", "asc"),
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const map = new Map<string, Group>();
      (data ?? []).forEach((s: any) => {
        const g = map.get(s.user_id) ?? { user_id: s.user_id, profile: s.profile, stories: [] };
        g.stories.push(s);
        map.set(s.user_id, g);
      });
      setGroups(Array.from(map.values()));
    } catch (err) {
      console.error("Error loading stories:", err);
    }
  };

  useEffect(() => { load(); }, [user?.id]);

  const flatStories = groups.flatMap((g) => g.stories);

  return (
    <>
      <div className="px-3 py-2.5 flex gap-4 overflow-x-auto no-scrollbar border-b border-white/[0.06]">
        {/* Your Story — always first */}
        <Link to="/compose/story" className="flex flex-col items-center gap-1 shrink-0 w-[68px]">
          <div className="relative">
            <div className="h-[62px] w-[62px] rounded-full overflow-hidden border-[2px] border-zinc-700">
              {me?.avatar_url ? (
                <img src={me.avatar_url} className="h-full w-full object-cover" alt="" />
              ) : (
                <div className="h-full w-full bg-zinc-800 grid place-items-center text-white text-sm font-semibold">
                  {initialsOf(me?.display_name || me?.username || "Y")}
                </div>
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-[18px] w-[18px] rounded-full bg-blue-500 grid place-items-center ring-[2px] ring-black">
              <Plus className="h-2.5 w-2.5 text-white" strokeWidth={3} />
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 truncate w-full text-center">Your Story</span>
        </Link>

        {/* Other users' stories */}
        {groups.filter((g) => g.user_id !== user?.id).map((g) => {
          const startIdx = flatStories.findIndex((s) => s.user_id === g.user_id);
          const hasLive = false; // Future: check if user is live
          return (
            <button
              key={g.user_id}
              onClick={() => setViewingIdx(startIdx)}
              className="flex flex-col items-center gap-1 shrink-0 w-[68px]"
            >
              <div
                className="h-[66px] w-[66px] rounded-full p-[2.5px]"
                style={{
                  background: hasLive
                    ? "linear-gradient(135deg, #ff0066, #ff6633)"
                    : "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
                }}
              >
                <div className="h-full w-full rounded-full bg-black p-[2px]">
                  {g.profile?.avatar_url ? (
                    <img src={g.profile.avatar_url} className="h-full w-full rounded-full object-cover" alt="" />
                  ) : (
                    <div
                      className="h-full w-full rounded-full grid place-items-center text-[11px] font-bold text-white"
                      style={{ backgroundImage: gradientFor(g.profile?.username) }}
                    >
                      {initialsOf(g.profile?.display_name || g.profile?.username || "?")}
                    </div>
                  )}
                </div>
              </div>
              {hasLive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase bg-gradient-to-r from-rose-500 to-orange-500 text-white px-1.5 py-[1px] rounded-sm">
                  Live
                </span>
              )}
              <span className="text-[11px] text-zinc-300 truncate w-full text-center">
                {g.profile?.username ?? "user"}
              </span>
            </button>
          );
        })}
      </div>

      {viewingIdx !== null && (
        <StoryViewer stories={flatStories} startIdx={viewingIdx} onClose={() => setViewingIdx(null)} />
      )}
    </>
  );
};


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
      // Fetch stories from Firestore
      // For now, since social graph is not fully in Firestore, we show all active stories
      const q = query(
        collection(db, "stories"),
        where("expires_at", ">", new Date().toISOString()),
        orderBy("created_at", "asc")
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
      <div className="px-3 py-3 flex gap-4 overflow-x-auto no-scrollbar border-b border-border">
        <Link to="/compose/story" className="flex flex-col items-center gap-1 shrink-0 w-16">
          <div className="relative h-16 w-16 rounded-full bg-muted grid place-items-center overflow-hidden border border-border">
            {me?.avatar_url ? (
              <img src={me.avatar_url} className="h-full w-full object-cover" alt="" />
            ) : (
              <div className="h-full w-full bg-muted grid place-items-center text-foreground font-semibold text-sm">
                {initialsOf(me?.display_name || me?.username || "Y")}
              </div>
            )}
            <span className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-primary grid place-items-center ring-2 ring-background">
              <Plus className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
            </span>
          </div>
          <span className="text-[11px] text-foreground truncate w-full text-center">Your story</span>
        </Link>

        {groups.filter((g) => g.user_id !== user?.id).map((g) => {
          const startIdx = flatStories.findIndex((s) => s.user_id === g.user_id);
          return (
            <button
              key={g.user_id}
              onClick={() => setViewingIdx(startIdx)}
              className="flex flex-col items-center gap-1 shrink-0 w-16"
            >
              <div className="h-16 w-16 rounded-full p-[2px]" style={{ background: "conic-gradient(from 180deg, hsl(244 80% 60%), hsl(262 85% 68%), hsl(300 85% 65%), hsl(244 80% 60%))" }}>
                <div className="h-full w-full rounded-full bg-background p-[2px]">
                  {g.profile?.avatar_url ? (
                    <img src={g.profile.avatar_url} className="h-full w-full rounded-full object-cover" alt="" />
                  ) : (
                    <div className="h-full w-full rounded-full grid place-items-center text-xs font-semibold text-primary-foreground" style={{ backgroundImage: gradientFor(g.profile?.username) }}>
                      {initialsOf(g.profile?.display_name || g.profile?.username || "?")}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[11px] truncate w-full text-center text-foreground">{g.profile?.username ?? "user"}</span>
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

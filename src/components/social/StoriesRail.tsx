import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
    const { data } = await supabase
      .from("stories")
      .select("id, user_id, media_url, media_type, created_at, profile:profiles!stories_user_profile_fkey(username, display_name, avatar_url)")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });
    const map = new Map<string, Group>();
    (data ?? []).forEach((s: any) => {
      const g = map.get(s.user_id) ?? { user_id: s.user_id, profile: s.profile, stories: [] };
      g.stories.push(s);
      map.set(s.user_id, g);
    });
    setGroups(Array.from(map.values()));
  };

  useEffect(() => { load(); }, [user?.id]);

  const flatStories = groups.flatMap((g) => g.stories);
  const myHasStory = groups.some((g) => g.user_id === user?.id);

  return (
    <>
      <div className="px-5 mb-5 flex gap-4 overflow-x-auto no-scrollbar">
        <Link to="/compose/story" className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="relative h-16 w-16 rounded-full bg-gradient-primary p-[2px]">
            <div className="h-full w-full rounded-full bg-background grid place-items-center overflow-hidden">
              {me?.avatar_url ? (
                <img src={me.avatar_url} className="h-full w-full object-cover" alt="" />
              ) : (
                <div className="h-full w-full bg-gradient-primary grid place-items-center text-primary-foreground font-semibold text-sm">
                  {initialsOf(me?.display_name || me?.username || "Y")}
                </div>
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-gradient-primary grid place-items-center ring-2 ring-background">
              <Plus className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">Your story</span>
        </Link>

        {groups.filter((g) => g.user_id !== user?.id || myHasStory && g.user_id === user?.id).map((g) => {
          if (g.user_id === user?.id) return null;
          const startIdx = flatStories.findIndex((s) => s.user_id === g.user_id);
          return (
            <button
              key={g.user_id}
              onClick={() => setViewingIdx(startIdx)}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <div className="h-16 w-16 rounded-full p-[2px]" style={{ background: "conic-gradient(from 180deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary)))" }}>
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
              <span className="text-[10px] truncate max-w-[64px]">{g.profile?.username ?? "user"}</span>
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

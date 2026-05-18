import { TopBar } from "@/components/vibe/TopBar";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import { creators, fmt } from "@/lib/mock";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

const FollowList = () => {
  const { kind = "followers" } = useParams();
  const nav = useNavigate();
  return (
    <div>
      <TopBar
        subtitle="Profile"
        title={kind === "following" ? "Following" : "Followers"}
        right={
          <button onClick={() => nav(-1)} className="glass h-11 w-11 rounded-full grid place-items-center">
            <ChevronLeft className="h-5 w-5" />
          </button>
        }
      />
      <div className="px-5 space-y-2">
        {creators.map((c) => (
          <div key={c.id} className="flex items-center gap-3 py-2">
            <AuraAvatar gradient={c.avatar} size="md" initials={c.name[0]} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold truncate text-sm">{c.name}</p>
                {c.badges.map((b) => <VerificationBadge key={b} kind={b} />)}
              </div>
              <p className="text-xs text-muted-foreground">{c.handle} · {fmt(c.followers)} followers</p>
            </div>
            <button className="text-xs font-semibold px-3 py-1.5 rounded-full glass-strong">Following</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FollowList;

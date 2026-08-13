import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Radio } from "lucide-react";

type Stream = { id: string; title: string | null; host_id: string; started_at: string };

export default function LiveList() {
  const navigate = useNavigate();
  const [streams, setStreams] = useState<(Stream & { username?: string; avatar_url?: string })[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("live_streams").select("id,title,host_id,started_at").eq("status", "live").order("started_at", { ascending: false });
      if (!data) return;
      const ids = data.map((s) => s.host_id);
      const { data: profs } = await supabase.from("profiles").select("id,username,avatar_url").in("id", ids);
      const map = new Map(profs?.map((p: any) => [p.id, p]) ?? []);
      setStreams(data.map((s) => ({ ...s, ...(map.get(s.host_id) as any) })));
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Live now</h1>
        <Button onClick={() => navigate("/live/host")} className="gap-2">
          <Radio className="w-4 h-4" /> Go Live
        </Button>
      </div>
      {streams.length === 0 && <p className="text-muted-foreground text-sm">Nobody is live right now.</p>}
      <div className="grid grid-cols-2 gap-3">
        {streams.map((s) => (
          <Link key={s.id} to={`/live/${s.id}`} className="relative aspect-[3/4] rounded-2xl bg-gradient-to-br from-pink-500 to-purple-700 p-3 flex flex-col justify-between overflow-hidden">
            <div className="self-start flex items-center gap-1 px-2 py-0.5 bg-red-600 rounded-full text-[10px] font-bold text-white">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
            </div>
            <div className="text-white">
              <p className="font-semibold truncate">@{s.username || "user"}</p>
              {s.title && <p className="text-xs opacity-80 truncate">{s.title}</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

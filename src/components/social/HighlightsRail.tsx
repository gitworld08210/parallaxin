import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { NewHighlightSheet } from "./NewHighlightSheet";

type Highlight = { id: string; title: string; cover_url: string | null };

export const HighlightsRail = ({ userId, isMe }: { userId: string; isMe: boolean }) => {
  const [items, setItems] = useState<Highlight[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("highlights").select("id, title, cover_url").eq("user_id", userId).order("created_at", { ascending: false });
    setItems((data as Highlight[]) ?? []);
  };

  useEffect(() => { load(); }, [userId]);

  if (!isMe && items.length === 0) return null;

  return (
    <div className="px-2 mt-4">
      <div className="flex gap-4 overflow-x-auto no-scrollbar">
        {isMe && (
          <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="h-16 w-16 rounded-full border border-dashed border-border grid place-items-center text-muted-foreground">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-[11px] text-muted-foreground">New</span>
          </button>
        )}
        {items.map((h) => (
          <button key={h.id} className="flex flex-col items-center gap-1.5 shrink-0 max-w-[72px]">
            <div className="h-16 w-16 rounded-full p-[2px] bg-border">
              <div className="h-full w-full rounded-full overflow-hidden bg-muted">
                {h.cover_url ? (
                  <img src={h.cover_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full grid place-items-center text-[10px] text-muted-foreground">{h.title.slice(0, 2)}</div>
                )}
              </div>
            </div>
            <span className="text-[11px] text-foreground truncate w-full text-center">{h.title}</span>
          </button>
        ))}
      </div>
      {isMe && <NewHighlightSheet open={open} onOpenChange={setOpen} onCreated={load} />}
    </div>
  );
};

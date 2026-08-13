import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthProvider";
import { Send } from "lucide-react";
import { toast } from "sonner";

type Sticker = {
  id: string;
  kind: "poll" | "qa";
  position: { x: number; y: number };
  payload: any;
};

type Response = { id: string; sticker_id: string; user_id: string; response: any };

export const StoryStickersLayer = ({ storyId, isOwner, onPauseChange }: { storyId: string; isOwner: boolean; onPauseChange: (p: boolean) => void }) => {
  const { user } = useAuth();
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [showInsights, setShowInsights] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: st } = await supabase.from("story_stickers" as any).select("*").eq("story_id", storyId);
      if (cancelled) return;
      setStickers((st ?? []) as any);
      const ids = ((st ?? []) as any[]).map((s) => s.id);
      if (ids.length) {
        const { data: rs } = await supabase.from("story_sticker_responses" as any).select("*").in("sticker_id", ids);
        if (!cancelled) setResponses((rs ?? []) as any);
      }
    })();
    const channel = supabase.channel(`story-stickers:${storyId}`).on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "story_sticker_responses" },
      (p: any) => {
        const r = p.new as any;
        setResponses((prev) => prev.some((x) => x.id === r.id) ? prev : [...prev, r]);
      },
    ).subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [storyId]);

  const respondPoll = async (stickerId: string, option: string) => {
    if (!user) return toast.error("Sign in");
    const existing = responses.find((r) => r.sticker_id === stickerId && r.user_id === user.id);
    if (existing) {
      const { error } = await supabase.from("story_sticker_responses" as any).update({ response: { option } } as any).eq("id", existing.id);
      if (error) return toast.error(error.message);
      setResponses((prev) => prev.map((r) => r.id === existing.id ? { ...r, response: { option } } : r));
    } else {
      const { data, error } = await supabase.from("story_sticker_responses" as any).insert({ sticker_id: stickerId, user_id: user.id, response: { option } } as any).select().single();
      if (error) return toast.error(error.message);
      setResponses((prev) => [...prev, data as any]);
    }
  };

  const respondQA = async (stickerId: string, text: string) => {
    if (!user || !text.trim()) return;
    const { data, error } = await supabase.from("story_sticker_responses" as any).insert({ sticker_id: stickerId, user_id: user.id, response: { text: text.trim().slice(0, 300) } } as any).select().single();
    if (error) return toast.error(error.message);
    setResponses((prev) => [...prev, data as any]);
    toast.success("Sent");
  };

  if (stickers.length === 0) return null;

  return (
    <>
      {stickers.map((s) => {
        const pos = s.position ?? { x: 0.5, y: 0.7 };
        return (
          <div
            key={s.id}
            style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, transform: "translate(-50%, -50%)" }}
            className="absolute z-20 max-w-[80%] pointer-events-auto"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {s.kind === "poll" ? (
              <PollSticker sticker={s} responses={responses.filter((r) => r.sticker_id === s.id)} userId={user?.id} onPick={(opt) => respondPoll(s.id, opt)} />
            ) : (
              <QASticker sticker={s} onSubmit={(t) => respondQA(s.id, t)} onFocus={() => onPauseChange(true)} onBlur={() => onPauseChange(false)} />
            )}
          </div>
        );
      })}

      {isOwner && (
        <button
          onClick={(e) => { e.stopPropagation(); onPauseChange(true); setShowInsights(true); }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-white/15 backdrop-blur text-white text-xs font-semibold"
        >
          View insights ({responses.length})
        </button>
      )}

      {showInsights && (
        <InsightsPanel
          stickers={stickers}
          responses={responses}
          onClose={() => { setShowInsights(false); onPauseChange(false); }}
        />
      )}
    </>
  );
};

const PollSticker = ({ sticker, responses, userId, onPick }: { sticker: Sticker; responses: Response[]; userId?: string; onPick: (o: string) => void }) => {
  const opts: string[] = sticker.payload?.options ?? [];
  const total = responses.length || 1;
  const myPick = responses.find((r) => r.user_id === userId)?.response?.option;
  const counts: Record<string, number> = {};
  responses.forEach((r) => { const o = r.response?.option; if (o) counts[o] = (counts[o] ?? 0) + 1; });

  return (
    <div className="rounded-2xl bg-white/95 backdrop-blur px-3 py-2.5 shadow-xl">
      <p className="text-xs font-bold text-foreground text-center mb-2">{sticker.payload?.question}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {opts.map((o) => {
          const pct = Math.round(((counts[o] ?? 0) / total) * 100);
          const picked = myPick === o;
          return (
            <button key={o} onClick={() => onPick(o)}
              className={`relative overflow-hidden text-[11px] font-semibold text-foreground rounded-lg px-2 py-1.5 text-center truncate ${picked ? "ring-2 ring-primary" : ""}`}
              style={{ background: "hsl(var(--muted))" }}>
              {myPick && (
                <span className="absolute inset-y-0 left-0 bg-primary/30" style={{ width: `${pct}%` }} />
              )}
              <span className="relative">{o}{myPick && ` · ${pct}%`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const QASticker = ({ sticker, onSubmit, onFocus, onBlur }: { sticker: Sticker; onSubmit: (t: string) => void; onFocus: () => void; onBlur: () => void }) => {
  const [val, setVal] = useState("");
  return (
    <div className="rounded-2xl bg-white/95 backdrop-blur px-3 py-2.5 shadow-xl min-w-[220px]">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Q&amp;A</p>
      <p className="text-xs font-semibold text-foreground mb-2">{sticker.payload?.prompt}</p>
      <div className="flex gap-1.5">
        <input value={val} onChange={(e) => setVal(e.target.value)} onFocus={onFocus} onBlur={onBlur}
          placeholder="Type a response…" className="flex-1 bg-muted rounded-lg px-2 py-1.5 text-xs text-foreground outline-none" />
        <button onClick={() => { onSubmit(val); setVal(""); }} className="h-7 w-7 grid place-items-center rounded-lg bg-primary text-primary-foreground">
          <Send className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

const InsightsPanel = ({ stickers, responses, onClose }: { stickers: Sticker[]; responses: Response[]; onClose: () => void }) => {
  return (
    <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur text-white overflow-y-auto" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <div className="p-4 flex items-center justify-between sticky top-0 bg-black/85">
        <h3 className="text-base font-bold">Insights</h3>
        <button onClick={onClose} className="text-sm text-white/70">Close</button>
      </div>
      <div className="p-4 space-y-4">
        {stickers.map((s) => {
          const rs = responses.filter((r) => r.sticker_id === s.id);
          return (
            <div key={s.id} className="rounded-xl bg-white/10 p-3">
              <p className="text-xs uppercase tracking-wide text-white/60 mb-1">{s.kind === "poll" ? "Poll" : "Q&A"}</p>
              <p className="text-sm font-semibold mb-2">{s.payload?.question ?? s.payload?.prompt}</p>
              {s.kind === "poll" ? (
                (() => {
                  const opts: string[] = s.payload?.options ?? [];
                  const counts: Record<string, number> = {};
                  rs.forEach((r) => { const o = r.response?.option; if (o) counts[o] = (counts[o] ?? 0) + 1; });
                  const total = rs.length || 1;
                  return (
                    <div className="space-y-1.5">
                      {opts.map((o) => {
                        const c = counts[o] ?? 0;
                        const pct = Math.round((c / total) * 100);
                        return (
                          <div key={o}>
                            <div className="flex justify-between text-xs mb-0.5"><span>{o}</span><span className="text-white/60">{c} · {pct}%</span></div>
                            <div className="h-1.5 rounded bg-white/10 overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                <div className="space-y-1.5">
                  {rs.length === 0 ? <p className="text-xs text-white/60">No responses yet</p> :
                    rs.map((r) => (
                      <div key={r.id} className="text-xs bg-white/5 rounded-lg px-2 py-1.5">{r.response?.text}</div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

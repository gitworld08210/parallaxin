import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ImagePlus, X, Globe, Star, BarChart3, MessageSquare, Plus, Trash2, Music, Wand2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthProvider";
import { TopBar } from "@/components/vibe/TopBar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { FilterStrip, FilterKey, filterCss } from "@/components/compose/FilterStrip";

type Sticker =
  | { id: string; kind: "poll"; x: number; y: number; question: string; options: string[] }
  | { id: string; kind: "qa"; x: number; y: number; prompt: string }
  | { id: string; kind: "music"; x: number; y: number; title: string };

const StoryCompose = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [audience, setAudience] = useState<"public" | "close_friends">("public");
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [stickerSheet, setStickerSheet] = useState<null | "poll" | "qa" | "music">(null);
  const [filter, setFilter] = useState<FilterKey>("none");
  const [musicTitle, setMusicTitle] = useState("");
  const [pollQ, setPollQ] = useState("");
  const [pollOpts, setPollOpts] = useState<string[]>(["", ""]);
  const [qaPrompt, setQaPrompt] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const addPoll = () => {
    const opts = pollOpts.map((o) => o.trim()).filter(Boolean);
    if (!pollQ.trim() || opts.length < 2) return toast.error("Question + 2 options required");
    setStickers((s) => [...s, { id: crypto.randomUUID(), kind: "poll", x: 0.5, y: 0.7, question: pollQ.trim(), options: opts.slice(0, 4) }]);
    setPollQ(""); setPollOpts(["", ""]); setStickerSheet(null);
  };
  const addQA = () => {
    if (!qaPrompt.trim()) return toast.error("Prompt required");
    setStickers((s) => [...s, { id: crypto.randomUUID(), kind: "qa", x: 0.5, y: 0.7, prompt: qaPrompt.trim() }]);
    setQaPrompt(""); setStickerSheet(null);
  };

  const dragStart = (id: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const nx = Math.min(0.95, Math.max(0.05, (ev.clientX - rect.left) / rect.width));
      const ny = Math.min(0.95, Math.max(0.05, (ev.clientY - rect.top) / rect.height));
      setStickers((prev) => prev.map((s) => s.id === id ? { ...s, x: nx, y: ny } : s));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const removeSticker = (id: string) => setStickers((s) => s.filter((x) => x.id !== id));

  const submit = async () => {
    if (!user || !file) return toast.error("Pick a photo or video");
    setBusy(true);
    try {
      const url = await uploadToCloudinary(file);
      const { data: storyRow, error } = await supabase.from("stories").insert({
        user_id: user.id,
        media_url: url,
        media_type: file.type.startsWith("video") ? "video" : "image",
        audience: audience as any,
      }).select("id").single();
      
      if (error) throw error;
      if (stickers.length && storyRow?.id) {
        const rows = stickers.map((s) => ({
          story_id: storyRow.id,
          kind: s.kind,
          position: { x: s.x, y: s.y },
          payload: s.kind === "poll" ? { question: s.question, options: s.options } : s.kind === "qa" ? { prompt: s.prompt } : { title: s.title },
        }));
        await supabase.from("story_stickers").insert(rows);
      }
      toast.success("Story added ✦ · expires in 24h");
      nav("/");
    } catch (e: any) { toast.error(e.message || "Action failed"); } finally { setBusy(false); }
  };

  return (
    <div>
      <TopBar
        title="Add to story"
        right={<button onClick={() => nav(-1)} className="p-2"><X className="h-5 w-5" /></button>}
      />
      <div className="px-4">
        {!preview ? (
          <label className="block aspect-[9/16] rounded-xl bg-card border-2 border-dashed border-border grid place-items-center cursor-pointer">
            <div className="text-center px-6">
              <ImagePlus className="h-10 w-10 mx-auto mb-3 text-primary" />
              <p className="text-base font-semibold">Pick a photo or video</p>
              <p className="text-xs text-muted-foreground mt-1">Disappears in 24 hours</p>
            </div>
            <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        ) : (
          <div ref={canvasRef} className="relative rounded-xl overflow-hidden aspect-[9/16] bg-black select-none">
            {file?.type.startsWith("video") ? (
              <video src={preview} autoPlay loop muted playsInline className="w-full h-full object-cover" style={{ filter: filterCss(filter) }} />
            ) : (
              <img src={preview} className="w-full h-full object-cover" alt="" style={{ filter: filterCss(filter) }} />
            )}
            <button onClick={() => setFile(null)} className="absolute top-2 right-2 h-9 w-9 grid place-items-center rounded-full bg-black/60 text-white z-20">
              <X className="h-4 w-4" />
            </button>

            {stickers.map((s) => (
              <div
                key={s.id}
                onPointerDown={dragStart(s.id)}
                style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, transform: "translate(-50%, -50%)" }}
                className="absolute z-10 max-w-[80%] touch-none cursor-grab active:cursor-grabbing"
              >
                {s.kind === "poll" ? (
                  <div className="rounded-2xl bg-white/95 backdrop-blur px-3 py-2.5 shadow-xl">
                    <p className="text-xs font-bold text-foreground text-center mb-1.5">{s.question}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {s.options.map((o, i) => (
                        <div key={i} className="text-[11px] font-semibold text-foreground bg-muted rounded-lg px-2 py-1 text-center truncate">{o}</div>
                      ))}
                    </div>
                  </div>
                ) : s.kind === "qa" ? (
                  <div className="rounded-2xl bg-white/95 backdrop-blur px-3 py-2.5 shadow-xl min-w-[200px]">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Q&amp;A</p>
                    <p className="text-xs font-semibold text-foreground">{s.prompt}</p>
                    <div className="mt-1.5 text-[10px] text-muted-foreground italic">Type a response…</div>
                  </div>
                ) : (
                  <div className="rounded-full bg-black/70 text-white backdrop-blur px-3 py-1.5 shadow-xl flex items-center gap-2 max-w-[220px]">
                    <Music className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-xs font-semibold truncate">{s.title}</span>
                  </div>
                )}
                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => removeSticker(s.id)}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 grid place-items-center rounded-full bg-destructive text-destructive-foreground shadow">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {preview && (
          <>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setStickerSheet("poll")} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-card border border-border text-sm font-semibold">
                <BarChart3 className="h-4 w-4" /> Poll
              </button>
              <button onClick={() => setStickerSheet("qa")} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-card border border-border text-sm font-semibold">
                <MessageSquare className="h-4 w-4" /> Q&amp;A
              </button>
              <button onClick={() => setStickerSheet("music")} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-card border border-border text-sm font-semibold">
                <Music className="h-4 w-4" /> Music
              </button>
            </div>
            <div className="mt-3">
              <FilterStrip value={filter} onChange={setFilter} previewUrl={preview} />
            </div>
          </>
        )}

        <div className="mt-4 bg-card border border-border rounded-xl divide-y divide-border">
          <AudienceOption active={audience === "public"} onPick={() => setAudience("public")} icon={Globe} label="Everyone" desc="Anyone can see this story" />
          <AudienceOption active={audience === "close_friends"} onPick={() => setAudience("close_friends")} icon={Star} label="Close friends" desc="Only people in your close friends list" tint="emerald" />
        </div>
        <Link to="/close-friends" className="block text-xs text-primary font-semibold px-1 mt-2">Edit close friends list ›</Link>

        <button type="button" onClick={submit} disabled={busy}
          className="relative z-10 mt-8 mb-6 w-full h-14 rounded-2xl bg-primary text-white font-bold text-[15px] shadow-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50">
          {busy ? "Sharing Story..." : "Share Story"}
        </button>
      </div>

      <Sheet open={stickerSheet === "poll"} onOpenChange={(v) => !v && setStickerSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader><SheetTitle>Add poll</SheetTitle></SheetHeader>
          <div className="mt-3 space-y-2">
            <input value={pollQ} onChange={(e) => setPollQ(e.target.value)} placeholder="Ask a question…"
              className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none" maxLength={80} />
            {pollOpts.map((o, i) => (
              <div key={i} className="flex gap-2">
                <input value={o} onChange={(e) => setPollOpts((p) => p.map((x, j) => j === i ? e.target.value : x))}
                  placeholder={`Option ${i + 1}`} className="flex-1 bg-muted rounded-xl px-3 py-2.5 text-sm outline-none" maxLength={40} />
                {pollOpts.length > 2 && (
                  <button onClick={() => setPollOpts((p) => p.filter((_, j) => j !== i))} className="h-10 w-10 grid place-items-center rounded-xl bg-muted">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {pollOpts.length < 4 && (
              <button onClick={() => setPollOpts((p) => [...p, ""])} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                <Plus className="h-4 w-4" /> Add option
              </button>
            )}
            <button onClick={addPoll} className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Add poll</button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={stickerSheet === "qa"} onOpenChange={(v) => !v && setStickerSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader><SheetTitle>Ask a question</SheetTitle></SheetHeader>
          <div className="mt-3 space-y-2">
            <input value={qaPrompt} onChange={(e) => setQaPrompt(e.target.value)} placeholder="Ask me anything…"
              className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none" maxLength={100} />
            <button onClick={addQA} className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Add Q&amp;A</button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={stickerSheet === "music"} onOpenChange={(v) => !v && setStickerSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader><SheetTitle>Add music</SheetTitle></SheetHeader>
          <div className="mt-3 space-y-2">
            {["Chill Vibes — Lofi Boy", "Sunset Drive — Nova", "Neon Nights — Aether", "Golden Hour — Miya", "Rush — Kaide"].map((t) => (
              <button key={t} onClick={() => {
                setStickers((s) => [...s, { id: crypto.randomUUID(), kind: "music", x: 0.5, y: 0.15, title: t }]);
                setMusicTitle(""); setStickerSheet(null);
              }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted text-left">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-fuchsia-500 to-indigo-600 grid place-items-center"><Music className="h-5 w-5 text-white" /></div>
                <div className="flex-1"><p className="text-sm font-semibold">{t}</p><p className="text-xs text-muted-foreground">15s clip</p></div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

const AudienceOption = ({
  active, onPick, icon: Icon, label, desc, tint,
}: { active: boolean; onPick: () => void; icon: any; label: string; desc: string; tint?: "emerald" }) => (
  <button onClick={onPick} className="w-full flex items-center gap-3 p-3 text-left">
    <div className={`h-10 w-10 rounded-full grid place-items-center ${tint === "emerald" ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-foreground"}`}>
      <Icon className="h-5 w-5" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xs text-muted-foreground truncate">{desc}</p>
    </div>
    <span className={`h-5 w-5 rounded-full border-2 grid place-items-center ${active ? "bg-primary border-primary" : "border-border"}`}>
      {active && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
    </span>
  </button>
);

export default StoryCompose;

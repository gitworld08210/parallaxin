import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { Check, Sparkles } from "lucide-react";

type Story = { id: string; media_url: string; media_type: string; created_at: string };

export const NewHighlightSheet = ({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (b: boolean) => void; onCreated: () => void }) => {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      // Show ALL user's stories (active + expired) — IG-style.
      const { data } = await supabase.from("stories").select("id, media_url, media_type, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(60);
      setStories((data ?? []) as Story[]);
    })();
  }, [open, user?.id]);

  const toggle = (id: string) => {
    setPicked((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const create = async () => {
    if (!user) return;
    if (!title.trim()) return toast.error("Name your highlight");
    if (picked.size === 0) return toast.error("Pick at least one story");
    setBusy(true);
    const cover = stories.find((s) => picked.has(s.id))?.media_url ?? null;
    const { data: hl, error } = await supabase.from("highlights").insert({ user_id: user.id, title: title.trim().slice(0, 30), cover_url: cover }).select("id").single();
    if (error || !hl) { setBusy(false); toast.error(error?.message || "Failed"); return; }
    const rows = stories.filter((s) => picked.has(s.id)).map((s) => ({ highlight_id: (hl as any).id, story_id: s.id }));
    const { error: iErr } = await supabase.from("highlight_stories").insert(rows);
    setBusy(false);
    if (iErr) return toast.error(iErr.message);
    toast.success("Highlight saved");
    setTitle(""); setPicked(new Set());
    onOpenChange(false);
    onCreated();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-background border-t border-border rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-foreground text-left flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-aura" /> New highlight
          </SheetTitle>
        </SheetHeader>
        <input
          value={title} onChange={(e) => setTitle(e.target.value)}
          maxLength={30} placeholder="Title (e.g. Travel, Builds, 2026)"
          className="mt-3 w-full bg-card border border-border rounded-md px-3 py-2.5 text-sm outline-none"
        />
        <p className="text-xs text-muted-foreground mt-3 mb-2">Pick stories ({picked.size} selected)</p>
        <div className="grid grid-cols-3 gap-1.5 pb-2">
          {stories.length === 0 && <p className="col-span-3 text-sm text-muted-foreground text-center py-8">No stories yet.</p>}
          {stories.map((s) => {
            const on = picked.has(s.id);
            return (
              <button key={s.id} onClick={() => toggle(s.id)}
                className={`relative aspect-[9/16] bg-muted rounded-md overflow-hidden border-2 transition-colors ${on ? "border-primary" : "border-transparent"}`}>
                {s.media_type === "video" ? (
                  <video src={s.media_url} muted className="w-full h-full object-cover" />
                ) : (
                  <img src={s.media_url} alt="" className="w-full h-full object-cover" />
                )}
                {on && (
                  <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary grid place-items-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <button onClick={create} disabled={busy}
          className="mt-3 w-full py-3 rounded-md bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60">
          {busy ? "Saving…" : "Save highlight"}
        </button>
      </SheetContent>
    </Sheet>
  );
};

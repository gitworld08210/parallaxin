import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ImagePlus, Sparkles, X, FileText, Calendar, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { TopBar } from "@/components/vibe/TopBar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";

const Compose = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<string>(""); // datetime-local

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const aiCaption = async () => {
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-caption", {
        body: { hint: content || "creator post" },
      });
      if (error) throw error;
      if (data?.caption) setContent(data.caption);
    } catch (e: any) {
      toast.error(e.message || "AI failed");
    } finally { setAiBusy(false); }
  };

  const uploadMedia = async () => {
    if (!file || !user) return { media_url: null, media_type: null };
    const ext = file.name.split(".").pop() || "bin";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("post-media").upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from("post-media").getPublicUrl(path);
    return { media_url: data.publicUrl, media_type: file.type.startsWith("video") ? "video" : "image" };
  };

  const insertPost = async (status: "draft" | "scheduled" | "published", scheduled_for: string | null) => {
    if (!user) return;
    if (!content.trim() && !file) return toast.error("Add a thought or media");
    setBusy(true);
    try {
      if (status === "published" && content.trim()) {
        const { data: mod } = await supabase.functions.invoke("ai-moderate", { body: { text: content } });
        if (mod?.flagged) throw new Error(mod.reason || "Content flagged by moderation");
      }
      const { media_url, media_type } = await uploadMedia();
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: content.trim(),
        media_url, media_type,
        status: status as any,
        scheduled_for,
      } as any);
      if (error) throw error;
      if (status === "published") { toast.success("Posted ✦"); nav("/"); }
      else if (status === "draft") { toast.success("Draft saved"); nav("/drafts"); }
      else { toast.success(`Scheduled for ${new Date(scheduled_for!).toLocaleString()}`); nav("/drafts"); }
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally { setBusy(false); }
  };

  const submit = () => insertPost("published", null);
  const saveDraft = () => insertPost("draft", null);
  const schedule = () => {
    if (!scheduledFor) return toast.error("Pick a date and time");
    const iso = new Date(scheduledFor).toISOString();
    if (new Date(iso).getTime() <= Date.now()) return toast.error("Pick a future time");
    setScheduleOpen(false);
    insertPost("scheduled", iso);
  };

  return (
    <div>
      <TopBar
        title="New post"
        right={
          <>
            <Link to="/drafts" className="p-2" aria-label="Drafts">
              <FileText className="h-5 w-5 text-foreground" strokeWidth={1.75} />
            </Link>
            <button onClick={() => nav(-1)} className="p-2" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </>
        }
      />

      <div className="px-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share something…"
          maxLength={1000}
          rows={5}
          className="w-full bg-card border border-border rounded-xl p-4 text-sm outline-none resize-none"
        />

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <label className="bg-muted rounded-md px-3 py-1.5 text-xs font-semibold flex items-center gap-2 cursor-pointer">
            <ImagePlus className="h-4 w-4" /> Media
            <input type="file" accept="image/*,video/*" className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <button disabled={aiBusy} onClick={aiCaption}
            className="bg-muted rounded-md px-3 py-1.5 text-xs font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {aiBusy ? "Generating…" : "AI caption"}
          </button>
        </div>

        {preview && (
          <div className="mt-4 relative rounded-xl overflow-hidden bg-muted">
            {file?.type.startsWith("video") ? (
              <video src={preview} controls className="w-full max-h-[400px] object-cover" />
            ) : (
              <img src={preview} className="w-full max-h-[400px] object-cover" alt="" />
            )}
            <button onClick={() => setFile(null)}
              className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-black/60 text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="mt-6 grid grid-cols-3 gap-2">
          <button onClick={saveDraft} disabled={busy}
            className="py-3 rounded-md bg-muted text-foreground font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-60">
            <FileText className="h-4 w-4" /> Draft
          </button>
          <button onClick={() => setScheduleOpen(true)} disabled={busy}
            className="py-3 rounded-md bg-muted text-foreground font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-60">
            <Calendar className="h-4 w-4" /> Schedule
          </button>
          <button onClick={submit} disabled={busy}
            className="py-3 rounded-md bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60">
            {busy ? "Posting…" : "Post"}
          </button>
        </div>
      </div>

      <Sheet open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <SheetContent side="bottom" className="bg-background border-t border-border rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-foreground text-left flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Schedule post
            </SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-3">
            <label className="block text-xs text-muted-foreground font-semibold uppercase">Publish at</label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full bg-card border border-border rounded-md px-3 py-2.5 text-sm outline-none"
            />
            <button onClick={schedule} disabled={busy || !scheduledFor}
              className="w-full py-3 rounded-md bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60">
              Schedule
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Compose;

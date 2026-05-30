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
  const [altBusy, setAltBusy] = useState(false);
  const [altText, setAltText] = useState("");
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

  const suggestAlt = async () => {
    if (!file || !user) return toast.error("Add an image first");
    if (file.type.startsWith("video")) return toast.error("Alt text is for images");
    setAltBusy(true);
    try {
      // Upload to a temp public URL so the model can read it
      const ext = file.name.split(".").pop() || "jpg";
      const path = `alt-tmp/${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("post-media").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("post-media").getPublicUrl(path);
      const { data, error } = await supabase.functions.invoke("suggest-alt-text", { body: { imageUrl: pub.publicUrl } });
      if (error) throw error;
      if (data?.altText) setAltText(data.altText);
      else toast.error("No suggestion returned");
    } catch (e: any) {
      toast.error(e.message || "Alt text failed");
    } finally { setAltBusy(false); }
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
          <div className="mt-4 space-y-2">
            <div className="relative rounded-xl overflow-hidden bg-muted">
              {file?.type.startsWith("video") ? (
                <video src={preview} controls className="w-full max-h-[400px] object-cover" />
              ) : (
                <img src={preview} className="w-full max-h-[400px] object-cover" alt={altText || ""} />
              )}
              <button onClick={() => { setFile(null); setAltText(""); }}
                className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-black/60 text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            {file && !file.type.startsWith("video") && (
              <div className="flex items-start gap-2">
                <textarea
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Alt text (for accessibility)"
                  rows={2}
                  maxLength={200}
                  className="flex-1 bg-card border border-border rounded-md px-3 py-2 text-xs outline-none resize-none"
                />
                <button onClick={suggestAlt} disabled={altBusy}
                  className="shrink-0 bg-muted rounded-md px-3 py-2 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {altBusy ? "…" : "Suggest"}
                </button>
              </div>
            )}
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

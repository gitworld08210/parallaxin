import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImagePlus, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { TopBar } from "@/components/vibe/TopBar";
import { toast } from "sonner";

const Compose = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

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

  const submit = async () => {
    if (!user) return;
    if (!content.trim() && !file) return toast.error("Add a thought or media");
    setBusy(true);
    try {
      // Moderate text first
      if (content.trim()) {
        const { data: mod } = await supabase.functions.invoke("ai-moderate", { body: { text: content } });
        if (mod?.flagged) {
          throw new Error(mod.reason || "Content flagged by moderation");
        }
      }

      let media_url: string | null = null;
      let media_type: "image" | "video" | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("post-media").upload(path, file, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("post-media").getPublicUrl(path);
        media_url = data.publicUrl;
        media_type = file.type.startsWith("video") ? "video" : "image";
      }
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: content.trim(),
        media_url, media_type,
      });
      if (error) throw error;
      toast.success("Posted ✦");
      nav("/");
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div>
      <TopBar
        subtitle="Create"
        title="New post"
        right={
          <button onClick={() => nav(-1)} className="glass h-11 w-11 rounded-full grid place-items-center" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        }
      />

      <div className="px-5">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share something cinematic…"
          maxLength={1000}
          rows={5}
          className="w-full glass rounded-2xl p-4 text-sm outline-none resize-none"
        />

        <div className="mt-3 flex items-center gap-2">
          <label className="glass-strong rounded-full px-4 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer">
            <ImagePlus className="h-4 w-4" />
            Media
            <input
              type="file" accept="image/*,video/*" className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            disabled={aiBusy}
            onClick={aiCaption}
            className="glass-strong rounded-full px-4 py-2 text-xs font-semibold flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            {aiBusy ? "Generating…" : "AI caption"}
          </button>
        </div>

        {preview && (
          <div className="mt-4 relative rounded-2xl overflow-hidden">
            {file?.type.startsWith("video") ? (
              <video src={preview} controls className="w-full max-h-[400px] object-cover" />
            ) : (
              <img src={preview} className="w-full max-h-[400px] object-cover" alt="" />
            )}
            <button
              onClick={() => setFile(null)}
              className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full glass-strong"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className="mt-6 w-full py-3 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-sm shadow-glow disabled:opacity-60"
        >
          {busy ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
};

export default Compose;

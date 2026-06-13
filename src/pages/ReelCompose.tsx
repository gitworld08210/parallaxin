import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Film, Sparkles, X, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { TopBar } from "@/components/vibe/TopBar";
import { toast } from "sonner";

const ReelCompose = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [certify, setCertify] = useState(false);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const aiCaption = async () => {
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-caption", { body: { hint: content || "short reel video" } });
      if (error) throw error;
      if (data?.caption) setContent(data.caption);
    } catch (e: any) { toast.error(e.message || "AI failed"); } finally { setAiBusy(false); }
  };

  const submit = async () => {
    if (!user) return;
    if (!file) return toast.error("Add a video");
    setBusy(true);
    try {
      if (content.trim()) {
        const { data: mod } = await supabase.functions.invoke("ai-moderate", { body: { text: content } });
        if (mod?.flagged) throw new Error(mod.reason || "Caption flagged by moderation");
      }
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("post-media").upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("post-media").getPublicUrl(path);
      const { data: inserted, error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: content.trim(),
        media_url: data.publicUrl,
        media_type: "video",
        is_reel: true,
      }).select("id").single();
      if (error) throw error;
      if (certify && inserted?.id) {
        supabase.functions.invoke("ownership-certify", { body: { post_id: inserted.id } })
          .then(({ error: cErr }) => { if (cErr) toast.error("Certificate failed: " + cErr.message); })
          .catch(() => {});
      }
      if (inserted?.id) {
        supabase.functions.invoke("authenticity-score", { body: { post_id: inserted.id } }).catch(() => {});
      }
      toast.success("Reel posted ✦");
      nav("/reels");
    } catch (e: any) { toast.error(e.message || "Failed"); } finally { setBusy(false); }
  };

  return (
    <div>
      <TopBar
        subtitle="Create"
        title="New reel"
        right={<button onClick={() => nav(-1)} className="glass h-11 w-11 rounded-full grid place-items-center"><X className="h-5 w-5" /></button>}
      />

      <div className="px-5">
        {!preview ? (
          <label className="block aspect-[9/16] rounded-3xl glass-strong border-2 border-dashed border-border grid place-items-center cursor-pointer">
            <div className="text-center px-6">
              <Film className="h-10 w-10 mx-auto mb-3 text-primary" />
              <p className="font-display text-xl">Pick a vertical video</p>
              <p className="text-xs text-muted-foreground mt-1">9:16 looks best · up to 60s</p>
            </div>
            <input type="file" accept="video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        ) : (
          <div className="relative rounded-3xl overflow-hidden aspect-[9/16] bg-black">
            <video src={preview} controls loop className="w-full h-full object-cover" />
            <button onClick={() => setFile(null)} className="absolute top-2 right-2 h-9 w-9 grid place-items-center rounded-full bg-black/60 text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a caption…"
          rows={3}
          maxLength={500}
          className="mt-4 w-full glass rounded-2xl p-4 text-sm outline-none resize-none"
        />

        <div className="mt-3 flex">
          <button
            disabled={aiBusy}
            onClick={aiCaption}
            className="glass-strong rounded-full px-4 py-2 text-xs font-semibold flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            {aiBusy ? "Generating…" : "AI caption"}
          </button>
        </div>

        <label className="mt-3 flex items-start gap-3 p-3 rounded-2xl glass cursor-pointer">
          <input type="checkbox" checked={certify} onChange={(e) => setCertify(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
          <div className="flex-1">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" /> Generate ownership certificate
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              SHA-256 + OpenTimestamps proof. Not a copyright filing.
            </p>
          </div>
        </label>

        <button
          onClick={submit}
          disabled={busy}
          className="mt-6 w-full py-3 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-sm shadow-glow disabled:opacity-60"
        >
          {busy ? "Posting…" : "Share reel"}
        </button>
      </div>
    </div>
  );
};

export default ReelCompose;

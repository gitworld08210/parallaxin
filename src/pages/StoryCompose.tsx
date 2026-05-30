import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImagePlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { TopBar } from "@/components/vibe/TopBar";
import { toast } from "sonner";

const StoryCompose = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const submit = async () => {
    if (!user || !file) return toast.error("Pick a photo or video");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/stories/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("post-media").upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("post-media").getPublicUrl(path);
      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        media_url: data.publicUrl,
        media_type: file.type.startsWith("video") ? "video" : "image",
      });
      if (error) throw error;
      toast.success("Story added ✦ · expires in 24h");
      nav("/");
    } catch (e: any) { toast.error(e.message || "Failed"); } finally { setBusy(false); }
  };

  return (
    <div>
      <TopBar
        subtitle="Story"
        title="Add to story"
        right={<button onClick={() => nav(-1)} className="glass h-11 w-11 rounded-full grid place-items-center"><X className="h-5 w-5" /></button>}
      />
      <div className="px-5">
        {!preview ? (
          <label className="block aspect-[9/16] rounded-3xl glass-strong border-2 border-dashed border-border grid place-items-center cursor-pointer">
            <div className="text-center px-6">
              <ImagePlus className="h-10 w-10 mx-auto mb-3 text-primary" />
              <p className="font-display text-xl">Pick a photo or video</p>
              <p className="text-xs text-muted-foreground mt-1">Disappears in 24 hours</p>
            </div>
            <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        ) : (
          <div className="relative rounded-3xl overflow-hidden aspect-[9/16] bg-black">
            {file?.type.startsWith("video") ? (
              <video src={preview} autoPlay loop muted playsInline className="w-full h-full object-cover" />
            ) : (
              <img src={preview} className="w-full h-full object-cover" alt="" />
            )}
            <button onClick={() => setFile(null)} className="absolute top-2 right-2 h-9 w-9 grid place-items-center rounded-full bg-black/60 text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className="mt-6 w-full py-3 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-sm shadow-glow disabled:opacity-60"
        >
          {busy ? "Sharing…" : "Share story"}
        </button>
      </div>
    </div>
  );
};

export default StoryCompose;

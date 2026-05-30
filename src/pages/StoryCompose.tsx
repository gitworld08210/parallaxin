import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ImagePlus, X, Globe, Star } from "lucide-react";
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
  const [audience, setAudience] = useState<"public" | "close_friends">("public");

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
        audience: audience as any,
      } as any);
      if (error) throw error;
      toast.success("Story added ✦ · expires in 24h");
      nav("/");
    } catch (e: any) { toast.error(e.message || "Failed"); } finally { setBusy(false); }
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
          <div className="relative rounded-xl overflow-hidden aspect-[9/16] bg-black">
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

        {/* Audience picker */}
        <div className="mt-4 bg-card border border-border rounded-xl divide-y divide-border">
          <AudienceOption
            active={audience === "public"}
            onPick={() => setAudience("public")}
            icon={Globe}
            label="Everyone"
            desc="Anyone can see this story"
          />
          <AudienceOption
            active={audience === "close_friends"}
            onPick={() => setAudience("close_friends")}
            icon={Star}
            label="Close friends"
            desc="Only people in your close friends list"
            tint="emerald"
          />
        </div>
        <Link to="/close-friends" className="block text-xs text-primary font-semibold px-1 mt-2">Edit close friends list ›</Link>

        <button
          onClick={submit}
          disabled={busy}
          className="mt-6 w-full py-3 rounded-md bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60"
        >
          {busy ? "Sharing…" : "Share story"}
        </button>
      </div>
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

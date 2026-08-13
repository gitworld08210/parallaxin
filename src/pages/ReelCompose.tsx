import { reliableInvoke } from "@/lib/reliableInvoke";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Film, Sparkles, X, ShieldCheck, Music, Wand2, Camera, ImagePlus } from "lucide-react";

import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { FilterStrip, FilterKey, filterCss } from "@/components/compose/FilterStrip";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { supabase } from "@/integrations/supabase/client";

const ReelCompose = () => {
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [certify, setCertify] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("none");
  const [musicSheet, setMusicSheet] = useState(false);
  const [music, setMusic] = useState<string | null>(null);
  const [step, setStep] = useState<"capture" | "edit" | "publish">("capture");

  useEffect(() => {
    if (!file) { setPreview(null); setThumb(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    // capture a thumbnail frame from the video
    const video = document.createElement("video");
    video.src = url; video.muted = true; video.playsInline = true;
    video.addEventListener("loadeddata", () => {
      video.currentTime = Math.min(1, (video.duration || 2) / 3);
    });
    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 180; canvas.height = 320;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setThumb(canvas.toDataURL("image/jpeg", 0.8));
      }
    });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => { if (file) setStep("edit"); }, [file]);

  const aiCaption = async () => {
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-reel-caption", { body: { content } });
      if (error) throw error;
      if (data?.caption) setContent(data.caption);
    } catch (e: any) { toast.error(e.message || "Action failed"); } finally { setAiBusy(false); }
  };

  const submit = async () => {
    if (!user) return;
    if (!file) return toast.error("Add a video");
    setBusy(true);
    try {
      if (content.trim()) {
        const { data: mod } = await supabase.functions.invoke("moderate-caption", { body: { text: content.trim() } });
        if (mod?.flagged) throw new Error(mod.reason || "Caption flagged");
      }
      const url = await uploadToCloudinary(file);
      const { doc, addDoc, collection, serverTimestamp } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      
      const postRef = await addDoc(collection(db, "posts"), {
        user_id: user.id,
        content: content.trim() + (music ? `\n\n🎵 ${music}` : ""),
        media_url: url,
        media_type: "video",
        is_reel: true,
        status: "published",
        like_count: 0,
        comment_count: 0,
        created_at: serverTimestamp(),
        profile: {
          username: profile?.username || "",
          display_name: profile?.display_name || "User",
          avatar_url: profile?.avatar_url || null,
          verified: !!profile?.verified,
        }
      });
      const newId = postRef.id;
      if (certify && newId) {
        void reliableInvoke("ownership-certify", { body: { post_id: newId }, retries: 1 });
      }
      if (newId) {
        void reliableInvoke("authenticity-score", { body: { post_id: newId }, retries: 1 });
      }
      toast.success("Reel posted ✦");
      nav("/reels");
    } catch (e: any) { toast.error(e.message || "Action failed"); } finally { setBusy(false); }
  };

  // ---------- CAPTURE (TikTok style empty state) ----------
  if (step === "capture" || !preview) {
    return (
      <div className="fixed inset-0 bg-black text-white flex flex-col max-w-md mx-auto">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => nav(-1)} className="h-10 w-10 grid place-items-center rounded-full bg-white/10"><X className="h-5 w-5" /></button>
          <p className="text-sm font-semibold">New Reel</p>
          <div className="w-10" />
        </div>

        <div className="flex-1 grid place-items-center px-6 text-center">
          <div>
            <div className="h-24 w-24 mx-auto rounded-full bg-gradient-to-br from-fuchsia-500 via-pink-500 to-red-500 grid place-items-center shadow-2xl">
              <Film className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold mt-6">Create a reel</h1>
            <p className="text-white/70 text-sm mt-2">9:16 vertical · up to 60s. Add music, filters, and go.</p>
          </div>
        </div>

        <div className="p-6 space-y-3">
          <button onClick={() => cameraRef.current?.click()}
            className="w-full h-14 rounded-2xl bg-white text-black font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition">
            <Camera className="h-5 w-5" /> Record now
          </button>
          <button onClick={() => inputRef.current?.click()}
            className="w-full h-14 rounded-2xl bg-white/10 text-white font-semibold flex items-center justify-center gap-2 border border-white/20">
            <ImagePlus className="h-5 w-5" /> Upload from gallery
          </button>
        </div>

        <input ref={cameraRef} type="file" accept="video/*" capture="user" className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <input ref={inputRef} type="file" accept="video/*" className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
    );
  }

  // ---------- EDIT (filters, music) ----------
  if (step === "edit") {
    return (
      <div className="fixed inset-0 bg-black text-white flex flex-col max-w-md mx-auto">
        <div className="flex items-center justify-between p-3 z-10">
          <button onClick={() => { setFile(null); setStep("capture"); }} className="h-10 w-10 grid place-items-center rounded-full bg-white/10"><X className="h-5 w-5" /></button>
          <button onClick={() => setStep("publish")} className="rounded-full bg-white text-black text-sm font-bold px-5 py-2">Next</button>
        </div>

        <div className="flex-1 relative overflow-hidden">
          <video src={preview!} autoPlay loop playsInline muted className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: filterCss(filter) }} />

          {/* Right rail */}
          <div className="absolute right-3 bottom-32 flex flex-col gap-4">
            <RailBtn icon={Music} label="Music" onClick={() => setMusicSheet(true)} />
            <RailBtn icon={Wand2} label="Effects" onClick={() => toast("More effects coming soon")} />
          </div>

          {music && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs">
              <Music className="h-3.5 w-3.5" /> {music}
            </div>
          )}
        </div>

        <div className="p-3 bg-black/60 backdrop-blur">
          <FilterStrip value={filter} onChange={setFilter} previewUrl={thumb} />
        </div>

        <Sheet open={musicSheet} onOpenChange={setMusicSheet}>
          <SheetContent side="bottom" className="bg-neutral-950 text-white border-t border-white/10 rounded-t-3xl max-w-md mx-auto">
            <SheetHeader><SheetTitle className="text-white flex items-center gap-2"><Music className="h-4 w-4" /> Add music</SheetTitle></SheetHeader>
            <div className="mt-3 space-y-2">
              {["Chill Vibes — Lofi Boy", "Sunset Drive — Nova", "Neon Nights — Aether", "Golden Hour — Miya", "Rush — Kaide"].map((t) => (
                <button key={t} onClick={() => { setMusic(t); setMusicSheet(false); toast.success("Music added"); }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 text-left">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-fuchsia-500 to-indigo-600 grid place-items-center"><Music className="h-5 w-5" /></div>
                  <div className="flex-1"><p className="text-sm font-semibold">{t}</p><p className="text-xs text-white/60">15s clip · trending</p></div>
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // ---------- PUBLISH ----------
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={() => setStep("edit")} className="h-10 w-10 grid place-items-center rounded-full bg-muted"><X className="h-5 w-5" /></button>
        <p className="font-semibold">Post</p>
        <div className="w-10" />
      </div>
      <div className="p-4 flex gap-3">
        <div className="w-24 aspect-[9/16] rounded-xl overflow-hidden bg-black shrink-0">
          {thumb ? <img src={thumb} className="w-full h-full object-cover" style={{ filter: filterCss(filter) }} /> :
            <video src={preview!} className="w-full h-full object-cover" style={{ filter: filterCss(filter) }} />}
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a caption…"
          rows={5}
          maxLength={500}
          className="flex-1 bg-zinc-900 border border-white/5 rounded-2xl p-4 text-[15px] outline-none resize-none focus:border-primary/50 transition-colors"
        />
      </div>

      <div className="px-4 mt-2 flex flex-wrap gap-2">
        <button disabled={aiBusy} onClick={aiCaption} className="bg-muted rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />{aiBusy ? "…" : "AI caption"}
        </button>
        {music && (
          <span className="bg-muted rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5">
            <Music className="h-3.5 w-3.5" /> {music}
            <button onClick={() => setMusic(null)} className="opacity-60">×</button>
          </span>
        )}
      </div>

      <label className="mx-4 mt-4 flex items-start gap-3 p-4 rounded-2xl border border-white/5 bg-zinc-900 cursor-pointer hover:bg-zinc-800 transition-colors">
        <input type="checkbox" checked={certify} onChange={(e) => setCertify(e.target.checked)} className="mt-1 h-4 w-4 rounded border-white/20 bg-black text-primary focus:ring-primary" />
        <div className="flex-1">
          <p className="text-[14px] font-bold flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-primary" /> Ownership certificate
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">SHA-256 + OpenTimestamps proof.</p>
        </div>
      </label>

      <div className="px-4 mt-6">
        <button onClick={submit} disabled={busy}
          className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-[15px] shadow-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50">
          {busy ? "Sharing Reel..." : "Share Reel"}
        </button>
      </div>
    </div>
  );
};

const RailBtn = ({ icon: Icon, label, onClick }: any) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1 text-[10px] font-semibold">
    <span className="h-11 w-11 rounded-full bg-black/50 backdrop-blur grid place-items-center border border-white/20">
      <Icon className="h-5 w-5" />
    </span>
    {label}
  </button>
);

export default ReelCompose;

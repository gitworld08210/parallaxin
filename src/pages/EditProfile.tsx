import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Upload, Sparkles } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { gradientFor, initialsOf } from "@/lib/format";
import { toast } from "sonner";
import { uploadToCloudinary } from "@/lib/cloudinary";



const EditProfile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const nav = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bioAiBusy, setBioAiBusy] = useState(false);
  const [bioVariants, setBioVariants] = useState<Array<{ style: string; text: string }>>([]);

  const rewriteBio = async () => {
    setBioAiBusy(true);
    setBioVariants([]);
    try {
      const { data, error } = await supabase.functions.invoke("ai-bio-rewrite", {
        body: { bio, display_name: displayName, niche: "" },
      });
      if (error) throw error;
      const variants = data?.variants ?? [];
      if (!variants.length) toast.error("No suggestions — try again.");
      setBioVariants(variants);
    } catch (e: any) {
      toast.error(e?.message || "AI failed");
    } finally {
      setBioAiBusy(false);
    }
  };

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setUsername(profile.username);
      setBio(profile.bio || "");
      setAvatar(profile.avatar_url);
      setCover((profile as any).cover_url ?? null);
    }
  }, [profile]);


  const uploadImage = async (file: File, kind: "avatar" | "cover") => {
    if (!user) return;
    setBusy(true);
    try {
      const url = await uploadToCloudinary(file);
      if (kind === "avatar") setAvatar(url);
      else setCover(url);

    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName, username, bio, avatar_url: avatar, cover_url: cover,
    } as any).eq("user_id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success("Profile saved");
    nav("/profile");
  };

  if (!profile) return <p className="p-10 text-center text-sm text-muted-foreground">Loading…</p>;

  return (
    <div>
      <TopBar
        subtitle="Settings"
        title="Edit profile"
        right={
          <button onClick={() => nav(-1)} className="glass h-11 w-11 rounded-full grid place-items-center">
            <ChevronLeft className="h-5 w-5" />
          </button>
        }
      />
      <div className="px-5 space-y-4">
        {/* Cover banner */}
        <div className="relative h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/30 to-accent/30 border border-border">
          {cover && <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />}
          <label className="absolute bottom-2 right-2 glass-strong rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
            <Upload className="h-3.5 w-3.5" /> {cover ? "Change banner" : "Add banner"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "cover")} />
          </label>
          {cover && (
            <button onClick={() => setCover(null)} className="absolute bottom-2 left-2 glass-strong rounded-full px-3 py-1.5 text-xs font-semibold">
              Remove
            </button>
          )}
        </div>

        <div className="flex flex-col items-center gap-3 -mt-12">
          {avatar ? (
            <img src={avatar} alt="" className="h-24 w-24 rounded-full object-cover ring-4 ring-background shadow-glow" />
          ) : (
            <AuraAvatar gradient={gradientFor(username)} size="lg" glow initials={initialsOf(displayName || username)} />
          )}
          <label className="glass-strong rounded-full px-4 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer">
            <Upload className="h-4 w-4" /> Change avatar
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "avatar")} />
          </label>
        </div>


        <Field label="Display name" value={displayName} onChange={setDisplayName} maxLength={50} />
        <Field label="Username" value={username} onChange={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ""))} maxLength={24} />
        <div>
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Bio</label>
            <button
              type="button"
              onClick={rewriteBio}
              disabled={bioAiBusy}
              className="text-[10px] uppercase tracking-widest text-primary flex items-center gap-1 disabled:opacity-50"
            >
              <Sparkles className="h-3 w-3" />
              {bioAiBusy ? "Thinking…" : "AI rewrite"}
            </button>
          </div>
          <textarea
            value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} rows={3}
            className="mt-1 w-full glass rounded-2xl p-3 text-sm outline-none resize-none"
          />
          {bioVariants.length > 0 && (
            <div className="mt-2 space-y-2">
              {bioVariants.map((v, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setBio(v.text); setBioVariants([]); }}
                  className="w-full text-left glass rounded-2xl p-3 text-sm hover:bg-muted/40 transition-colors"
                >
                  <div className="text-[10px] uppercase tracking-widest text-primary mb-1">{v.style}</div>
                  <div>{v.text}</div>
                </button>
              ))}
            </div>
          )}
        </div>






        <button onClick={save} disabled={busy} className="w-full py-3 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-sm shadow-glow">
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, maxLength }: any) => (
  <div>
    <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label>
    <input value={value} onChange={(e) => onChange(e.target.value)} maxLength={maxLength}
      className="mt-1 w-full glass rounded-2xl px-4 py-3 text-sm outline-none" />
  </div>
);

export default EditProfile;

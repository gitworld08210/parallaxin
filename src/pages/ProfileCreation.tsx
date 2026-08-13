import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { db, storage } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { Camera, ChevronRight, User, AtSign, MapPin, Link as LinkIcon } from "lucide-react";

const ProfileCreation = () => {
  const { user, refreshProfile } = useAuth();
  const nav = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!username.trim() || !displayName.trim()) {
      toast.error("Username and Display Name are required");
      return;
    }

    setBusy(true);
    try {
      let avatarUrl = null;
      if (avatar) {
        const avatarRef = ref(storage, `avatars/${user.uid}_${Date.now()}`);
        await uploadBytes(avatarRef, avatar);
        avatarUrl = await getDownloadURL(avatarRef);
      }

      const profileData = {
        display_name: displayName.trim(),
        username: username.trim().toLowerCase().replace(/[^a-z0-9._]/g, ""),
        bio: bio.trim(),
        location: location.trim(),
        website: website.trim(),
        avatar_url: avatarUrl,
        updated_at: serverTimestamp(),
      };

      await setDoc(doc(db, "profiles", user.uid), profileData, { merge: true });
      if (refreshProfile) await refreshProfile();
      
      toast.success("Profile created!");
      nav("/onboarding");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to create profile");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center p-6 pt-12 relative overflow-x-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px] relative z-10"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Create your profile</h1>
          <p className="text-muted-foreground">This is how others will see you on Aurelix</p>
        </div>

        <form onSubmit={handleCreate} className="space-y-6">
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              <div className="h-28 w-28 rounded-full bg-[#111] border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-lg pointer-events-none">
                <Camera className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Tap to upload photo</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                <User className="h-5 w-5" />
              </div>
              <input 
                required
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Display Name"
                className="w-full bg-[#111] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-[15px] outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                <AtSign className="h-5 w-5" />
              </div>
              <input 
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full bg-[#111] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-[15px] outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            <div className="relative">
              <textarea 
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Bio (optional)"
                className="w-full bg-[#111] border border-white/5 rounded-2xl px-4 py-4 text-[15px] outline-none focus:border-primary/50 transition-colors min-h-[100px] resize-none"
              />
            </div>

            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                <MapPin className="h-5 w-5" />
              </div>
              <input 
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Location (optional)"
                className="w-full bg-[#111] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-[15px] outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                <LinkIcon className="h-5 w-5" />
              </div>
              <input 
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="Website (optional)"
                className="w-full bg-[#111] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-[15px] outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={busy || !username || !displayName}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-2xl shadow-glow transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? "Saving..." : "Create Profile"}
            {!busy && <ChevronRight className="h-5 w-5" />}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default ProfileCreation;

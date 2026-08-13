import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db, storage } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { Camera, User, AtSign, MapPin, Link as LinkIcon } from "lucide-react";

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

  // Check if profile already exists and redirect
  useEffect(() => {
    const checkProfile = async () => {
      if (!user) return;
      const snap = await getDoc(doc(db, "profiles", user.uid));
      if (snap.exists() && (snap.data().display_name || snap.data().username)) {
        nav("/", { replace: true });
      }
    };
    checkProfile();
  }, [user, nav]);

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
    if (!displayName.trim()) {
      toast.error("Display Name is required");
      return;
    }

    setBusy(true);
    try {
      let avatarUrl = null;
      if (avatar) {
        try {
          const avatarRef = ref(storage, `avatars/${user.uid}_${Date.now()}`);
          await uploadBytes(avatarRef, avatar);
          avatarUrl = await getDownloadURL(avatarRef);
        } catch (upErr) {
          console.warn("Avatar upload skipped:", upErr);
        }
      }

      // Generate a default username if not provided
      const rawUsername = username.trim() || displayName.trim();
      const baseUsername = rawUsername.toLowerCase().replace(/[^a-z0-9._]/g, "");
      const finalUsername = username.trim()
        ? baseUsername
        : `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;

      const profileData: Record<string, any> = {
        id: user.uid,
        user_id: user.uid,
        display_name: displayName.trim(),
        username: finalUsername,
        bio: bio.trim(),
        location: location.trim(),
        website: website.trim(),
        updated_at: serverTimestamp(),
        onboarded_at: serverTimestamp(),
      };
      if (avatarUrl) profileData.avatar_url = avatarUrl;

      await setDoc(doc(db, "profiles", user.uid), profileData, { merge: true });

      // Username index is best-effort — never block onboarding on it
      try {
        await setDoc(doc(db, "usernames", finalUsername), {
          user_id: user.uid,
          uid: user.uid,
          updated_at: serverTimestamp(),
        }, { merge: true });
      } catch (idxErr) {
        console.warn("Username index skipped:", idxErr);
      }

      if (refreshProfile) await refreshProfile();
      toast.success("Profile created!");
      nav("/", { replace: true });
    } catch (error: any) {
      console.error("Profile creation error:", error);
      toast.error(error.message || "Failed to create profile");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[360px] bg-black sm:border sm:border-white/10 sm:rounded-[2.5rem] p-8 sm:p-10 flex flex-col items-center z-10"
      >
        <h1 className="text-3xl font-black mb-2 tracking-tight">Setup Profile</h1>
        <p className="text-zinc-500 text-xs font-bold mb-10 text-center uppercase tracking-widest">Identify yourself in Parallax</p>
        
        <div className="relative mb-10 group">
          <div className="h-28 w-28 rounded-full bg-zinc-900 border-2 border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/50">
            {avatarPreview ? (
              <img src={avatarPreview} className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-8 w-8 text-zinc-700" />
            )}
          </div>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleAvatarChange} 
            className="absolute inset-0 opacity-0 cursor-pointer" 
          />
          <div className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-lg pointer-events-none border-2 border-black">
            <Camera className="h-4 w-4 text-white" />
          </div>
        </div>

        <p className="text-zinc-500 text-[10px] mb-6 text-center italic opacity-60">
          Only Display Name is mandatory. You can skip the rest.
        </p>

        <form onSubmit={handleCreate} className="w-full space-y-4">
          <div className="space-y-3">
            <input 
              required 
              value={displayName} 
              onChange={e => setDisplayName(e.target.value)} 
              placeholder="Display Name" 
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 transition-all placeholder:text-zinc-600" 
            />
            <input 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="Username (Optional)" 
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 transition-all placeholder:text-zinc-600" 
            />
            <textarea 
              value={bio} 
              onChange={e => setBio(e.target.value)} 
              placeholder="Tell us about yourself..." 
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 transition-all placeholder:text-zinc-600 h-28 resize-none" 
            />
          </div>

          <button 
            type="submit" 
            disabled={busy} 
            className="w-full bg-primary text-white font-black py-4 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 mt-4"
          >
            {busy ? "Finalizing..." : "Enter Parallax"}
          </button>
          
          <button 
            type="button"
            onClick={handleCreate}
            className="w-full py-2 text-xs font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest mt-2"
          >
            Skip for now
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default ProfileCreation;
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
      if (snap.exists() && snap.data().username) {
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

      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9._]/g, "");
      
      const profileData = {
        id: user.uid,
        user_id: user.uid,
        display_name: displayName.trim(),
        username: cleanUsername,
        bio: bio.trim(),
        location: location.trim(),
        website: website.trim(),
        avatar_url: avatarUrl,
        updated_at: serverTimestamp(),
        onboarded_at: serverTimestamp(),
      };

      await setDoc(doc(db, "profiles", user.uid), profileData, { merge: true });
      await setDoc(doc(db, "usernames", cleanUsername), { uid: user.uid, updated_at: serverTimestamp() });

      if (refreshProfile) await refreshProfile();
      toast.success("Profile created!");
      nav("/", { replace: true });
    } catch (error: any) {
      toast.error(error.message || "Failed to create profile");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative">
      <div className="w-full max-w-[400px] bg-black border border-white/10 rounded-[2.5rem] p-10 flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-8">Create Profile</h1>
        
        <div className="relative mb-8 group">
          <div className="h-24 w-24 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden">
            {avatarPreview ? <img src={avatarPreview} className="h-full w-full object-cover" /> : <Camera className="h-6 w-6 text-zinc-500" />}
          </div>
          <input type="file" accept="image/*" onChange={handleAvatarChange} className="absolute inset-0 opacity-0 cursor-pointer" />
        </div>

        <form onSubmit={handleCreate} className="w-full space-y-4">
          <input required value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Full Name" className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-primary/50" />
          <input required value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-primary/50" />
          <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Bio" className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-primary/50 h-24 resize-none" />
          <button type="submit" disabled={busy} className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all">
            {busy ? "Saving..." : "Start Exploring"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileCreation;
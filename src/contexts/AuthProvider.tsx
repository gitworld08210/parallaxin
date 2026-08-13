import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

type Profile = {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  verified: boolean;
  verification_kind: string | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
  onboarded_at?: string | null;
  interests?: string[] | null;
  account_type?: "personal" | "organization";
  organization_id?: string | null;
};

type User = {
  id: string;
  uid: string;
  email?: string;
  phone?: string;
  user_metadata: any;
  app_metadata: any;
  aud: string;
  created_at: string;
  last_sign_in_at?: string;
};

type Ctx = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, async (fbUser) => {
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (fbUser) {
        setUser({
          id: fbUser.uid,
          uid: fbUser.uid,
          email: fbUser.email || undefined,
          phone: fbUser.phoneNumber || undefined,
          user_metadata: {
            display_name: fbUser.displayName,
            avatar_url: fbUser.photoURL,
          },
          app_metadata: {},
          aud: "authenticated",
          created_at: fbUser.metadata.creationTime || new Date().toISOString(),
          last_sign_in_at: fbUser.metadata.lastSignInTime || new Date().toISOString(),
        });
        
        profileUnsub = onSnapshot(doc(db, "profiles", fbUser.uid), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setProfile({ 
              id: snap.id, 
              ...data,
              user_id: data.user_id || snap.id 
            } as Profile);
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (err) => {
          console.error("Profile snapshot error:", err);
          setLoading(false);
        });
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.error("Sign out error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCtx.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
};
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, onSnapshot, getDoc } from "firebase/firestore";

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
  is_creator?: boolean;
  is_admin?: boolean;
  is_founder?: boolean;
  role?: string | null;
  department?: string | null;
};

type Session = {
  access_token: string;
  refresh_token: string;
  user: any;
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
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, "profiles", user.id));
      if (snap.exists()) {
        const data = snap.data();
        setProfile({ 
          id: snap.id, 
          ...data,
          user_id: data.user_id || snap.id 
        } as Profile);
      }
    } catch (err) {
      console.error("Refresh profile error:", err);
    }
  }, [user]);

  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, async (fbUser) => {
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (fbUser) {
        const token = await fbUser.getIdToken();
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
        
        setSession({
          access_token: token,
          refresh_token: "firebase-managed",
          user: fbUser
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
          if (fbUser) {
            console.log("Setting fallback profile for authenticated user:", fbUser.uid);
            setProfile({
              id: fbUser.uid,
              user_id: fbUser.uid,
              username: fbUser.email?.split('@')[0] || fbUser.uid.slice(0, 8),
              display_name: fbUser.displayName || fbUser.email?.split('@')[0] || "User",
              avatar_url: fbUser.photoURL,
              onboarded_at: new Date().toISOString(),
              verified: false,
              followers_count: 0,
              following_count: 0,
              posts_count: 0,
            } as any);
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setProfile(null);
        setSession(null);
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
    <AuthCtx.Provider value={{ user, profile, session, loading, signOut, refreshProfile }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
};
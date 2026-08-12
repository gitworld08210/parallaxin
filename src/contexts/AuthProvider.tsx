import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { supabase } from "@/integrations/supabase/client";

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
};

type SupabaseUser = {
  id: string;
  app_metadata: Record<string, any>;
  user_metadata: Record<string, any>;
  aud: string;
  confirmation_sent_at?: string;
  recovery_sent_at?: string;
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
  last_sign_in_at?: string;
  role?: string;
  updated_at?: string;
  created_at: string;
  email?: string;
  phone?: string;
};

type Ctx = {
  user: SupabaseUser | null;
  session: any | null; 
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};



const AuthCtx = createContext<Ctx | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [supabaseSession, setSupabaseSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bridgeStatus, setBridgeStatus] = useState<'idle' | 'syncing' | 'synced' | 'failed'>('idle');

  const loadProfile = async (uid: string) => {
    try {
      const docRef = doc(db, "profiles", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile({ id: docSnap.id, ...docSnap.data() } as Profile);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      setProfile(null);
    }
  };

  const syncSupabase = async (firebaseUser: any) => {
    if (!firebaseUser || bridgeStatus === 'synced') return;
    
    setBridgeStatus('syncing');
    try {
      const idToken = await firebaseUser.getIdToken(true);
      const { data: bridge, error: bridgeErr } = await supabase.functions.invoke("firebase-bridge", {
        body: { idToken }
      });

      if (bridgeErr) throw bridgeErr;
      
      if (bridge?.token_hash) {
        const { data: { session }, error: sessionErr } = await supabase.auth.verifyOtp({
          token_hash: bridge.token_hash,
          type: 'magiclink'
        });
        if (sessionErr) throw sessionErr;
        setSupabaseSession(session);
        setBridgeStatus('synced');
        console.log("Supabase bridge synced successfully");
      }
    } catch (e) {
      console.error("Supabase bridge failed:", e);
      setBridgeStatus('failed');
      // We don't throw here to avoid crashing the whole auth context
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const mappedUser: SupabaseUser = {
          id: firebaseUser.uid,
          email: firebaseUser.email || undefined,
          phone: firebaseUser.phoneNumber || undefined,
          user_metadata: {
            display_name: firebaseUser.displayName,
            avatar_url: firebaseUser.photoURL,
          },
          app_metadata: {},
          aud: "authenticated",
          created_at: firebaseUser.metadata.creationTime || new Date().toISOString(),
          last_sign_in_at: firebaseUser.metadata.lastSignInTime || new Date().toISOString(),
        };
        setUser(mappedUser);

        // Bridge to Supabase in the background
        syncSupabase(firebaseUser);
        
        const profileUnsubscribe = onSnapshot(doc(db, "profiles", firebaseUser.uid), (doc) => {
          if (doc.exists()) {
            setProfile({ id: doc.id, ...doc.data() } as Profile);
          } else {
            setProfile(null);
          }
        });
        setLoading(false);
        return () => profileUnsubscribe();
      } else {
        setUser(null);
        setSupabaseSession(null);
        setProfile(null);
        setLoading(false);
        // Clear Supabase session on logout
        await supabase.auth.signOut();
      }
    });

    return () => unsubscribe();
  }, []);


  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthCtx.Provider value={{ user, session: supabaseSession, profile, loading, refreshProfile, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
};


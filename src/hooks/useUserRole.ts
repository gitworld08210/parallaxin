import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const useUserRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      setIsModerator(false);
      setLoading(false);
      return;
    }
    
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "profiles", user.id));
        if (snap.exists() && !cancelled) {
          const data = snap.data();
          setIsAdmin(!!data.is_admin);
          setIsModerator(!!data.is_moderator || !!data.is_admin);
        }
      } catch (e) {
        console.warn("Failed to fetch user roles from Firestore", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, authLoading]);

  return { isAdmin, isModerator, loading };
};

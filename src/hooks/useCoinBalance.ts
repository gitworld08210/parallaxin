import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useCoinBalance() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setBalance(0); setLoading(false); return; }
    
    try {
      const snap = await getDoc(doc(db, "wallets", user.id));
      if (snap.exists()) {
        setBalance(snap.data().total || 0);
      }
    } catch (e) {
      console.warn("Firestore wallet fetch failed", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, "wallets", user.id), (snap) => {
      if (snap.exists()) {
        setBalance(snap.data().total || 0);
      }
    });
    return () => unsubscribe();
  }, [user?.id]);

  return { balance, loading, refresh };
}

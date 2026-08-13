import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthProvider";

export const useUserRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setIsAdmin(false); setIsModerator(false); setLoading(false); return; }
    let cancelled = false;
    (async () => { /* shimmed action */ })();
    return () => { cancelled = true; };
  }, [user?.id, authLoading]);

  return { isAdmin, isModerator, loading };
};

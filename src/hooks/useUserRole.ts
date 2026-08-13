import { useEffect, useState } from "react";
// Supabase removed
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
    (async () => {
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (cancelled) return;
      const roles = new Set((data ?? []).map((r: any) => r.role));
      setIsAdmin(roles.has("admin"));
      setIsModerator(roles.has("moderator"));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id, authLoading]);

  return { isAdmin, isModerator, loading };
};

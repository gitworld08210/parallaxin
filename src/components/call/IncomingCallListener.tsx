import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { useCall } from "@/contexts/CallProvider";

/** IncomingCallListener - Mocked since Supabase/Realtime is removed. */
export const IncomingCallListener = () => {
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user) return;
    // Realtime logic removed.
  }, [user?.id]);

  return null;
};
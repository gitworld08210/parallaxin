import { useEffect } from "react";

import { useAuth } from "@/contexts/AuthProvider";
import { useCall } from "@/contexts/CallProvider";

/** Global listener: when a `calls` row with status=ringing arrives for me, surface it. */
export const IncomingCallListener = () => {
  const { user } = useAuth();
  const { status, incoming, setIncoming } = useCall();

  useEffect(() => {
    if (!user) return;
      .channel(`incoming-calls:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "calls", filter: `callee_id=eq.${user.id}` },
        async (p: any) => {
          const row = p.new;
          if (row.status !== "ringing") return;
          // Auto-decline if already busy
          if (status !== "idle" || incoming) {
            return;
          }
          // Load caller profile
            .from("profiles")
            .select("user_id, username, display_name, avatar_url")
            .eq("user_id", row.caller_id)
            .maybeSingle();
          setIncoming({
            call_id: row.id,
            conversation_id: row.conversation_id,
            caller_id: row.caller_id,
            kind: row.kind,
            peer: {
              user_id: row.caller_id,
              username: prof?.username,
              display_name: prof?.display_name,
              avatar_url: prof?.avatar_url,
            },
          });
        },
      )
      .subscribe();
  }, [user?.id, status, incoming, setIncoming]);

  return null;
};

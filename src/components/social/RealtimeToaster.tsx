import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";

// Global subscription to surface in-app toasts for new DMs and notifications.
export const RealtimeToaster = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const lastShown = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

      const notifChannel = supabase.channel(`toast-notif:${user.id}`).
on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        async (payload) => {
          const n = payload.new as any;
          if (lastShown.current.has(n.id)) return;
          lastShown.current.add(n.id);
          let actorName = "Someone";
          if (n.actor_id) {
            const { data } = await supabase.from("profiles").select("display_name, username").eq("user_id", n.actor_id).maybeSingle();
            actorName = data?.display_name || data?.username || actorName;
          }
          const msg = n.type === "like" ? `${actorName} liked your post`
            : n.type === "comment" ? `${actorName} commented`
            : n.type === "follow" ? `${actorName} started following you`
            : `New activity`;
          toast(msg, {
            action: { label: "View", onClick: () => nav(n.post_id ? `/p/${n.post_id}` : "/notifications") },
          });
        }).
subscribe();

    // DM toasts: subscribe to all messages, filter to ones not from me in convs I'm in.
    const dmChannel = supabase.channel(`toast-dm:${user.id}`).
on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const m = payload.new as any;
          if (m.sender_id === user.id) return;
          if (lastShown.current.has(m.id)) return;
          // skip if currently viewing this conversation
          if (window.location.pathname === `/messages/${m.conversation_id}`) return;
          // verify membership (RLS would have hidden it anyway, but check defensively)
          const { data: mem } = await supabase.from("conversation_members").select("user_id").eq("conversation_id", m.conversation_id).eq("user_id", user.id).maybeSingle();
          if (!mem) return;
          lastShown.current.add(m.id);
          const { data: sender } = await supabase.from("profiles").select("display_name, username").eq("user_id", m.sender_id).maybeSingle();
          const name = sender?.display_name || sender?.username || "New message";
          toast(`${name}: ${String(m.content).slice(0, 60)}`, {
            action: { label: "Open", onClick: () => nav(`/messages/${m.conversation_id}`) },
          });
        }).
subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(dmChannel);
    };
  }, [user?.id]);

  return null;
};

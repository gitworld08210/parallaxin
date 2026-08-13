import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LogOut, UserMinus, Users, Crown } from "lucide-react";

import { useAuth } from "@/contexts/AuthProvider";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { gradientFor, initialsOf } from "@/lib/format";
import { toast } from "sonner";

type Member = {
  user_id: string; role: string;
  profile: { username: string; display_name: string; avatar_url: string | null } | null;
};

export const GroupInfoSheet = ({
  open, onOpenChange, conversationId, title,
}: { open: boolean; onOpenChange: (b: boolean) => void; conversationId: string; title: string }) => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const me = members.find((m) => m.user_id === user?.id);

  useEffect(() => {
    if (!open) return;
    // Data fetching logic removed.
    setMembers([]);
  }, [open, conversationId]);

  const remove = async (uid: string) => {
    if (!confirm("Remove this member?")) return;
    toast.info("Group management moving to Firestore...");
  };

  const leave = async () => {
    if (!confirm("Leave this group?")) return;
    onOpenChange(false); 
    nav("/messages");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto p-0"
        style={{ background: "#0a0a0a", color: "white" }}>
        <SheetHeader className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <SheetTitle className="text-white text-left flex items-center gap-2"><Users className="h-4 w-4" /> {title}</SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <p className="text-xs uppercase tracking-wider text-white/50 mb-2">{members.length} members</p>
          <div className="space-y-1">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center gap-3 py-2">
                {m.profile?.avatar_url ? (
                  <img src={m.profile.avatar_url} className="h-10 w-10 rounded-full object-cover" alt="" />
                ) : (
                  <AuraAvatar gradient={gradientFor(m.profile?.username)} size="sm" initials={initialsOf(m.profile?.display_name || m.profile?.username)} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold flex items-center gap-1 text-white">
                    {m.profile?.display_name || m.profile?.username}
                    {m.role === "admin" && <Crown className="h-3 w-3 text-yellow-400" />}
                  </p>
                  <p className="text-xs text-white/50 truncate">@{m.profile?.username}</p>
                </div>
                {me?.role === "admin" && m.user_id !== user?.id && (
                  <button onClick={() => remove(m.user_id)} className="text-red-400 p-2" aria-label="Remove">
                    <UserMinus className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={leave}
            className="mt-6 w-full py-3 rounded-xl text-sm font-semibold text-red-400 flex items-center justify-center gap-2"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}
          >
            <LogOut className="h-4 w-4" /> Leave group
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};